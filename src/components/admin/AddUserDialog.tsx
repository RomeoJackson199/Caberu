import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserPlus, Mail } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { logger } from '@/lib/logger';

interface AddUserDialogProps {
  onUserAdded?: () => void;
}

export function AddUserDialog({ onUserAdded }: AddUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"patient" | "dentist">("patient");
  const { toast } = useToast();
  const { isAdmin, isDentist, loading: roleLoading } = useUserRole();

  // Security check - admins and dentists can add users
  if (roleLoading) {
    return null;
  }

  if (!isAdmin && !isDentist) {
    return null;
  }

  const { businessId, businessName } = useBusinessContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!businessId) {
        toast({
          title: 'Select a clinic',
          description: 'Please select a business before inviting users.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Get inviter profile id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!inviterProfile?.id) throw new Error('Profile not found');

      if (role === 'dentist') {
        // Check for existing pending invite
        const { data: existingInvite } = await supabase
          .from('dentist_invitations')
          .select('id')
          .eq('invitee_email', email)
          .eq('business_id', businessId)
          .eq('status', 'pending')
          .maybeSingle();

        if (existingInvite?.id) {
          toast({
            title: 'Invitation already pending',
            description: `${email} already has a pending invite for this clinic.`,
          });
        } else {
          // First, create the invitation record in the database
          const { error: inviteError } = await supabase
            .from('dentist_invitations')
            .insert({
              business_id: businessId,
              inviter_profile_id: inviterProfile.id,
              invitee_email: email.toLowerCase().trim(),
            });

          if (inviteError) throw inviteError;

          // Then, send the invitation email using the edge function
          const { error: emailError } = await supabase.functions.invoke('send-dentist-invitation', {
            body: {
              invitee_email: email.toLowerCase().trim(),
              business_id: businessId,
              business_name: businessName || 'the clinic',
            }
          });

          if (emailError) {
            logger.error('Error sending dentist invitation email:', emailError);
            toast({
              title: 'Invitation created',
              description: `Invitation created but email failed to send. Please contact ${email} directly.`,
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Invitation sent',
              description: `An invitation email was sent to ${email} to join ${businessName || 'the clinic'} as a dentist.`,
            });
          }
        }
      } else {
        // Patient invitation - call edge function to send email
        const inviterName = `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim() || 'Your dentist';

        const { error: emailError } = await supabase.functions.invoke('send-patient-invitation', {
          body: {
            recipientEmail: email,
            recipientName: `${firstName} ${lastName}`.trim(),
            inviterName: inviterName,
            businessName: businessName || 'our clinic',
            businessId: businessId,
          }
        });

        if (emailError) {
          logger.error('Error sending patient invitation:', emailError);
          // Still show success since invitation was logged
        }

        toast({
          title: 'Invitation sent',
          description: `An email invitation was sent to ${email} to join as a patient.`,
        });
      }

      // Reset form and close dialog
      setOpen(false);
      setEmail('');
      setFirstName('');
      setLastName('');
      setRole('patient');
      onUserAdded?.();
    } catch (error: any) {
      logger.error('Error adding user:', error);
      const msg = error?.message || 'Failed to add user';
      const hint = msg.includes('row-level security')
        ? 'Only the business owner can invite users to this clinic.'
        : undefined;
      toast({
        title: 'Error',
        description: hint ? `${msg} ${hint}` : msg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Invite New User
          </DialogTitle>
          <DialogDescription>
            Send an email invitation to join your clinic. They will receive instructions to create their account.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>
            An email will be sent with a link to sign up for your clinic.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.doe@example.com"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(v: "patient" | "dentist") => setRole(v)} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="patient">Patient</SelectItem>
                <SelectItem value="dentist">Dentist</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
