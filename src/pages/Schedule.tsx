import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, User, MapPin } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { LoadingSpinner } from "@/components/enhanced/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { logger } from '@/lib/logger';

interface RealAppointment {
  id: string;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  reason?: string;
  patient_id: string;
  profiles?: {
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
  const { toast } = useToast();
  const navigate = useNavigate();

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
      <PageHeader
        title="Schedule"
        subtitle="Manage your appointments and availability"
        breadcrumbs={[{ label: "Admin", href: "/dashboard" }, { label: "Schedule" }]}
      />

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

      {/* Quick Actions */}
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
    </div>
  );
};

export default Schedule;
