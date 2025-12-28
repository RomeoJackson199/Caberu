import { useState, useEffect, useMemo } from 'react';
import { format, differenceInYears } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
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
  ClipboardCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowLeft
} from 'lucide-react';
import { DentistPatient, PatientFlags, PatientAppointment, getAppointmentGroup } from './types';
import { MedicalAlertsBanner } from '@/components/patient/MedicalAlertsBanner';
import { cn } from '@/lib/utils';

interface PatientProfileViewProps {
  patient: DentistPatient;
  patientFlags?: PatientFlags;
  appointments: PatientAppointment[];
  businessId: string;
  loadingAppointments?: boolean;
  onStartConsultation: (appointmentId?: string) => void;
  onAppointmentClick: (appointment: PatientAppointment) => void;
  onBack?: () => void;
}

export function PatientProfileView({
  patient,
  patientFlags,
  appointments,
  businessId,
  loadingAppointments = false,
  onStartConsultation,
  onAppointmentClick,
  onBack
}: PatientProfileViewProps) {
  const age = patient.date_of_birth 
    ? differenceInYears(new Date(), new Date(patient.date_of_birth))
    : null;

  // Group appointments
  const groupedAppointments = useMemo(() => {
    const groups = {
      upcoming: [] as PatientAppointment[],
      needs_completion: [] as PatientAppointment[],
      finalized: [] as PatientAppointment[]
    };

    appointments.forEach(apt => {
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
    groups.finalized.sort((a, b) => 
      new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
    );

    return groups;
  }, [appointments]);

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
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Appointments
              </CardTitle>
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
                  {groupedAppointments.upcoming.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Upcoming
                      </h4>
                      <div className="space-y-2">
                        {groupedAppointments.upcoming.map(apt => (
                          <AppointmentRow 
                            key={apt.id} 
                            appointment={apt} 
                            onClick={() => onAppointmentClick(apt)}
                            getStatusIcon={getStatusIcon}
                            getStatusBadge={getStatusBadge}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Needs Completion */}
                  {groupedAppointments.needs_completion.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Needs Completion
                      </h4>
                      <div className="space-y-2">
                        {groupedAppointments.needs_completion.map(apt => (
                          <AppointmentRow 
                            key={apt.id} 
                            appointment={apt} 
                            onClick={() => onAppointmentClick(apt)}
                            getStatusIcon={getStatusIcon}
                            getStatusBadge={getStatusBadge}
                            highlight
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Finalized */}
                  {groupedAppointments.finalized.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Completed
                      </h4>
                      <div className="space-y-2">
                        {groupedAppointments.finalized.slice(0, 5).map(apt => (
                          <AppointmentRow 
                            key={apt.id} 
                            appointment={apt} 
                            onClick={() => onAppointmentClick(apt)}
                            getStatusIcon={getStatusIcon}
                            getStatusBadge={getStatusBadge}
                          />
                        ))}
                        {groupedAppointments.finalized.length > 5 && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            +{groupedAppointments.finalized.length - 5} more completed appointments
                          </p>
                        )}
                      </div>
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

// Appointment row component
function AppointmentRow({ 
  appointment, 
  onClick, 
  getStatusIcon,
  getStatusBadge,
  highlight = false 
}: { 
  appointment: PatientAppointment;
  onClick: () => void;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusBadge: (status: string) => string;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
        highlight && "border-amber-300 bg-amber-50/50"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            appointment.status === 'completed' ? "bg-emerald-100" :
            appointment.status === 'confirmed' ? "bg-primary/10" :
            appointment.status === 'pending' ? "bg-amber-100" :
            "bg-muted"
          )}>
            {getStatusIcon(appointment.status)}
          </div>
          <div>
            <p className="text-sm font-medium">
              {appointment.reason || 'General consultation'}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(appointment.appointment_date), 'MMM d, yyyy')} at {format(new Date(appointment.appointment_date), 'h:mm a')}
              {appointment.duration_minutes && ` · ${appointment.duration_minutes} min`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("text-xs capitalize", getStatusBadge(appointment.status))}>
            {appointment.status}
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </button>
  );
}
