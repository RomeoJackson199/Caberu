import { useState, useMemo } from 'react';
import { differenceInYears } from 'date-fns';
import { formatClinicTime } from '@/lib/timezone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  User,
  Phone,
  Mail,
  AlertTriangle,
  Calendar,
  Clock,
  FileText,
  CreditCard,
  Stethoscope,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Search,
  Pencil,
  Check,
  X,
  Loader2
} from 'lucide-react';
import { DentistPatient, PatientFlags, PatientAppointment, getAppointmentGroup } from './types';
import { MedicalAlertsBanner } from '@/components/patient/MedicalAlertsBanner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PatientProfileViewProps {
  patient: DentistPatient;
  patientFlags?: PatientFlags;
  appointments: PatientAppointment[];
  businessId: string;
  loadingAppointments?: boolean;
  hasMoreAppointments?: boolean;
  onLoadMoreAppointments?: () => void;
  onStartConsultation: (appointmentId?: string) => void;
  onAppointmentClick: (appointment: PatientAppointment) => void;
  onBack?: () => void;
  onAppointmentUpdated?: () => void;
  updateAppointmentOptimistically?: (appointmentId: string, updates: Partial<PatientAppointment>) => void;
  rollbackAppointmentUpdate?: (appointmentId: string, original: PatientAppointment) => void;
}

