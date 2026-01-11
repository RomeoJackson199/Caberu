import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Mail, 
  Phone,
  AlertCircle,
  Save,
  X
} from 'lucide-react';
import { clinicTimeToUtc, utcToClinicTime, getClinicTimeSlots } from '@/lib/timezone';
import { emitAnalyticsEvent } from '@/lib/analyticsEvents';
import { Appointment } from './AppointmentManager';
import { logger } from '@/lib/logger';
import { createAppointmentWithNotification } from '@/hooks/useAppointments';

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  dentistId: string;
  onSave: () => void;
  onCancel: () => void;
}

export const AppointmentDialog: React.FC<AppointmentDialogProps> = ({
  open,
  onOpenChange,
  appointment,
  dentistId,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    patient_id: '',
    appointment_date: new Date(),
    selectedTime: '',
    duration_minutes: 60,
    reason: '',
    urgency: 'medium' as 'low' | 'medium' | 'high' | 'emergency',
    notes: '',
    consultation_notes: '',
  });
  const [patients, setPatients] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchPatients();
      if (appointment) {
        // Edit mode
        setIsEdit(true);
        const clinicDate = utcToClinicTime(appointment.appointment_date);
        setFormData({
          patient_id: appointment.patient_id,
          appointment_date: clinicDate,
          selectedTime: clinicDate.getHours().toString().padStart(2, '0') + ':' + clinicDate.getMinutes().toString().padStart(2, '0'),
          duration_minutes: appointment.duration_minutes,
          reason: appointment.reason || '',
          urgency: appointment.urgency,
          notes: appointment.notes || '',
          consultation_notes: appointment.consultation_notes || '',
        });
      } else {
        // Create mode
        setIsEdit(false);
        setFormData({
          patient_id: '',
          appointment_date: new Date(),
          selectedTime: '',
          duration_minutes: 60,
          reason: '',
          urgency: 'medium',
          notes: '',
          consultation_notes: '',
        });
      }
    }
  }, [open, appointment]);

  useEffect(() => {
    if (formData.appointment_date) {
      const slots = getClinicTimeSlots(formData.appointment_date);
      setAvailableSlots(slots);
    }
  }, [formData.appointment_date]);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('secure_profiles_view')
        .select('id, first_name, last_name, email, phone')
        .eq('role', 'patient')
        .order('first_name');

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast({
        title: 'Error',
        description: 'Failed to load patients',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    if (!formData.patient_id || !formData.selectedTime || !formData.reason.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      // Convert clinic time to UTC for storage
      const [hours, minutes] = formData.selectedTime.split(':').map(Number);
      const appointmentDateTime = new Date(formData.appointment_date);
      appointmentDateTime.setHours(hours, minutes, 0, 0);
      const utcDateTime = clinicTimeToUtc(appointmentDateTime);

      const appointmentData = {
        patient_id: formData.patient_id,
        dentist_id: dentistId,
        appointment_date: utcDateTime.toISOString(),
        duration_minutes: formData.duration_minutes,
        reason: formData.reason,
        urgency: formData.urgency,
        notes: formData.notes,
        consultation_notes: formData.consultation_notes,
        status: 'confirmed' as const,
        updated_at: new Date().toISOString(),
      };

      if (isEdit && appointment) {
        const { error } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', appointment.id);

        if (error) throw error;
        
        await emitAnalyticsEvent('appointment_updated', dentistId, {
          appointmentId: appointment.id,
          changes: Object.keys(appointmentData),
        });
      } else {
        // Use the email-enabled appointment creation function directly
        await createAppointmentWithNotification({
          patient_id: appointmentData.patient_id,
          dentist_id: appointmentData.dentist_id,
          appointment_date: appointmentData.appointment_date,
          reason: appointmentData.reason,
          notes: appointmentData.notes,
          status: appointmentData.status,
          urgency: formData.urgency === 'emergency' ? 'high' : formData.urgency as 'low' | 'medium' | 'high',
          duration_minutes: appointmentData.duration_minutes
        });
        
        await emitAnalyticsEvent('appointment_created', dentistId, {
          urgency: formData.urgency,
          duration: formData.duration_minutes,
        });
      }

      toast({
        title: 'Success',
        description: isEdit 
          ? 'Appointment updated successfully' 
          : 'Appointment created! Confirmation email sent to patient.',
      });
      
      onSave();
    } catch (error) {
      console.error('Error saving appointment:', error);
      toast({
        title: 'Error',
        description: `Failed to ${isEdit ? 'update' : 'create'} appointment`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedPatient = patients.find(p => p.id === formData.patient_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            {isEdit ? 'Edit Appointment' : 'New Appointment'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div className="space-y-6">
            {/* Patient Selection */}
            <div className="space-y-2">
              <Label htmlFor="patient">Patient *</Label>
              <Select
                value={formData.patient_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, patient_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name} ({patient.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label>Date *</Label>
              <Calendar
                mode="single"
                selected={formData.appointment_date}
                onSelect={(date) => {
                  if (date) {
                    setFormData(prev => ({ ...prev, appointment_date: date, selectedTime: '' }));
                  }
                }}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </div>

            {/* Time Selection */}
            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <Select
                value={formData.selectedTime}
                onValueChange={(value) => setFormData(prev => ({ ...prev, selectedTime: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {availableSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right Column - Details & Patient Info */}
          <div className="space-y-6">
            {/* Patient Info Card */}
            {selectedPatient && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Patient Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-3 h-3 text-muted-foreground" />
                    <span className="font-medium">
                      {selectedPatient?.first_name} {selectedPatient?.last_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-3 h-3 text-muted-foreground" />
                    <span>{selectedPatient?.email}</span>
                  </div>
                  {selectedPatient?.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      <span>{selectedPatient.phone}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Select
                value={formData.duration_minutes.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Urgency */}
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency</Label>
              <Select
                value={formData.urgency}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, urgency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Low Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      Medium Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      High Priority
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Visit *</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Routine checkup, tooth pain, cleaning..."
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                className="min-h-20"
              />
            </div>
          </div>
        </div>

        {/* Full width fields */}
        <div className="space-y-4">
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes or instructions..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="min-h-16"
            />
          </div>

          {/* Consultation Notes (only show in edit mode) */}
          {isEdit && (
            <div className="space-y-2">
              <Label htmlFor="consultation-notes">Consultation Notes</Label>
              <Textarea
                id="consultation-notes"
                placeholder="Notes from the consultation..."
                value={formData.consultation_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, consultation_notes: e.target.value }))}
                className="min-h-20"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onCancel();
              onOpenChange(false);
            }}
            disabled={loading}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !formData.patient_id || !formData.selectedTime || !formData.reason.trim()}
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : (isEdit ? 'Update' : 'Create')} Appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};