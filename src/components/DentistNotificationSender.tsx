import React, { useState, useEffect } from 'react';
import { Send, User, AlertCircle, Calendar, Pill, FileText, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { NotificationService } from '../lib/notificationService';
import { User as UserType } from '../types/common';
import { supabase } from '../integrations/supabase/client';
import { logger } from '@/lib/logger';

interface Patient {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

interface DentistNotificationSenderProps {
  dentist: UserType;
  className?: string;
}

const notificationTypes = [
  {
    value: 'appointment',
    label: 'Appointment Reminder',
    icon: Calendar,
    description: 'Remind patient about upcoming appointment'
  },
  {
    value: 'prescription',
    label: 'Prescription Update',
    icon: Pill,
    description: 'Notify about new or updated prescription'
  },
  {
    value: 'treatment_plan',
    label: 'Treatment Plan',
    icon: FileText,
    description: 'Update about treatment plan changes'
  },
  {
    value: 'follow_up',
    label: 'Follow-up',
    icon: MessageSquare,
    description: 'Schedule or remind about follow-up'
  },
  {
    value: 'emergency',
    label: 'Emergency Alert',
    icon: AlertCircle,
    description: 'Urgent medical information'
  },
  {
    value: 'system',
    label: 'General Message',
    icon: MessageSquare,
    description: 'General communication'
  }
];

const notificationCategories = [
  { value: 'info', label: 'Information', color: 'bg-blue-100 text-blue-800' },
  { value: 'warning', label: 'Warning', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'success', label: 'Success', color: 'bg-green-100 text-green-800' },
  { value: 'error', label: 'Error', color: 'bg-red-100 text-red-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
];

export const DentistNotificationSender: React.FC<DentistNotificationSenderProps> = ({ 
  dentist, 
  className 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [notificationType, setNotificationType] = useState<string>('system');
  const [notificationCategory, setNotificationCategory] = useState<string>('info');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch patients for the dentist
  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      // This would typically fetch patients from appointments or patient-dentist relationships
      // For now, we'll use a mock approach - in a real app, you'd query the database
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          patient_id,
          profiles!inner(
            id,
            user_id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('dentist_id', dentist.id)
        .not('patient_id', 'is', null);

      if (error) {
        console.error('Error fetching patients:', error);
        return;
      }

      // Extract unique patients
      const uniquePatients = data?.reduce((acc: Patient[], appointment: any) => {
        const patient = appointment.profiles;
        if (!acc.find(p => p.id === patient.id)) {
          acc.push(patient);
        }
        return acc;
      }, []) || [];

      setPatients(uniquePatients);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Send notification
  const sendNotification = async () => {
    if (!selectedPatient || !title || !message) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setIsSending(true);
      
      // Find the patient's user_id
      const patient = patients.find(p => p.id === selectedPatient);
      if (!patient) {
        throw new Error('Patient not found');
      }

      await NotificationService.createNotification(
        patient.user_id,
        title,
        message,
        notificationType as any,
        notificationCategory as any,
        undefined, // action_url
        {
          sent_by: dentist.id,
          patient_id: selectedPatient,
          notification_type: notificationType,
          email: patient.email
        },
        undefined, // expires_at
        true // sendEmail - send both in-app and email notification
      );

      // Reset form
      setSelectedPatient('');
      setTitle('');
      setMessage('');
      setNotificationType('system');
      setNotificationCategory('info');
      
      alert('Notification sent successfully!');
      setIsOpen(false);
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Failed to send notification. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Load template based on notification type
  const loadTemplate = (type: string) => {
    const templates: Record<string, { title: string; message: string }> = {
      appointment: {
        title: 'Appointment Reminder',
        message: 'This is a reminder about your upcoming dental appointment. Please confirm your attendance.'
      },
      prescription: {
        title: 'Prescription Update',
        message: 'Your prescription has been updated. Please review the changes and contact us if you have any questions.'
      },
      treatment_plan: {
        title: 'Treatment Plan Update',
        message: 'Your treatment plan has been updated. Please review the changes and contact us if you have any questions.'
      },
      follow_up: {
        title: 'Follow-up Required',
        message: 'A follow-up appointment is recommended. Please contact us to schedule.'
      },
      emergency: {
        title: 'Emergency Alert',
        message: 'This is an emergency notification. Please contact us immediately.'
      },
      system: {
        title: 'Important Message',
        message: 'You have an important message from your dental care team.'
      }
    };

    const template = templates[type] || templates.system;
    setTitle(template.title);
    setMessage(template.message);
  };

  // Filter patients based on search term
  const filteredPatients = patients.filter(patient =>
    `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      fetchPatients();
    }
  }, [isOpen]);

  useEffect(() => {
    if (notificationType) {
      loadTemplate(notificationType);
    }
  }, [notificationType]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <Send className="h-4 w-4 mr-2" />
          Send Notification
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Patient Notification</DialogTitle>
          <DialogDescription>
            Send a notification to a specific patient. The notification will appear in their dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label htmlFor="patient-search">Search Patient</Label>
            <Input
              id="patient-search"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {filteredPatients.map((patient) => (
                  <Card
                    key={patient.id}
                    className={`cursor-pointer transition-colors ${
                      selectedPatient === patient.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedPatient(patient.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {patient.first_name} {patient.last_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {patient.email}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Notification Type */}
          <div className="space-y-2">
            <Label>Notification Type</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {notificationTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Card
                    key={type.value}
                    className={`cursor-pointer transition-colors ${
                      notificationType === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setNotificationType(type.value)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-4 w-4 text-gray-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {type.label}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Notification Category */}
          <div className="space-y-2">
            <Label>Priority Level</Label>
            <div className="flex flex-wrap gap-2">
              {notificationCategories.map((category) => (
                <Badge
                  key={category.value}
                  variant={notificationCategory === category.value ? 'default' : 'outline'}
                  className={`cursor-pointer ${category.color}`}
                  onClick={() => setNotificationCategory(category.value)}
                >
                  {category.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Notification Content */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notification-title">Title</Label>
              <Input
                id="notification-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification-message">Message</Label>
              <Textarea
                id="notification-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Notification message..."
                rows={4}
              />
            </div>
          </div>

          {/* Send Button */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              onClick={sendNotification}
              disabled={!selectedPatient || !title || !message || isSending}
            >
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Notification
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};