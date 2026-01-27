import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, User, MapPin, Users, Eye } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { logger } from '@/lib/logger';
import { useBusinessContext } from "@/hooks/useBusinessContext";

interface RealAppointment {
  id: string;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  reason?: string;
  patient_id: string;
  dentist_id: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

interface Dentist {
  id: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
  appointment?: RealAppointment;
}

interface DaySchedule {
  date: Date;
  slots: TimeSlot[];
}

const Schedule = () => {
  const [user, setUser] = useState<any>(null);
  const [dentistId, setDentistId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<RealAppointment[]>([]);
  const [viewMode, setViewMode] = useState<'my' | 'team'>('my');
  const [allDentists, setAllDentists] = useState<Dentist[]>([]);
  const [teamAppointments, setTeamAppointments] = useState<RealAppointment[]>([]);
  const [totalDentistsCount, setTotalDentistsCount] = useState<number>(0);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { businessId } = useBusinessContext();

  // Load user and dentist info
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUser(user);
      
      // Get dentist ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (profile) {
        const { data: provider } = await supabase
          .from('providers')
          .select('id')
          .eq('profile_id', profile.id)
          .maybeSingle();
        
        if (provider) {
          setDentistId(provider.id);
        }
      }
    };
    
    loadUser();
  }, []);

  // Check total dentist count in the practice
  useEffect(() => {
    if (!businessId) return;

    const checkDentistCount = async () => {
      try {
        const { data: businessMembers, error: membersError } = await supabase
          .from('business_members')
          .select('profile_id')
          .eq('business_id', businessId)
          .in('role', ['dentist', 'admin', 'owner']);

        if (membersError) throw membersError;

        if (!businessMembers || businessMembers.length === 0) {
          setTotalDentistsCount(0);
          return;
        }

        const profileIds = businessMembers.map(m => m.profile_id);

        const { data: dentistsData, error: dentistsError } = await supabase
          .from('dentists')
          .select('id')
          .in('profile_id', profileIds)
          .eq('is_active', true);

        if (dentistsError) throw dentistsError;

        const count = (dentistsData || []).length;
        setTotalDentistsCount(count);

        // If only one dentist, force switch to "my" view
        if (count <= 1 && viewMode === 'team') {
          setViewMode('my');
        }
      } catch (error: any) {
        console.error('Error checking dentist count:', error);
      }
    };

    checkDentistCount();
  }, [businessId]);

  // Fetch real appointments
  useEffect(() => {
    if (!dentistId) return;

    const fetchAppointments = async () => {
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            profiles:patient_id (
              first_name,
              last_name
            )
          `)
          .eq('dentist_id', dentistId)
          .gte('appointment_date', format(startOfWeek(selectedDate), 'yyyy-MM-dd'))
          .lte('appointment_date', format(endOfWeek(selectedDate), 'yyyy-MM-dd'));

        if (error) throw error;
        setAppointments(data || []);
      } catch (error: any) {
        console.error('Error fetching appointments:', error);
        toast({
          title: "Error",
          description: "Failed to load appointments",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [dentistId, selectedDate]);

  // Fetch team data when in team view
  useEffect(() => {
    if (!businessId || viewMode !== 'team') return;

    const fetchTeamData = async () => {
      try {
        setLoading(true);

        // Fetch all dentists in the business
        const { data: businessMembers, error: membersError } = await supabase
          .from('business_members')
          .select('profile_id')
          .eq('business_id', businessId)
          .in('role', ['dentist', 'admin', 'owner']);

        if (membersError) throw membersError;

        if (!businessMembers || businessMembers.length === 0) {
          setAllDentists([]);
          setTeamAppointments([]);
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

        // Transform profiles from array to single object
        const formattedDentists = (dentistsData || []).map((d: any) => ({
          ...d,
          profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles
        }));

        setAllDentists(formattedDentists);

        // Fetch all appointments for the week
        const weekStart = format(startOfWeek(selectedDate), 'yyyy-MM-dd');
        const weekEnd = format(endOfWeek(selectedDate), 'yyyy-MM-dd');

        const dentistIds = formattedDentists.map(d => d.id);

        if (dentistIds.length > 0) {
          const { data: appointmentsData, error: appointmentsError } = await supabase
            .from('appointments')
            .select(`
              *,
              profiles:patient_id (
                first_name,
                last_name
              )
            `)
            .eq('business_id', businessId)
            .in('dentist_id', dentistIds)
            .gte('appointment_date', weekStart)
            .lte('appointment_date', weekEnd)
            .order('appointment_date', { ascending: true });

          if (appointmentsError) throw appointmentsError;

          setTeamAppointments(appointmentsData || []);
        }
      } catch (error: any) {
        console.error('Error fetching team data:', error);
        toast({
          title: "Error",
          description: "Failed to load team schedule",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [businessId, viewMode, selectedDate]);

  // Generate time slots with real appointments
  const generateTimeSlotsForDate = (date: Date): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = 9;
    const endHour = 17;
    const dateStr = format(date, 'yyyy-MM-dd');
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Check if there's an appointment at this time
        const appointment = (appointments || []).find(apt => {
          if (!apt?.appointment_date) return false;
          try {
            const aptTime = format(new Date(apt.appointment_date), 'HH:mm');
            const aptDate = format(new Date(apt.appointment_date), 'yyyy-MM-dd');
            return aptDate === dateStr && aptTime === time;
          } catch {
            return false;
          }
        });
        
        slots.push({
          id: `${dateStr}-${time}`,
          time,
          available: !appointment,
          appointment: appointment
        });
      }
    }
    
    return slots;
  };

  // Generate schedule when appointments change
  useEffect(() => {
    if (!dentistId) return;
    
    const start = startOfWeek(selectedDate);
    const end = endOfWeek(selectedDate);
    const days = eachDayOfInterval({ start, end });
    
    const weekSchedule = days.map(date => ({
      date,
      slots: generateTimeSlotsForDate(date)
    }));
    
    setSchedule(weekSchedule);
  }, [appointments, selectedDate, dentistId]);

  const getDayName = (date: Date) => {
    return format(date, 'EEEE');
  };

  const getFormattedDate = (date: Date) => {
    return format(date, 'MMM d');
  };

  const getTimeSlotsForDate = (date: Date) => {
    const daySchedule = schedule.find(day =>
      format(day.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    return daySchedule?.slots || [];
  };

  // Helper functions for team view
  const getTeamAppointmentsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return teamAppointments.filter(apt => {
      if (!apt?.appointment_date) return false;
      try {
        const aptDate = format(new Date(apt.appointment_date), 'yyyy-MM-dd');
        return aptDate === dateStr;
      } catch {
        return false;
      }
    });
  };

  const getDentistName = (dentistId: string) => {
    const dentist = allDentists.find(d => d.id === dentistId);
    if (!dentist) return 'Unknown';
    return `Dr ${dentist.profiles.first_name} ${dentist.profiles.last_name}`;
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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!dentistId && !loading) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">You need dentist access to view schedules.</p>
            <Button onClick={() => navigate('/dashboard')} className="mt-4">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <PageHeader
          title="Schedule"
          subtitle={viewMode === 'my' ? "Manage your appointments and availability" : "View team schedules (read-only)"}
          breadcrumbs={[{ label: "Admin", href: "/dashboard" }, { label: "Schedule" }]}
        />
        {/* Only show switch button if there are multiple dentists */}
        {totalDentistsCount > 1 && (
          <Button
            variant={viewMode === 'team' ? 'default' : 'outline'}
            onClick={() => setViewMode(viewMode === 'my' ? 'team' : 'my')}
            className="flex items-center gap-2"
          >
            {viewMode === 'my' ? (
              <>
                <Users className="w-4 h-4" />
                Switch to Team View
              </>
            ) : (
              <>
                <User className="w-4 h-4" />
                Switch to My Schedule
              </>
            )}
          </Button>
        )}
      </div>

      {viewMode === 'my' ? (
        // My Schedule View
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* Schedule for selected date */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Schedule for {getDayName(selectedDate)}, {getFormattedDate(selectedDate)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {getTimeSlotsForDate(selectedDate).length > 0 ? (
                    getTimeSlotsForDate(selectedDate).map((slot) => (
                      <div
                        key={slot?.id || `slot-${Math.random()}`}
                        className={`p-4 rounded-lg border transition-colors ${
                          slot?.available
                            ? 'bg-green-50 border-green-200 hover:bg-green-100'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant={slot?.available ? "default" : "secondary"}>
                              {slot?.time || 'N/A'}
                            </Badge>
                            {slot?.available ? (
                              <span className="text-sm text-green-700">Available</span>
                            ) : slot?.appointment && (
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                <span className="text-sm font-medium">
                                  {slot.appointment.profiles?.first_name} {slot.appointment.profiles?.last_name}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  - {slot.appointment.reason || 'Appointment'}
                                </span>
                              </div>
                            )}
                          </div>
                          {slot?.available && (
                            <Button size="sm" variant="outline">
                              Book
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No schedule available for this date
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        // Team Schedule View
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* Team Schedule for selected date */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Schedule - {getDayName(selectedDate)}, {getFormattedDate(selectedDate)}
                </CardTitle>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  Read-only
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {allDentists.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No other practitioners found in your practice
                    </p>
                  ) : (
                    allDentists.map((dentist) => {
                      const dentistAppts = getTeamAppointmentsForDate(selectedDate).filter(
                        apt => apt.dentist_id === dentist.id
                      );
                      return (
                        <div key={dentist.id} className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">
                                Dr {dentist.profiles.first_name} {dentist.profiles.last_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {dentistAppts.length} appointment{dentistAppts.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2 ml-10">
                            {dentistAppts.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No appointments</p>
                            ) : (
                              dentistAppts.map((apt) => (
                                <div
                                  key={apt.id}
                                  className={`p-3 rounded border ${getStatusColor(apt.status)}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-3 h-3" />
                                      <span className="text-sm font-medium">
                                        {format(new Date(apt.appointment_date), 'HH:mm')}
                                      </span>
                                      <span className="text-sm">
                                        {apt.profiles?.first_name} {apt.profiles?.last_name}
                                      </span>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {apt.status}
                                    </Badge>
                                  </div>
                                  {apt.reason && (
                                    <div className="text-xs mt-1 opacity-75">{apt.reason}</div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions - Only show in My Schedule view */}
      {viewMode === 'my' && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button variant="outline" className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Set Availability
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Block Time
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Schedule;
