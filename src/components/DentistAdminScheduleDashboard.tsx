import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useToast } from '@/hooks/use-toast';
import { Calendar, ChevronLeft, ChevronRight, User, Clock, RefreshCw } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface Dentist {
  id: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface Appointment {
  id: string;
  dentist_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  patient_name: string;
  service_type: string;
}

export const DentistAdminScheduleDashboard = () => {
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const { businessId } = useBusinessContext();
  const { toast } = useToast();

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  useEffect(() => {
    if (businessId) {
      fetchData();
    }
  }, [businessId, currentWeekStart]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch dentists for this business
      const { data: businessMembers, error: membersError } = await supabase
        .from('business_members')
        .select('profile_id')
        .eq('business_id', businessId)
        .in('role', ['dentist', 'admin', 'owner']);

      if (membersError) throw membersError;

      if (!businessMembers || businessMembers.length === 0) {
        setDentists([]);
        setAppointments([]);
        return;
      }

      const profileIds = businessMembers.map(m => m.profile_id);

      const { data: dentistsData, error: dentistsError } = await supabase
        .from('dentists')
        .select(`
          id,
          profiles (
            first_name,
            last_name
          )
        `)
        .in('profile_id', profileIds)
        .eq('is_active', true);

      if (dentistsError) throw dentistsError;

      setDentists(dentistsData || []);

      // Fetch appointments for the week
      const weekStart = format(currentWeekStart, 'yyyy-MM-dd');
      const weekEnd = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');

      const dentistIds = (dentistsData || []).map(d => d.id);

      if (dentistIds.length > 0) {
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            id,
            dentist_id,
            scheduled_date,
            scheduled_time,
            status,
            patient_name,
            service_type
          `)
          .eq('business_id', businessId)
          .in('dentist_id', dentistIds)
          .gte('scheduled_date', weekStart)
          .lte('scheduled_date', weekEnd)
          .order('scheduled_time', { ascending: true });

        if (appointmentsError) throw appointmentsError;

        setAppointments(appointmentsData || []);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load schedule data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getAppointmentsForDentistAndDay = (dentistId: string, day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return appointments.filter(
      apt => apt.dentist_id === dentistId && apt.scheduled_date === dayStr
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, -7));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Weekly Schedule Overview</span>
              </CardTitle>
              <CardDescription>
                View all dentists' appointments for the week
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={fetchData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[1200px] bg-white rounded-lg border">
          {/* Day Headers */}
          <div className="grid grid-cols-8 border-b bg-gray-50">
            <div className="p-3 font-semibold border-r">Dentist</div>
            {weekDays.map((day, idx) => (
              <div
                key={idx}
                className={`p-3 text-center border-r last:border-r-0 ${
                  isSameDay(day, new Date()) ? 'bg-blue-50 font-semibold' : ''
                }`}
              >
                <div className="text-sm font-medium">{format(day, 'EEE')}</div>
                <div className="text-xs text-muted-foreground">{format(day, 'MMM d')}</div>
              </div>
            ))}
          </div>

          {/* Dentist Rows */}
          {dentists.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No active dentists found</p>
            </div>
          ) : (
            dentists.map((dentist) => (
              <div key={dentist.id} className="grid grid-cols-8 border-b last:border-b-0">
                {/* Dentist Name */}
                <div className="p-3 border-r flex items-center">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-dental-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-dental-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        Dr {dentist.profiles.first_name} {dentist.profiles.last_name}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Days */}
                {weekDays.map((day, idx) => {
                  const dayAppointments = getAppointmentsForDentistAndDay(dentist.id, day);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={idx}
                      className={`p-2 border-r last:border-r-0 min-h-[100px] ${
                        isToday ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <div className="space-y-1">
                        {dayAppointments.length === 0 ? (
                          <div className="text-xs text-gray-400 text-center py-2">No appointments</div>
                        ) : (
                          dayAppointments.map((apt) => (
                            <div
                              key={apt.id}
                              className={`text-xs p-2 rounded border ${getStatusColor(apt.status)}`}
                            >
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span className="font-medium">{apt.scheduled_time}</span>
                              </div>
                              <div className="truncate mt-1">{apt.patient_name}</div>
                              {apt.service_type && (
                                <div className="text-xs opacity-75 truncate">{apt.service_type}</div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{dentists.length}</div>
            <div className="text-sm text-muted-foreground">Active Dentists</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{appointments.length}</div>
            <div className="text-sm text-muted-foreground">Total Appointments</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {appointments.filter(a => a.status === 'confirmed').length}
            </div>
            <div className="text-sm text-muted-foreground">Confirmed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {appointments.filter(a => a.status === 'pending').length}
            </div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