export function PatientProfileView({
  patient,
  patientFlags,
  appointments,
  businessId,
  loadingAppointments = false,
  hasMoreAppointments = false,
  onLoadMoreAppointments,
  onStartConsultation,
  onAppointmentClick,
  onBack,
  onAppointmentUpdated,
  updateAppointmentOptimistically,
  rollbackAppointmentUpdate
}: PatientProfileViewProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const INITIAL_VISIBLE = 5; // Show 5 items per group initially
  
  const age = patient.date_of_birth 
    ? differenceInYears(new Date(), new Date(patient.date_of_birth))
    : null;

  // Filter and group appointments
  const filteredAndGroupedAppointments = useMemo(() => {
    const filtered = appointments.filter(apt => {
      if (!searchTerm.trim()) return true;
      const searchLower = searchTerm.toLowerCase();
      return (apt.reason || '').toLowerCase().includes(searchLower) ||
             formatClinicTime(apt.appointment_date, 'MMM d, yyyy').toLowerCase().includes(searchLower);
    });

    const groups = {
      upcoming: [] as PatientAppointment[],
      needs_completion: [] as PatientAppointment[],
      completed: [] as PatientAppointment[],
      cancelled: [] as PatientAppointment[]
    };

    filtered.forEach(apt => {
      const group = getAppointmentGroup(apt);
      groups[group].push(apt);
    });

    // Sort upcoming by date ascending
    groups.upcoming.sort((a, b) => 
      new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
    );

    // Sort others by date descending
    groups.needs_completion.sort((a, b) => 
      new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
    );
    groups.completed.sort((a, b) => 
      new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
    );
    groups.cancelled.sort((a, b) => 
      new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
    );

    return groups;
  }, [appointments, searchTerm]);

  // Helper to get visible items for a group
  const getVisibleItems = (groupKey: string, items: PatientAppointment[]) => {
    if (expandedGroups[groupKey] || searchTerm) {
      return items;
    }
    return items.slice(0, INITIAL_VISIBLE);
  };

  const toggleGroupExpansion = (groupKey: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'confirmed': return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case 'pending': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Calendar className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      confirmed: 'bg-primary/10 text-primary border-primary/20',
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      cancelled: 'bg-destructive/10 text-destructive border-destructive/20'
    };
    return styles[status] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header - Identity & Safety */}
      <div className="flex-shrink-0 p-6 border-b bg-card">
        {/* Back button on mobile */}
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 -ml-2 lg:hidden">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-background shadow">
              <AvatarImage src={patient.profile_picture_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {patient.first_name?.[0]}{patient.last_name?.[0]}
              </AvatarFallback>
            </Avatar>

            <div>
              <h1 className="text-2xl font-bold">
                {patient.first_name} {patient.last_name}
              </h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                {age && (
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {age} years
                  </span>
                )}
                {patient.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {patient.phone}
                  </span>
                )}
                {patient.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {patient.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Start Consultation CTA */}
          <Button 
            size="lg" 
            onClick={() => onStartConsultation()}
            className="hidden sm:flex gap-2"
          >
            <Stethoscope className="h-4 w-4" />
            Start Consultation
          </Button>
        </div>

        {/* Mobile CTA */}
        <Button 
          onClick={() => onStartConsultation()}
          className="w-full mt-4 sm:hidden gap-2"
        >
          <Stethoscope className="h-4 w-4" />
          Start Consultation
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Medical Alerts Banner */}
          <MedicalAlertsBanner patientId={patient.id} businessId={businessId} />

          {/* Medical Context (Read-only) */}
          {patient.medical_history && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Medical Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {patient.medical_history}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Appointment Timeline - PRIMARY */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Appointments
                </CardTitle>
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search appointments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-8 text-sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingAppointments ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No appointments yet</p>
                </div>
              ) : (
                <>
                  {/* Upcoming */}
                  {filteredAndGroupedAppointments.upcoming.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Upcoming ({filteredAndGroupedAppointments.upcoming.length})
                      </h4>
                      <div className="space-y-2">
                        {getVisibleItems('upcoming', filteredAndGroupedAppointments.upcoming).map((apt: PatientAppointment) => (
                          <AppointmentRow 
                            key={apt.id} 
                            appointment={apt} 
                            onClick={() => onAppointmentClick(apt)}
                            getStatusIcon={getStatusIcon}
                            getStatusBadge={getStatusBadge}
                            onReasonUpdated={onAppointmentUpdated}
                          />
                        ))}
                      </div>
                      {filteredAndGroupedAppointments.upcoming.length > INITIAL_VISIBLE && !searchTerm && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2 text-xs"
                          onClick={() => toggleGroupExpansion('upcoming')}
                        >
                          {expandedGroups['upcoming'] 
                            ? 'Show Less' 
                            : `Show ${filteredAndGroupedAppointments.upcoming.length - INITIAL_VISIBLE} More`}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Needs Completion */}
                  {filteredAndGroupedAppointments.needs_completion.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Action Required ({filteredAndGroupedAppointments.needs_completion.length})
                      </h4>
                      <div className="space-y-2">
                        {getVisibleItems('needs_completion', filteredAndGroupedAppointments.needs_completion).map((apt: PatientAppointment) => (
                          <AppointmentRow 
                            key={apt.id} 
                            appointment={apt} 
                            onClick={() => onAppointmentClick(apt)}
                            getStatusIcon={getStatusIcon}
                            getStatusBadge={getStatusBadge}
                            highlight
                            onReasonUpdated={onAppointmentUpdated}
                          />
                        ))}
                      </div>
                      {filteredAndGroupedAppointments.needs_completion.length > INITIAL_VISIBLE && !searchTerm && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2 text-xs"
                          onClick={() => toggleGroupExpansion('needs_completion')}
                        >
                          {expandedGroups['needs_completion'] 
                            ? 'Show Less' 
                            : `Show ${filteredAndGroupedAppointments.needs_completion.length - INITIAL_VISIBLE} More`}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Completed */}
                  {filteredAndGroupedAppointments.completed.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed ({filteredAndGroupedAppointments.completed.length})
                      </h4>
                      <div className="space-y-2">
                        {getVisibleItems('completed', filteredAndGroupedAppointments.completed).map((apt: PatientAppointment) => (
                          <AppointmentRow 
                            key={apt.id} 
                            appointment={apt} 
                            onClick={() => onAppointmentClick(apt)}
                            getStatusIcon={getStatusIcon}
                            getStatusBadge={getStatusBadge}
                            onReasonUpdated={onAppointmentUpdated}
                          />
                        ))}
                      </div>
                      {filteredAndGroupedAppointments.completed.length > INITIAL_VISIBLE && !searchTerm && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2 text-xs"
                          onClick={() => toggleGroupExpansion('completed')}
                        >
                          {expandedGroups['completed'] 
                            ? 'Show Less' 
                            : `Show ${filteredAndGroupedAppointments.completed.length - INITIAL_VISIBLE} More`}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Cancelled */}
                  {filteredAndGroupedAppointments.cancelled.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2 flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Cancelled ({filteredAndGroupedAppointments.cancelled.length})
                      </h4>
                      <div className="space-y-2">
                        {getVisibleItems('cancelled', filteredAndGroupedAppointments.cancelled).map((apt: PatientAppointment) => (
                          <AppointmentRow 
                            key={apt.id} 
                            appointment={apt} 
                            onClick={() => onAppointmentClick(apt)}
                            getStatusIcon={getStatusIcon}
                            getStatusBadge={getStatusBadge}
                            onReasonUpdated={onAppointmentUpdated}
                          />
                        ))}
                      </div>
                      {filteredAndGroupedAppointments.cancelled.length > INITIAL_VISIBLE && !searchTerm && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2 text-xs"
                          onClick={() => toggleGroupExpansion('cancelled')}
                        >
                          {expandedGroups['cancelled'] 
                            ? 'Show Less' 
                            : `Show ${filteredAndGroupedAppointments.cancelled.length - INITIAL_VISIBLE} More`}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Load More Button */}
                  {hasMoreAppointments && !searchTerm && (
                    <Button 
                      variant="outline" 
                      className="w-full mt-4" 
                      onClick={onLoadMoreAppointments}
                      disabled={loadingAppointments}
                    >
                      {loadingAppointments ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        'Load More Appointments'
                      )}
                    </Button>
                  )}

                  {/* No results from search */}
                  {searchTerm && 
                    filteredAndGroupedAppointments.upcoming.length === 0 && 
                    filteredAndGroupedAppointments.needs_completion.length === 0 && 
                    filteredAndGroupedAppointments.completed.length === 0 &&
                    filteredAndGroupedAppointments.cancelled.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No appointments match "{searchTerm}"</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Financial Snapshot (Read-only) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Financial Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patientFlags?.hasUnpaidBalance ? (
                <div className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium">Outstanding Balance</span>
                  </div>
                  <span className="font-bold text-destructive">
                    €{((patientFlags.outstandingCents || 0) / 100).toFixed(2)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm text-emerald-700">No outstanding balance</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}

// Appointment row component with editable reason
function AppointmentRow({ 
  appointment, 
  onClick, 
  getStatusIcon,
  getStatusBadge,
  highlight = false,
  onReasonUpdated
}: { 
  appointment: PatientAppointment;
  onClick: () => void;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusBadge: (status: string) => string;
  highlight?: boolean;
  onReasonUpdated?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedReason, setEditedReason] = useState(appointment.reason || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditedReason(appointment.reason || '');
    setIsEditing(true);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setEditedReason(appointment.reason || '');
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editedReason.trim()) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ reason: editedReason.trim() })
        .eq('id', appointment.id);
      
      if (error) throw error;
      
      setIsEditing(false);
      onReasonUpdated?.();
    } catch (error) {
      console.error('Error updating appointment reason:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      handleSave(e as unknown as React.MouseEvent);
    } else if (e.key === 'Escape') {
      handleCancel(e as unknown as React.MouseEvent);
    }
  };

  return (
    <div
      onClick={isEditing ? undefined : onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20",
        highlight && "border-amber-300 bg-amber-50/50",
        !isEditing && "cursor-pointer hover:bg-muted/50"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
            appointment.status === 'completed' ? "bg-emerald-100" :
            appointment.status === 'confirmed' ? "bg-primary/10" :
            appointment.status === 'pending' ? "bg-amber-100" :
            "bg-muted"
          )}>
            {getStatusIcon(appointment.status)}
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={editedReason}
                  onChange={(e) => setEditedReason(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-7 text-sm"
                  autoFocus
                  disabled={isSaving}
                />
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  onClick={handleSave}
                  disabled={isSaving || !editedReason.trim()}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1 group">
                <p className="text-sm font-medium truncate">
                  {appointment.reason || 'General consultation'}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleEditClick}
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {formatClinicTime(appointment.appointment_date, 'MMM d, yyyy')} at {formatClinicTime(appointment.appointment_date, 'h:mm a')}
              {appointment.duration_minutes && ` · ${appointment.duration_minutes} min`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="outline" className={cn("text-xs capitalize", getStatusBadge(appointment.status))}>
            {appointment.status}
          </Badge>
          {!isEditing && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>
    </div>
  );
}
