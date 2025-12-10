import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBusinessTemplate } from "@/hooks/useBusinessTemplate";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { Patient } from "@/types/patient";
import { PatientList } from "@/components/patient-management/PatientList";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";

// Lazy load details
const PatientDetails = lazy(() => import("@/components/patient-management/PatientDetails").then(module => ({ default: module.PatientDetails })));

interface PatientManagementProps {
  dentistId: string;
}

export function PatientManagement({ dentistId }: PatientManagementProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Flags for badges in the list
  const [patientFlags, setPatientFlags] = useState<Record<string, {
    hasUnpaidBalance: boolean;
    outstandingCents?: number;
    hasUpcomingAppointment: boolean;
    hasActiveTreatmentPlan: boolean;
    lastVisitDate?: string;
    nextAppointmentDate?: string;
    nextAppointmentStatus?: string;
  }>>({});

  const { toast } = useToast();
  const { businessId } = useBusinessContext();

  const fetchPatients = async () => {
    try {
      setLoading(true);

      // Fetch patients profile data
      const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .order('first_name');

      if (error) throw error;
      setPatients(users || []);

      // In a full implementation, we'd fetch flags here.
      // For performance optimization, we skip heavy per-patient aggregations on initial load.

    } catch (error) {
      logger.error('Error fetching patients:', error);
      toast({
        title: "Error",
        description: "Failed to load patients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [dentistId, businessId]);

  // Memoized filter to prevent re-calculations
  const filteredPatients = useMemo(() => {
    if (!searchTerm) return patients;
    const lower = searchTerm.toLowerCase();
    return patients.filter(p =>
      p.first_name?.toLowerCase().includes(lower) ||
      p.last_name?.toLowerCase().includes(lower) ||
      p.email?.toLowerCase().includes(lower) ||
      p.phone?.includes(searchTerm)
    );
  }, [patients, searchTerm]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-100px)]">
      {/* Patient List (Sidebar) */}
      <PatientList
        patients={patients}
        filteredPatients={filteredPatients}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedPatientId={selectedPatient?.id}
        onSelectPatient={setSelectedPatient}
        patientFlags={patientFlags}
      />

      {/* Main Content Area */}
      <div className="lg:col-span-2 h-full overflow-y-auto pr-1">
        {selectedPatient ? (
          <Suspense fallback={<Skeleton className="h-full w-full rounded-xl" />}>
            <PatientDetails
              patient={selectedPatient}
              dentistId={dentistId}
              patientFlags={patientFlags[selectedPatient.id]}
            />
          </Suspense>
        ) : (
          <div className="bg-muted/10 border-dashed border-2 border-muted rounded-xl h-full flex items-center justify-center text-muted-foreground">
            Select a patient to view details
          </div>
        )}
      </div>
    </div>
  );
}