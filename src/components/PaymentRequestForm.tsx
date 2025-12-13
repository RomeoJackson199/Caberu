import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreditCard } from 'lucide-react';
import { logger } from '@/lib/logger';

interface PaymentRequestFormProps {
  dentistId: string;
  onClose: () => void;
}

export const PaymentRequestForm: React.FC<PaymentRequestFormProps> = ({
  dentistId,
  onClose
}) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch patients for this dentist
  useEffect(() => {
    fetchPatients();
  }, [dentistId]);

  const fetchPatients = async () => {
    try {
      // First get patient IDs from appointments for this dentist
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('dentist_id', dentistId);

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
        throw appointmentsError;
      }

      // Get unique patient IDs
      const patientIds = [...new Set(appointmentsData?.map(a => a.patient_id) || [])];

      if (patientIds.length === 0) {
        setPatients([]);
        return;
      }

      // Fetch patient profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', patientIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      setPatients(profilesData || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast({
        title: "Error",
        description: "Failed to load patients",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !selectedPatient) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-request', {
        body: {
          patient_id: selectedPatient.id,
          dentist_id: dentistId,
          amount: Math.round(parseFloat(amount) * 100), // Convert to cents
          description,
          patient_email: selectedPatient.email,
          patient_name: `${selectedPatient.first_name} ${selectedPatient.last_name}`
        }
      });

      if (error) throw error;

      // Get the patient's user_id from profiles table
      const { data: patientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', selectedPatient.id)
        .single();

      if (!profileError && patientProfile) {
        // Create notification for the patient
        await supabase
          .from('notifications')
          .insert({
            user_id: patientProfile.user_id,
            patient_id: selectedPatient.id,
            dentist_id: dentistId,
            type: 'payment',
            title: 'Payment Request',
            message: `You have a payment request for €${amount} - ${description}`,
            priority: 'high',
            action_url: data.payment_url || '/dashboard?tab=payments',
            action_label: 'Pay Now',
            metadata: {
              payment_url: data.payment_url,
              amount: amount,
              description: description
            }
          });
      }

      toast({
        title: "Payment request sent",
        description: `Payment request for €${amount} has been sent to ${selectedPatient.first_name} ${selectedPatient.last_name}. They will receive a notification to pay.`,
      });

      // DO NOT open payment link for dentist - only patient should pay

      onClose();
    } catch (error) {
      console.error('Error creating payment request:', error);
      toast({
        title: "Error",
        description: "Failed to create payment request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Request
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Send payment request to patient
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="patient">Select Patient</Label>
            <select
              id="patient"
              className="w-full p-2 border rounded-md"
              value={selectedPatient?.id || ''}
              onChange={(e) => {
                const patient = patients.find(p => p.id === e.target.value);
                setSelectedPatient(patient);
              }}
              required
            >
              <option value="">Choose a patient...</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.first_name} {patient.last_name} ({patient.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="amount">Amount (€)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the treatment or service..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !amount || !description || !selectedPatient}
              className="flex-1"
            >
              {loading ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};