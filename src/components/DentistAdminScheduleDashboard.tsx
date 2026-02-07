import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useToast } from '@/hooks/use-toast';
import { Calendar, ChevronLeft, ChevronRight, User, Clock, RefreshCw, Filter } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { PractitionerPicker, TeamQuickStats } from '@/components/admin';

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
  const [selectedPractitioner, setSelectedPractitioner] = useState<string | 'all'>('all');
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

      // Transform profiles from array to single object (Supabase join quirk)
      const formattedDentists = (dentistsData || []).map((d: any) => ({
        ...d,
        profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles
      }));

      setDentists(formattedDentists);

      // Fetch appointments for the week
      const weekStart = format(currentWeekStart, 'yyyy-MM-dd');
      const weekEnd = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');

      const dentistIds = (dentistsData || []).map(d => d.id);

      if (dentistIds.length > 0) {
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments_decrypted')
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

  // Filter dentists based on selection
  const filteredDentists = useMemo(() => {
    if (selectedPractitioner === 'all') return dentists;
    return dentists.filter(d => d.id === selectedPractitioner);
  }, [dentists, selectedPractitioner]);

  // Get appointment counts per day across all dentists
  const getDayAppointmentCount = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return appointments.filter(apt => apt.scheduled_date === dayStr).length;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800';
      default:
        return 'bg-muted text-muted-foreground border-border';
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
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Weekly Schedule Overview</span>
                </CardTitle>
                <CardDescription>
                  View all practitioners' appointments for the week
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <PractitionerPicker
                  selectedId={selectedPractitioner}
                  onSelect={setSelectedPractitioner}
                  showAll={true}
                  label="Practitioner"
                />
                <div className="flex items-center border rounded-lg">
                  <Button variant="ghost" size="sm" onClick={goToPreviousWeek}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={goToToday}>
                    Today
                  </Button>
                  <Button variant="ghost" size="sm" onClick={goToNextWeek}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" size="icon" onClick={fetchData}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <TeamQuickStats />
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[1200px] bg-card rounded-lg border">
          {/* Day Headers */}
          <div className="grid grid-cols-8 border-b bg-muted/50">
            <div className="p-3 font-semibold border-r">Practitioner</div>
            {weekDays.map((day, idx) => {
              const count = getDayAppointmentCount(day);
              return (
                <div
                  key={idx}
                  className={`p-3 text-center border-r last:border-r-0 ${
                    isSameDay(day, new Date()) ? 'bg-primary/10 font-semibold' : ''
                  }`}
                >
                  <div className="text-sm font-medium">{format(day, 'EEE')}</div>
                  <div className="text-xs text-muted-foreground">{format(day, 'MMM d')}</div>
                  {count > 0 && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {count} apt{count !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          {/* Dentist Rows */}
          {filteredDentists.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
              <p>No active practitioners found</p>
            </div>
          ) : (
            filteredDentists.map((dentist) => (
              <div key={dentist.id} className="grid grid-cols-8 border-b last:border-b-0">
                {/* Dentist Name */}
                <div className="p-3 border-r flex items-center bg-card">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
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
                        isToday ? 'bg-primary/5' : 'bg-card'
                      }`}
                    >
                      <div className="space-y-1">
                        {dayAppointments.length === 0 ? (
                          <div className="text-xs text-muted-foreground/50 text-center py-2">—</div>
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
            <div className="text-2xl font-bold">{filteredDentists.length}</div>
            <div className="text-sm text-muted-foreground">
              {selectedPractitioner === 'all' ? 'Active Practitioners' : 'Selected'}
            </div>
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
            <div className="text-2xl font-bold text-green-600">
              {appointments.filter(a => a.status === 'confirmed').length}
            </div>
            <div className="text-sm text-muted-foreground">Confirmed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {appointments.filter(a => a.status === 'pending').length}
            </div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
