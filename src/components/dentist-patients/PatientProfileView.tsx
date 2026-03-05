import { useState, useMemo } from 'react';
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
  FileText,
  CreditCard,
  Stethoscope,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Search,
  Loader2,
  Clock
} from 'lucide-react';
import { DentistPatient, PatientFlags, PatientAppointment, getAppointmentGroup } from './types';
import { MedicalAlertsBanner } from '@/components/patients/MedicalAlertsBanner';
import { AppointmentGroup } from './components';
import { PatientBalanceDetails } from '@/components/patient-management/PatientBalanceDetails';
import { getAge } from '@/lib/patient-utils';
import { cn } from '@/lib/utils';

interface PatientProfileViewProps {
  patient: DentistPatient;
  patientFlags?: PatientFlags;
  appointments: PatientAppointment[];
  businessId: string;
  dentistId: string;
  loadingAppointments?: boolean;
  hasMoreAppointments?: boolean;
  onLoadMoreAppointments?: () => void;
  onStartConsultation: (appointmentId?: string) => void;
  onAppointmentClick: (appointment: PatientAppointment) => void;
  onEnterConsultation?: (appointmentId: string) => void;
  onTreatmentPlanClick?: (planId: string) => void;
  onBack?: () => void;
  onAppointmentUpdated?: () => void;
  onBalanceUpdated?: () => void;
  updateAppointmentOptimistically?: (appointmentId: string, updates: Partial<PatientAppointment>) => void;
  rollbackAppointmentUpdate?: (appointmentId: string, original: PatientAppointment) => void;
}

const INITIAL_VISIBLE = 5;

