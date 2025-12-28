import { useMemo } from 'react';
import { format, differenceInYears } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Search, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { DentistPatient, PatientFlags } from './types';
import { cn } from '@/lib/utils';

interface PatientListViewProps {
  patients: DentistPatient[];
  patientFlags: Record<string, PatientFlags>;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedPatientId?: string;
  onSelectPatient: (patient: DentistPatient) => void;
  loading?: boolean;
}

export function PatientListView({
  patients,
  patientFlags,
  searchTerm,
  onSearchChange,
  selectedPatientId,
  onSelectPatient,
  loading = false
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

  const getAge = (dob?: string) => {
    if (!dob) return null;
    try {
      return differenceInYears(new Date(), new Date(dob));
    } catch {
      return null;
    }
  };

  const hasMedicalRisk = (patient: DentistPatient) => {
    const history = patient.medical_history?.toLowerCase() || '';
    return history.includes('allerg') || history.includes('condition') || history.includes('medication');
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <span>Patients</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span>Patients</span>
          </div>
          <Badge variant="secondary" className="font-normal">
            {patients.length}
          </Badge>
        </CardTitle>
        
        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-0">
        {filteredPatients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">No patients found</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredPatients.map((patient) => {
              const flags = patientFlags[patient.id];
              const age = getAge(patient.date_of_birth);
              const hasRisk = hasMedicalRisk(patient);
              const isSelected = selectedPatientId === patient.id;

              return (
                <button
                  key={patient.id}
                  onClick={() => onSelectPatient(patient)}
                  className={cn(
                    "w-full text-left p-4 hover:bg-muted/50 transition-colors focus:outline-none focus:bg-muted/50",
                    isSelected && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <Avatar className="h-11 w-11 flex-shrink-0">
                      <AvatarImage src={patient.profile_picture_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {patient.first_name?.[0]}{patient.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      {/* Name + Risk Icons */}
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {patient.first_name} {patient.last_name}
                        </span>
                        {age && (
                          <span className="text-xs text-muted-foreground">
                            {age}y
                          </span>
                        )}
                        {hasRisk && (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        )}
                      </div>

                      {/* Appointments info */}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {flags?.lastVisitDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last: {format(new Date(flags.lastVisitDate), 'MMM d')}
                          </span>
                        )}
                        {flags?.nextAppointmentDate && (
                          <span className="flex items-center gap-1 text-primary">
                            <Calendar className="h-3 w-3" />
                            Next: {format(new Date(flags.nextAppointmentDate), 'MMM d')}
                          </span>
                        )}
                      </div>

                      {/* Status badges */}
                      {(flags?.hasUnpaidBalance || flags?.hasActiveTreatmentPlan) && (
                        <div className="flex items-center gap-1.5 mt-2">
                          {flags?.hasActiveTreatmentPlan && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              Active Plan
                            </Badge>
                          )}
                          {flags?.hasUnpaidBalance && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              Balance Due
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
