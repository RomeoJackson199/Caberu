import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  User as UserIcon,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Phone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { logger } from '@/lib/logger';
import { RescheduleDialog } from '@/components/RescheduleDialog';

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  reason: string;
  urgency: string;
  notes?: string;
  dentist: {
    id: string;
    profile: {
      first_name: string;
      last_name: string;
      phone?: string;
    };
  };
}

interface RealAppointmentsListProps {
  user: User;
  filter?: 'upcoming' | 'past' | 'incomplete';
}

export const RealAppointmentsList = ({ user, filter }: RealAppointmentsListProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rescheduleAppointmentId, setRescheduleAppointmentId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user profile first
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw new Error('Unable to find your profile. Please ensure you are logged in.');
      }

      if (!profile) {
        throw new Error('Profile not found. Please complete your profile setup.');
      }

      // Fetch appointments with dentist information
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          status,
          reason,
          urgency,
          notes,
          dentist_id
        `)
        .eq('patient_id', profile.id)
        .order('appointment_date', { ascending: false });

      if (appointmentsError) {
        console.error('Appointments error:', appointmentsError);
        throw new Error('Failed to load appointments from database.');
      }

      // Ensure appointments data is properly formatted
      const formattedAppointments: Appointment[] = (appointmentsData || []).map(apt => ({
        id: apt.id,
        appointment_date: apt.appointment_date || new Date().toISOString(),
        status: apt.status || 'scheduled',
        reason: apt.reason || 'Dental checkup',
        urgency: apt.urgency || 'low',
        notes: apt.notes,
        dentist: {
          id: apt.dentist_id,
          profile: {
            first_name: 'Dr.',
            last_name: 'Dentist',
            phone: undefined
          }
        }
      }));

      setAppointments(formattedAppointments);

      // Show success message if appointments were loaded
      if (formattedAppointments.length > 0) {
        toast({
          title: "Success",
          description: `Loaded ${formattedAppointments.length} appointment${formattedAppointments.length !== 1 ? 's' : ''}`,
          variant: "default",
        });
      }
    } catch (err: any) {
    console.error('Error fetching appointments:', err);
    setError(err.message || 'Failed to load appointments');
    toast({
      title: "Error",
      description: err.message || "Failed to load your appointments. Please try again.",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
  }, [user.id, toast]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
      case 'scheduled':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency?.toLowerCase()) {
      case 'emergency':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Date not available';
      }
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Date not available';
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Time not available';
      }
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Time not available';
    }
  };

  const now = new Date();

  const canModifyAppointment = (apt: Appointment) => {
    const date = new Date(apt.appointment_date);
    const upcoming = date >= now;
    const locked = apt.status?.toLowerCase() === 'cancelled' || apt.status?.toLowerCase() === 'completed';
    return upcoming && !locked;
  };

  const filteredAppointments = appointments.filter((apt) => {
    if (!filter) return true;
    const date = new Date(apt.appointment_date);
    if (filter === 'upcoming') {
      return date >= now && (apt.status === 'confirmed' || apt.status === 'scheduled' || apt.status === 'pending');
    }
    if (filter === 'past') {
      return date < now && (apt.status === 'completed' || apt.status === 'cancelled');
    }
    if (filter === 'incomplete') {
      return apt.status === 'pending' || apt.status === 'scheduled';
    }
    return true;
  });

  const nextUpcoming = appointments
    .filter((apt) => new Date(apt.appointment_date) >= now && (apt.status === 'confirmed' || apt.status === 'scheduled' || apt.status === 'pending'))
    .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())[0] || null;

  const openDetails = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setDetailsOpen(true);
  };

  const openReschedule = (apt: Appointment) => {
    setRescheduleAppointmentId(apt.id);
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      setProcessing(true);
      // Release any held slot
      await supabase.rpc('release_appointment_slot', { p_appointment_id: appointmentId });
      // Cancel appointment via RPC
      const { data, error } = await supabase.rpc('cancel_appointment', {
        appointment_id: appointmentId,
        user_id: user.id
      });
      if (error) throw error;
      if (data) {
        toast({ title: 'Appointment cancelled' });
        setDetailsOpen(false);
        await fetchAppointments();
      } else {
        toast({ title: 'Failed to cancel appointment', variant: 'destructive' });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to cancel appointment', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">My Appointments</h2>
            <p className="text-dental-muted-foreground">Loading your appointments...</p>
          </div>
        </div>
        <div className="flex justify-center p-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-dental-primary" />
            <p className="text-dental-muted-foreground">Loading appointments...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">My Appointments</h2>
            <p className="text-dental-muted-foreground">Unable to load appointments</p>
          </div>
        </div>
        <Card className="glass-card border-0">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Appointments</h3>
            <p className="text-dental-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchAppointments} variant="outline" className="mr-2">
              Try Again
            </Button>
            <Button onClick={() => window.location.reload()} variant="ghost">
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Appointments</h2>
          <p className="text-dental-muted-foreground">
            {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={fetchAppointments} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Next upcoming appointment highlight */}
      {filter === 'upcoming' && nextUpcoming && (
        <Card className="glass-card border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Your next appointment</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(nextUpcoming.status)}
                  <div className={`w-2 h-2 rounded-full ${getUrgencyColor(nextUpcoming.urgency)}`}></div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-lg">{nextUpcoming.reason || 'Dental Appointment'}</h3>
                    <Badge className={getStatusColor(nextUpcoming.status)}>
                      {nextUpcoming.status}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-dental-muted-foreground mb-2">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(nextUpcoming.appointment_date)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(nextUpcoming.appointment_date)}</span>
                    </div>
                    {nextUpcoming.dentist?.profile && (
                      <div className="flex items-center space-x-1">
                        <UserIcon className="h-4 w-4" />
                        <span>
                          Dr. {nextUpcoming.dentist.profile.first_name || 'Unknown'} {nextUpcoming.dentist.profile.last_name || 'Dentist'}
                        </span>
                      </div>
                    )}
                  </div>
                  {nextUpcoming.notes && (
                    <p className="text-sm text-dental-muted-foreground bg-white/50 p-3 rounded-lg">
                      {nextUpcoming.notes}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                {canModifyAppointment(nextUpcoming) && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => openReschedule(nextUpcoming)}>
                      Reschedule
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">Cancel</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel appointment?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This cannot be undone. Are you sure you want to cancel this appointment?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={processing}>No</AlertDialogCancel>
                          <AlertDialogAction onClick={() => cancelAppointment(nextUpcoming.id)} disabled={processing}>
                            Yes, cancel
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
                {nextUpcoming.dentist?.profile?.phone && (
                  <Button variant="ghost" size="sm" className="text-xs" onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${nextUpcoming.dentist.profile.phone}`; }}>
                    <Phone className="h-4 w-4 mr-1" /> Call Doctor
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredAppointments.length === 0 ? (
        <Card className="glass-card border-0">
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 text-dental-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Appointments Found</h3>
            <p className="text-dental-muted-foreground mb-0">
              You don't have any appointments scheduled yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((apt) => (
            <Card key={apt.id} className="glass-card border-0 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => openDetails(apt)}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(apt.status)}
                      <div className={`w-2 h-2 rounded-full ${getUrgencyColor(apt.urgency)}`}></div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-lg">{apt.reason || 'Dental Appointment'}</h3>
                        <Badge className={getStatusColor(apt.status)}>
                          {apt.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-dental-muted-foreground mb-3">
                        {apt.dentist?.profile && (
                          <div className="flex items-center space-x-1">
                            <UserIcon className="h-4 w-4" />
                            <span>
                              Dr. {apt.dentist.profile.first_name || 'Unknown'} {apt.dentist.profile.last_name || 'Dentist'}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(apt.appointment_date)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatTime(apt.appointment_date)}</span>
                        </div>
                      </div>
                      
                      {apt.notes && (
                        <p className="text-sm text-dental-muted-foreground bg-white/50 p-3 rounded-lg">
                          {apt.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2">
                    <Badge variant="outline" className="capitalize">
                      {apt.urgency} priority
                    </Badge>
                    {apt.dentist?.profile?.phone && (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${apt.dentist.profile.phone}`; }}>
                        Call Doctor
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Details dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          {selectedAppointment && (
            <>
              <DialogHeader>
                <DialogTitle>Appointment Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Reason for Visit</h4>
                  <p className="text-sm">{selectedAppointment.reason || 'General consultation'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(selectedAppointment.appointment_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(selectedAppointment.appointment_date)}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4" />
                      <span>
                        Dr. {selectedAppointment.dentist?.profile?.first_name || 'Unknown'} {selectedAppointment.dentist?.profile?.last_name || 'Dentist'}
                      </span>
                    </div>
                    {selectedAppointment.dentist?.profile?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{selectedAppointment.dentist.profile.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge className={getStatusColor(selectedAppointment.status)}>{selectedAppointment.status}</Badge>
                  <Badge variant="outline" className="capitalize">{selectedAppointment.urgency} priority</Badge>
                </div>
                {selectedAppointment.notes && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Notes</h4>
                    <p className="text-sm">{selectedAppointment.notes}</p>
                  </div>
                )}
              </div>
              <DialogFooter className="mt-4">
                {canModifyAppointment(selectedAppointment) && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => openReschedule(selectedAppointment)} disabled={processing}>Reschedule</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={processing}>Cancel Appointment</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel appointment?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={processing}>No</AlertDialogCancel>
                          <AlertDialogAction onClick={() => cancelAppointment(selectedAppointment.id)} disabled={processing}>
                            Yes, cancel
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reschedule dialog */}
      <RescheduleDialog
        appointmentId={rescheduleAppointmentId}
        open={!!rescheduleAppointmentId}
        onOpenChange={(open) => {
          if (!open) setRescheduleAppointmentId(null);
        }}
        onSuccess={() => {
          setRescheduleAppointmentId(null);
          fetchAppointments();
        }}
      />
    </div>
  );
};

export default RealAppointmentsList;