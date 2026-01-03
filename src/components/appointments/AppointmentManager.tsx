import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Calendar as CalendarIcon, Clock, User as UserIcon, Search, Filter, MoreHorizontal, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { AppointmentList } from './AppointmentList';
import { AppointmentStats } from './AppointmentStats';
import { BulkActions } from './BulkActions';
import { AppointmentDialog } from './AppointmentDialog';
import { DentistAppointmentDetail } from './DentistAppointmentDetail';
import { formatClinicTime } from '@/lib/timezone';
import { emitAnalyticsEvent } from '@/lib/analyticsEvents';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { useLanguage } from '@/hooks/useLanguage';
import { withErrorBoundary } from '@/components/ErrorBoundary';

export interface Appointment {
  id: string;
  patient_id: string;
  dentist_id: string;
  appointment_date: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  reason?: string;
  patient_name?: string;
  notes?: string;
  consultation_notes?: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
}

export interface AppointmentManagerProps {
  dentistId: string;
  user: User;
}

const AppointmentManagerComponent: React.FC<AppointmentManagerProps> = ({ dentistId, user }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'today' | 'completed' | 'cancelled'>('upcoming');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          patient_id,
          dentist_id,
          appointment_date,
          duration_minutes,
          status,
          urgency,
          reason,
          patient_name,
          notes,
          consultation_notes,
          profiles:patient_id (
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('dentist_id', dentistId)
        .order('appointment_date', { ascending: true });

      if (error) throw error;

      // Transform profiles from array to single object
      const transformedData = (data || []).map(apt => ({
        ...apt,
        profiles: Array.isArray(apt.profiles) ? apt.profiles[0] : apt.profiles
      })) as Appointment[];

      setAppointments(transformedData);
      await emitAnalyticsEvent('appointments_fetched', dentistId, { count: data?.length || 0 });
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: t.error || 'Error',
        description: t.failedToLoadAppointments || 'Failed to load appointments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [dentistId, toast]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Filter appointments based on active tab and filters
  useEffect(() => {
    let filtered = [...appointments];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Filter by tab
    switch (activeTab) {
      case 'upcoming':
        filtered = filtered.filter(apt =>
          new Date(apt.appointment_date) >= todayStart &&
          apt.status !== 'cancelled' &&
          apt.status !== 'completed'
        );
        break;
      case 'today':
        filtered = filtered.filter(apt => {
          const aptDate = new Date(apt.appointment_date);
          return aptDate >= todayStart && aptDate < todayEnd && apt.status !== 'cancelled';
        });
        break;
      case 'completed':
        filtered = filtered.filter(apt => apt.status === 'completed');
        break;
      case 'cancelled':
        filtered = filtered.filter(apt => apt.status === 'cancelled');
        break;
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(apt =>
        (apt.patient_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (apt.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (apt.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (apt.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (apt.reason?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const filterDate = new Date(dateFilter);
      const nextDay = new Date(filterDate.getTime() + 24 * 60 * 60 * 1000);
      filtered = filtered.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return aptDate >= filterDate && aptDate < nextDay;
      });
    }

    setFilteredAppointments(filtered);
  }, [appointments, activeTab, searchTerm, statusFilter, dateFilter]);

  const handleAppointmentStatusChange = async (appointmentId: string, newStatus: Appointment['status'], reason?: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'completed') {
        updateData.treatment_completed_at = new Date().toISOString();
      }

      if (reason && (newStatus === 'cancelled')) {
        updateData.notes = reason;
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments(prev =>
        prev.map(apt =>
          apt.id === appointmentId
            ? { ...apt, status: newStatus }
            : apt
        )
      );

      await emitAnalyticsEvent('appointment_status_changed', dentistId, {
        appointmentId,
        oldStatus: appointments.find(apt => apt.id === appointmentId)?.status,
        newStatus,
        reason
      });

      toast({
        title: t.success || 'Success',
        description: `Appointment ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: t.error || 'Error',
        description: t.failedToUpdateAppointment || 'Failed to update appointment',
        variant: 'destructive',
      });
    }
  };

  const handleBulkAction = async (action: 'confirm' | 'cancel' | 'complete', reason?: string) => {
    if (selectedAppointments.length === 0) {
      toast({
        title: t.noSelection || 'No Selection',
        description: t.pleaseSelectAppointmentsFirst || 'Please select appointments first',
        variant: 'destructive',
      });
      return;
    }

    try {
      const statusMap = {
        confirm: 'confirmed' as const,
        cancel: 'cancelled' as const,
        complete: 'completed' as const,
      };

      const updateData: any = {
        status: statusMap[action],
        updated_at: new Date().toISOString()
      };

      if (action === 'complete') {
        updateData.treatment_completed_at = new Date().toISOString();
      }

      if (reason && action === 'cancel') {
        updateData.notes = reason;
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .in('id', selectedAppointments);

      if (error) throw error;

      setAppointments(prev =>
        prev.map(apt =>
          selectedAppointments.includes(apt.id)
            ? { ...apt, status: statusMap[action] }
            : apt
        )
      );

      setSelectedAppointments([]);

      await emitAnalyticsEvent('bulk_appointment_action', dentistId, {
        action,
        count: selectedAppointments.length,
        appointmentIds: selectedAppointments
      });

      toast({
        title: t.success || 'Success',
        description: `${selectedAppointments.length} ${t.appointmentsWord || 'appointments'} ${statusMap[action]}`,
      });
    } catch (error) {
      console.error('Error in bulk action:', error);
      toast({
        title: t.error || 'Error',
        description: t.failedToUpdateAppointments || 'Failed to update appointments',
        variant: 'destructive',
      });
    }
  };

  const getTabCounts = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    return {
      upcoming: appointments.filter(apt =>
        new Date(apt.appointment_date) >= todayStart &&
        apt.status !== 'cancelled' &&
        apt.status !== 'completed'
      ).length,
      today: appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return aptDate >= todayStart && aptDate < todayEnd && apt.status !== 'cancelled';
      }).length,
      completed: appointments.filter(apt => apt.status === 'completed').length,
      cancelled: appointments.filter(apt => apt.status === 'cancelled').length,
    };
  };

  const tabCounts = getTabCounts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.appointments || 'Appointments'}</h1>
          <p className="text-muted-foreground">{t.manageYourPatientAppointments || 'Manage your patient appointments'}</p>
        </div>
        <Button
          onClick={() => setShowAppointmentDialog(true)}
          className="w-full sm:w-auto"
        >
          <CalendarIcon className="w-4 h-4 mr-2" />
          {t.newAppointment || 'New Appointment'}
        </Button>
      </div>

      {/* Statistics */}
      <AppointmentStats
        appointments={appointments}
        dentistId={dentistId}
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.filtersAndSearch || 'Filters & Search'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={t.searchPatients || "Search patients..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t.allStatuses || "All Statuses"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allStatuses || 'All Statuses'}</SelectItem>
                <SelectItem value="pending">{t.pending || 'Pending'}</SelectItem>
                <SelectItem value="confirmed">{t.confirmed || 'Confirmed'}</SelectItem>
                <SelectItem value="completed">{t.completed || 'Completed'}</SelectItem>
                <SelectItem value="cancelled">{t.cancelled || 'Cancelled'}</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDateFilter('all');
              }}
            >
              {t.clearFilters || 'Clear Filters'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedAppointments.length > 0 && (
        <BulkActions
          selectedCount={selectedAppointments.length}
          onBulkAction={handleBulkAction}
          onClearSelection={() => setSelectedAppointments([])}
        />
      )}

      {/* Appointments Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upcoming" className="relative">
            {t.upcoming || 'Upcoming'}
            {tabCounts.upcoming > 0 && (
              <Badge variant="secondary" className="ml-2">
                {tabCounts.upcoming}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="today" className="relative">
            {t.today || 'Today'}
            {tabCounts.today > 0 && (
              <Badge variant="secondary" className="ml-2">
                {tabCounts.today}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            {t.completed || 'Completed'}
            {tabCounts.completed > 0 && (
              <Badge variant="secondary" className="ml-2">
                {tabCounts.completed}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            {t.cancelled || 'Cancelled'}
            {tabCounts.cancelled > 0 && (
              <Badge variant="secondary" className="ml-2">
                {tabCounts.cancelled}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <AppointmentList
            appointments={filteredAppointments}
            loading={loading}
            selectedAppointments={selectedAppointments}
            onSelectAppointment={(id) => {
              setSelectedAppointments(prev =>
                prev.includes(id)
                  ? prev.filter(aptId => aptId !== id)
                  : [...prev, id]
              );
            }}
            onSelectAll={(selected) => {
              if (selected) {
                setSelectedAppointments(filteredAppointments.map(apt => apt.id));
              } else {
                setSelectedAppointments([]);
              }
            }}
            onStatusChange={handleAppointmentStatusChange}
            onViewDetails={(appointment) => {
              setSelectedAppointment(appointment);
              setShowDetailSheet(true);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Appointment Dialog - for creating new appointments */}
      <AppointmentDialog
        open={showAppointmentDialog}
        onOpenChange={setShowAppointmentDialog}
        appointment={null}
        dentistId={dentistId}
        onSave={() => {
          fetchAppointments();
          setShowAppointmentDialog(false);
        }}
        onCancel={() => {
          setShowAppointmentDialog(false);
        }}
      />

      {/* Appointment Detail Sheet */}
      <Sheet open={showDetailSheet} onOpenChange={setShowDetailSheet}>
        <SheetContent className="w-full sm:max-w-md p-0 overflow-y-auto" side="right">
          {selectedAppointment && (
            <DentistAppointmentDetail
              appointment={selectedAppointment}
              onClose={() => {
                setShowDetailSheet(false);
                setSelectedAppointment(null);
              }}
              onStatusChange={(id, status) => {
                handleAppointmentStatusChange(id, status as Appointment['status']);
                if (status === 'cancelled' || status === 'completed') {
                  setShowDetailSheet(false);
                  setSelectedAppointment(null);
                }
              }}
              onOptimisticUpdate={(appointmentId, updates) => {
                setSelectedAppointment((prev: any) => prev?.id === appointmentId ? { ...prev, ...updates } : prev);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

// Export with error boundary for better stability
export const AppointmentManager = withErrorBoundary(AppointmentManagerComponent);