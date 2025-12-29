/**
 * InvitePatientDialog Component
 * Allows dentists to invite patients by email
 * 
 * Flow:
 * 1. Dentist enters patient email
 * 2. Invitation email is sent
 * 3. Patient receives email with signup link
 * 4. After signup, patient is linked to the business
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  UserPlus, 
  Mail, 
  Loader2, 
  Check, 
  Clock, 
  AlertCircle,
  Send,
} from 'lucide-react';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { cn } from '@/lib/utils';

interface InvitePatientDialogProps {
  trigger?: React.ReactNode;
  onInviteSent?: (email: string) => void;
}

interface PendingInvitation {
  id: string;
  email: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
}

export function InvitePatientDialog({ trigger, onInviteSent }: InvitePatientDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const { businessId } = useBusinessContext();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleSendInvitation = async () => {
    if (!validateEmail(email)) return;
    if (!businessId) {
      toast.error('No business context');
      return;
    }

    setLoading(true);

    try {
      // Check if patient already exists with this email
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (existingProfile) {
        // Patient already exists - check if they're already linked to this business
        const { data: existingAppointment } = await supabase
          .from('appointments')
          .select('id')
          .eq('patient_id', existingProfile.id)
          .eq('business_id', businessId)
          .limit(1);

        if (existingAppointment && existingAppointment.length > 0) {
          toast.info('Patient already exists', {
            description: `${existingProfile.first_name} ${existingProfile.last_name} is already a patient at your clinic.`,
          });
          setOpen(false);
          setEmail('');
          return;
        }

        // Patient exists but not linked - they can book an appointment
        toast.info('Patient exists', {
          description: 'This patient already has an account. They can book an appointment with your clinic.',
        });
        setOpen(false);
        setEmail('');
        return;
      }

      // Get business name for email
      const { data: business } = await supabase
        .from('businesses')
        .select('name')
        .eq('id', businessId)
        .single();

      // Send invitation email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-email-notification', {
        body: {
          to: email.toLowerCase(),
          subject: `Invitation to join ${business?.name || 'our clinic'}`,
          message: `You've been invited to create a patient account with ${business?.name || 'our clinic'}. Create your account to easily book appointments and manage your dental care.\n\nClick the link below to get started.`,
          messageType: 'invitation',
          businessName: business?.name,
          signupLink: `${window.location.origin}/signup?business=${businessId}&email=${encodeURIComponent(email.toLowerCase())}`,
        },
      });

      if (emailError) {
        throw emailError;
      }

      toast.success('Invitation sent', {
        description: `An invitation email has been sent to ${email}`,
      });

      onInviteSent?.(email);
      setOpen(false);
      setEmail('');
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation', {
        description: 'Please try again later',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invite Patient
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Invite Patient
          </DialogTitle>
          <DialogDescription>
            Send an email invitation for a patient to create an account and connect with your clinic.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Patient Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="patient@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) validateEmail(e.target.value);
                }}
                className={cn(
                  'pl-10',
                  emailError && 'border-destructive focus-visible:ring-destructive'
                )}
                disabled={loading}
              />
            </div>
            {emailError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {emailError}
              </p>
            )}
          </div>

          {/* Info Card */}
          <Card className="bg-muted/50 border-muted">
            <CardContent className="p-4 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">What happens next?</p>
              <ul className="space-y-1.5">
                <li className="flex items-start gap-2">
                  <Send className="h-4 w-4 mt-0.5 text-primary" />
                  <span>An invitation email is sent to the patient</span>
                </li>
                <li className="flex items-start gap-2">
                  <UserPlus className="h-4 w-4 mt-0.5 text-primary" />
                  <span>Patient creates their account</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 text-primary" />
                  <span>They can then book appointments with your clinic</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSendInvitation} disabled={loading || !email.trim()}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Invitation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Invitation Status Badge
 */
export function InvitationStatusBadge({ status }: { status: 'pending' | 'accepted' | 'expired' }) {
  const config = {
    pending: {
      label: 'Pending',
      icon: Clock,
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    accepted: {
      label: 'Accepted',
      icon: Check,
      className: 'bg-green-50 text-green-700 border-green-200',
    },
    expired: {
      label: 'Expired',
      icon: AlertCircle,
      className: 'bg-gray-50 text-gray-600 border-gray-200',
    },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <Badge variant="outline" className={cn('gap-1', className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
