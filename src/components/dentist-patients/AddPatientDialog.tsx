import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { UserPlus, Loader2 } from 'lucide-react';

interface AddPatientDialogProps {
  businessId: string;
  dentistId: string;
  onPatientAdded: () => void;
}

export function AddPatientDialog({ businessId, dentistId, onPatientAdded }: AddPatientDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Patient
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Patient</DialogTitle>
          <DialogDescription>
            Add a new patient to your practice. They will be linked to you as their dentist.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
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
      </DialogContent>
    </Dialog>
  );
}
