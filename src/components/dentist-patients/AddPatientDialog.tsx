import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2, Phone, ClipboardList, ArrowLeft } from 'lucide-react';
import { useBusinessContext } from '@/hooks/useBusinessContext';

interface AddPatientDialogProps {
  businessId: string;
  dentistId: string;
  onPatientAdded: () => void;
}

type Mode = 'select' | 'invite' | 'full';

export function AddPatientDialog({ businessId, dentistId, onPatientAdded }: AddPatientDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('select');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { businessName } = useBusinessContext();

  // Invite form state
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteName, setInviteName] = useState('');

  // Full form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    medicalHistory: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      medicalHistory: '',
    });
    setInvitePhone('');
    setInviteName('');
    setMode('select');
  };

  const handleInvite = async () => {
    if (!invitePhone.trim()) {
      toast({
        title: 'Error',
        description: 'Phone number is required',
        variant: 'destructive',
      });
      return;
    }

    // Basic phone validation - must contain digits
    const digitsOnly = invitePhone.replace(/\D/g, '');
    if (digitsOnly.length < 7) {
      toast({
        title: 'Invalid phone number',
        description: 'Please enter a valid phone number',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Check if patient already exists by phone
      const { data: existingPatient } = await supabase
        .from('secure_profiles_view')
        .select('id, first_name, last_name')
        .eq('phone', invitePhone.trim())
        .maybeSingle();

      if (existingPatient) {
        toast({
          title: 'Patient exists',
          description: `${existingPatient.first_name || 'This patient'} is already in the system.`,
        });
        setLoading(false);
        return;
      }

      // Call edge function to send invite via SMS
      const { error } = await supabase.functions.invoke('create-patient-profile', {
        body: {
          phone: invitePhone.trim(),
          first_name: inviteName.trim() || null,
          business_id: businessId,
          dentist_id: dentistId,
          send_invite: true,
        }
      });

      if (error) throw error;

      toast({
        title: 'Invitation sent',
        description: `An invitation has been sent to ${invitePhone}`,
      });

      resetForm();
      setOpen(false);
      onPatientAdded();
    } catch (error: any) {
      console.error('Error sending invite:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast({
        title: 'Error',
        description: 'First name and last name are required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Create a profile for the patient (without auth user)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          date_of_birth: formData.dateOfBirth || null,
          medical_history: formData.medicalHistory.trim() || null,
          role: 'patient',
        })
        .select('id')
        .single();

      if (profileError) throw profileError;

      // Create an initial appointment to link this patient to the dentist
      // This is a "registration" type appointment
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          patient_id: profile.id,
          dentist_id: dentistId,
          business_id: businessId,
          appointment_date: new Date().toISOString(),
          reason: 'Patient Registration',
          status: 'completed',
          urgency: 'routine',
        });

      if (appointmentError) {
        console.error('Appointment creation failed:', appointmentError);
        // Don't fail entirely if appointment fails - patient is created
      }

      toast({
        title: 'Patient Added',
        description: `${formData.firstName} ${formData.lastName} has been added successfully.`,
      });

      resetForm();
      setOpen(false);
      onPatientAdded();
    } catch (error: any) {
      console.error('Error adding patient:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add patient',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderModeSelect = () => (
    <div className="grid gap-4 py-4">
      <Card 
        className="cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
        onClick={() => setMode('invite')}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Quick Invite</CardTitle>
              <CardDescription className="text-sm">
                Send an email invitation to let the patient complete their profile
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card 
        className="cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
        onClick={() => setMode('full')}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <ClipboardList className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Full Profile</CardTitle>
              <CardDescription className="text-sm">
                Enter all patient details now
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );

  const renderInviteForm = () => (
    <div className="space-y-4 py-4">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setMode('select')} 
        className="gap-1.5 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="inviteEmail">Email Address *</Label>
          <Input
            id="inviteEmail"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="patient@email.com"
            required
          />
          <p className="text-xs text-muted-foreground">
            We'll send an invitation to create their account
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="inviteName">Name (optional)</Label>
          <Input
            id="inviteName"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder="John Doe"
          />
        </div>
      </div>

      <DialogFooter className="pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(false)}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button onClick={handleInvite} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Send Invitation
        </Button>
      </DialogFooter>
    </div>
  );

  const renderFullForm = () => (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 py-4">
        <Button 
          type="button"
          variant="ghost" 
          size="sm" 
          onClick={() => setMode('select')} 
          className="gap-1.5 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              placeholder="John"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              placeholder="Doe"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="john.doe@email.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+31 6 12345678"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => handleChange('dateOfBirth', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="medicalHistory">Medical Notes</Label>
          <Textarea
            id="medicalHistory"
            value={formData.medicalHistory}
            onChange={(e) => handleChange('medicalHistory', e.target.value)}
            placeholder="Any allergies, conditions, or relevant medical history..."
            rows={3}
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(false)}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Add Patient
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Patient
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'select' && 'Add New Patient'}
            {mode === 'invite' && 'Invite Patient by Email'}
            {mode === 'full' && 'Create Patient Profile'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'select' && 'Choose how you want to add a patient to your practice.'}
            {mode === 'invite' && `Send an invitation for ${businessName || 'your practice'}.`}
            {mode === 'full' && 'Enter the patient details to create their profile.'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'select' && renderModeSelect()}
        {mode === 'invite' && renderInviteForm()}
        {mode === 'full' && renderFullForm()}
      </DialogContent>
    </Dialog>
  );
}
