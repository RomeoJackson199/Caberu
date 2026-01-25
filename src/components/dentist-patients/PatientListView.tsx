import { useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Search, AlertTriangle, Calendar, Clock, TrendingUp } from 'lucide-react';
import { DentistPatient, PatientFlags } from './types';
import { cn } from '@/lib/utils';
import { AddPatientDialog } from './AddPatientDialog';
import { getAge, hasMedicalRisk, getInitials } from '@/lib/patient-utils';

interface PatientListViewProps {
  patients: DentistPatient[];
  patientFlags: Record<string, PatientFlags>;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedPatientId?: string;
  onSelectPatient: (patient: DentistPatient) => void;
  loading?: boolean;
  businessId?: string;
  dentistId?: string;
  onPatientAdded?: () => void;
}

export function PatientListView({
  patients,
  patientFlags,
  searchTerm,
  onSearchChange,
  selectedPatientId,
  onSelectPatient,
  loading = false,
  businessId,
  dentistId,
  onPatientAdded
}: PatientListViewProps) {
  // Filter patients based on search
  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) return patients;
    const term = searchTerm.toLowerCase();
    return patients.filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(term) ||
      p.email?.toLowerCase().includes(term) ||
      p.phone?.includes(term)
    );
  }, [patients, searchTerm]);

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <span>Patients</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-4 space-y-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span>Patients</span>
          </div>
          <div className="flex items-center gap-2">
            {businessId && dentistId && onPatientAdded && (
              <AddPatientDialog
                businessId={businessId}
                dentistId={dentistId}
                onPatientAdded={onPatientAdded}
              />
            )}
            <Badge variant="secondary" className="font-normal text-xs">
              {patients.length}
            </Badge>
          </div>
        </CardTitle>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-0">
        {filteredPatients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground px-4">
            <Users className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm font-medium">
              {searchTerm ? 'No matching patients' : 'No patients yet'}
            </p>
            <p className="text-xs mt-1 text-center">
              {searchTerm ? `No results for "${searchTerm}"` : 'Add your first patient to get started'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredPatients.map((patient) => {
              const flags = patientFlags[patient.id];
              const age = getAge(patient.date_of_birth);
              const hasRisk = hasMedicalRisk(patient.medical_history);
              const isSelected = selectedPatientId === patient.id;

              return (
                <button
                  key={patient.id}
                  onClick={() => onSelectPatient(patient)}
                  className={cn(
                    "w-full text-left p-4 transition-all focus:outline-none",
                    "hover:bg-muted/50",
                    isSelected && "bg-primary/5 border-l-2 border-l-primary shadow-sm"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar with risk indicator */}
                    <div className="relative">
                      <Avatar className="h-11 w-11 border border-border/50">
                        <AvatarImage src={patient.profile_picture_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                          {getInitials(patient.first_name, patient.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      {hasRisk && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                          <AlertTriangle className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name + Age */}
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {patient.first_name} {patient.last_name}
                        </span>
                        {age && (
                          <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                            {age}y
                          </span>
                        )}
                      </div>

                      {/* Visit info */}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        {flags?.lastVisitDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 opacity-70" />
                            {format(new Date(flags.lastVisitDate), 'MMM d')}
                          </span>
                        )}
                        {flags?.nextAppointmentDate && (
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(flags.nextAppointmentDate), 'MMM d')}
                          </span>
                        )}
                        {flags?.completedAppointments && flags.completedAppointments > 0 && (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 opacity-70" />
                            {flags.completedAppointments} visits
                          </span>
                        )}
                      </div>

                      {/* Status badges - compact row */}
                      {(flags?.hasUnpaidBalance || flags?.hasActiveTreatmentPlan) && (
                        <div className="flex items-center gap-1.5 mt-2">
                          {flags?.hasActiveTreatmentPlan && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal">
                              Active Plan
                            </Badge>
                          )}
                          {flags?.hasUnpaidBalance && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 font-normal">
                              €{((flags.outstandingCents || 0) / 100).toFixed(0)} due
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