export function PatientProfileView({
  patient,
  patientFlags,
  appointments,
  businessId,
  dentistId,
  loadingAppointments = false,
  hasMoreAppointments = false,
  onLoadMoreAppointments,
  onStartConsultation,
  onAppointmentClick,
  onEnterConsultation,
  onTreatmentPlanClick,
  onBack,
  onAppointmentUpdated,
  onBalanceUpdated
}: PatientProfileViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [showBalanceDetails, setShowBalanceDetails] = useState(false);
  
  const age = getAge(patient.date_of_birth);
  const patientContact = patient.phone?.trim() || patient.email?.trim() || 'No contact details';
  const ContactIcon = patient.phone?.trim() ? Phone : Mail;

  // Filter and group appointments
  const groupedAppointments = useMemo(() => {
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

    // Sort upcoming ascending, others descending
    groups.upcoming.sort((a, b) => 
      new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
    );
    ['needs_completion', 'completed', 'cancelled'].forEach(key => {
      groups[key as keyof typeof groups].sort((a, b) => 
        new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
      );
    });

    return groups;
  }, [appointments, searchTerm]);

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
      completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
      confirmed: 'bg-primary/10 text-primary border-primary/20',
      pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
      cancelled: 'bg-destructive/10 text-destructive border-destructive/20'
    };
    return styles[status] || 'bg-muted text-muted-foreground';
  };

  const totalAppointments = 
    groupedAppointments.upcoming.length + 
    groupedAppointments.needs_completion.length + 
    groupedAppointments.completed.length + 
    groupedAppointments.cancelled.length;

  return (
    <div className="h-full flex flex-col">
      {/* Header - Patient Identity */}
      <header className="flex-shrink-0 p-6 border-b bg-card">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 -ml-2 lg:hidden">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-background shadow-sm">
              <AvatarImage src={patient.profile_picture_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                {patient.first_name?.[0]}{patient.last_name?.[0]}
              </AvatarFallback>
            </Avatar>

            <div>
              <h1 className="text-xl font-bold">
                {patient.first_name} {patient.last_name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                {age && (
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {age} years
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <ContactIcon className="h-3.5 w-3.5" />
                  {patientContact}
                </span>
              </div>
            </div>
          </div>

          <Button 
            size="default" 
            onClick={() => onStartConsultation()}
            className="hidden sm:flex gap-2 shadow-sm"
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
      </header>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-5">
          {/* Medical Alerts */}
          <MedicalAlertsBanner patientId={patient.id} businessId={businessId} />

          {/* Medical Notes */}
          {patient.medical_history && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Medical Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {patient.medical_history}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Appointments */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Appointments
                  <Badge variant="secondary" className="ml-1 font-normal text-xs">
                    {appointments.length}
                  </Badge>
                </CardTitle>
                <div className="relative flex-1 max-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {loadingAppointments ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No appointments yet</p>
                  <p className="text-sm mt-1">Schedule the first appointment to get started</p>
                </div>
              ) : totalAppointments === 0 && searchTerm ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No results for "{searchTerm}"</p>
                </div>
              ) : (
                <>
                  <AppointmentGroup
                    title="Upcoming"
                    icon={<Calendar className="h-3 w-3" />}
                    colorClass="text-muted-foreground"
                    appointments={groupedAppointments.upcoming}
                    visibleCount={INITIAL_VISIBLE}
                    isExpanded={expandedGroups['upcoming']}
                    onToggleExpand={() => toggleGroupExpansion('upcoming')}
                    getStatusIcon={getStatusIcon}
                    getStatusBadge={getStatusBadge}
                    onAppointmentClick={onAppointmentClick}
                    onEnterConsultation={onEnterConsultation}
                    onReasonUpdated={onAppointmentUpdated}
                    onTreatmentPlanClick={onTreatmentPlanClick}
                    isSearching={!!searchTerm}
                  />

                  <AppointmentGroup
                    title="Action Required"
                    icon={<AlertCircle className="h-3 w-3" />}
                    colorClass="text-amber-600 dark:text-amber-400"
                    appointments={groupedAppointments.needs_completion}
                    visibleCount={INITIAL_VISIBLE}
                    isExpanded={expandedGroups['needs_completion']}
                    onToggleExpand={() => toggleGroupExpansion('needs_completion')}
                    getStatusIcon={getStatusIcon}
                    getStatusBadge={getStatusBadge}
                    onAppointmentClick={onAppointmentClick}
                    onEnterConsultation={onEnterConsultation}
                    onReasonUpdated={onAppointmentUpdated}
                    onTreatmentPlanClick={onTreatmentPlanClick}
                    isSearching={!!searchTerm}
                    highlight
                  />

                  <AppointmentGroup
                    title="Completed"
                    icon={<CheckCircle2 className="h-3 w-3" />}
                    colorClass="text-emerald-600 dark:text-emerald-400"
                    appointments={groupedAppointments.completed}
                    visibleCount={INITIAL_VISIBLE}
                    isExpanded={expandedGroups['completed']}
                    onToggleExpand={() => toggleGroupExpansion('completed')}
                    getStatusIcon={getStatusIcon}
                    getStatusBadge={getStatusBadge}
                    onAppointmentClick={onAppointmentClick}
                    onReasonUpdated={onAppointmentUpdated}
                    onTreatmentPlanClick={onTreatmentPlanClick}
                    isSearching={!!searchTerm}
                  />

                  <AppointmentGroup
                    title="Cancelled"
                    icon={<XCircle className="h-3 w-3" />}
                    colorClass="text-destructive"
                    appointments={groupedAppointments.cancelled}
                    visibleCount={INITIAL_VISIBLE}
                    isExpanded={expandedGroups['cancelled']}
                    onToggleExpand={() => toggleGroupExpansion('cancelled')}
                    getStatusIcon={getStatusIcon}
                    getStatusBadge={getStatusBadge}
                    onAppointmentClick={onAppointmentClick}
                    onReasonUpdated={onAppointmentUpdated}
                    onTreatmentPlanClick={onTreatmentPlanClick}
                    isSearching={!!searchTerm}
                  />

                  {hasMoreAppointments && !searchTerm && (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={onLoadMoreAppointments}
                      disabled={loadingAppointments}
                    >
                      {loadingAppointments ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        'Load More'
                      )}
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Financial Overview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patientFlags?.hasUnpaidBalance ? (
                <button
                  type="button"
                  onClick={() => setShowBalanceDetails(true)}
                  className="w-full flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20 cursor-pointer transition-all hover:bg-destructive/10 hover:border-destructive/40 hover:shadow-sm group"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <div className="text-left">
                      <span className="text-sm font-medium">Outstanding</span>
                      <p className="text-[11px] text-muted-foreground group-hover:text-destructive transition-colors">Click to view details</p>
                    </div>
                  </div>
                  <span className="font-bold text-destructive">
                    €{((patientFlags.outstandingCents || 0) / 100).toFixed(2)}
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-emerald-50/50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm text-emerald-700 dark:text-emerald-300">No outstanding balance</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      <PatientBalanceDetails
        open={showBalanceDetails}
        onOpenChange={setShowBalanceDetails}
        patientId={patient.id}
        patientName={`${patient.first_name} ${patient.last_name}`}
        dentistId={dentistId}
        onBalanceUpdated={onBalanceUpdated}
      />
    </div>
  );
}
