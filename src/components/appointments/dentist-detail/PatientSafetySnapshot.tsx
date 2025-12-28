import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Pill, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PatientSafetySnapshotProps {
  patientId: string;
}

/**
 * Patient Safety Snapshot - Read-only critical medical info
 * Purpose: Prevent clinical mistakes
 */
export function PatientSafetySnapshot({ patientId }: PatientSafetySnapshotProps) {
  // Fetch allergies
  const { data: allergies, isLoading: loadingAllergies } = useQuery({
    queryKey: ['patient-allergies', patientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('patient_allergies')
        .select('id, allergy_name, severity')
        .eq('patient_id', patientId);
      return data || [];
    },
    enabled: !!patientId,
  });

  // Fetch medical conditions from notes (type = 'medical_history')
  const { data: medicalNotes, isLoading: loadingNotes } = useQuery({
    queryKey: ['patient-medical-notes', patientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('notes')
        .select('id, content, title')
        .eq('patient_id', patientId)
        .eq('note_type', 'medical_history')
        .limit(5);
      return data || [];
    },
    enabled: !!patientId,
  });

  const isLoading = loadingAllergies || loadingNotes;
  const hasAllergies = allergies && allergies.length > 0;
  const hasMedicalNotes = medicalNotes && medicalNotes.length > 0;
  const hasAnyData = hasAllergies || hasMedicalNotes;

  if (isLoading) {
    return (
      <Card className="border-amber-200/50 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20">
        <CardContent className="p-4">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-6 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!hasAnyData) {
    return (
      <Card className="border-muted">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Heart className="h-4 w-4" />
            <span>No allergies or medical alerts on file</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200/50 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20">
      <CardContent className="p-4 space-y-3">
        <h4 className="font-medium text-foreground flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Patient Safety Alerts
        </h4>

        {/* Allergies */}
        {hasAllergies && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Pill className="h-3 w-3" />
              <span className="font-medium">Allergies</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allergies.map((allergy) => (
                <Badge
                  key={allergy.id}
                  variant="outline"
                  className={
                    allergy.severity === 'severe'
                      ? 'border-red-300 text-red-700 bg-red-50 dark:border-red-800 dark:text-red-300 dark:bg-red-950/30'
                      : allergy.severity === 'moderate'
                      ? 'border-orange-300 text-orange-700 bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:bg-orange-950/30'
                      : 'border-yellow-300 text-yellow-700 bg-yellow-50 dark:border-yellow-800 dark:text-yellow-300 dark:bg-yellow-950/30'
                  }
                >
                  {allergy.allergy_name}
                  {allergy.severity === 'severe' && ' ⚠️'}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Medical Conditions */}
        {hasMedicalNotes && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Heart className="h-3 w-3" />
              <span className="font-medium">Medical Notes</span>
            </div>
            <ul className="text-sm text-foreground space-y-1">
              {medicalNotes.slice(0, 3).map((note) => (
                <li key={note.id} className="truncate">
                  • {note.title || note.content.slice(0, 50)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
