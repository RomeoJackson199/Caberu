import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Pill, Heart, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
        .from('secure_patient_allergies_view' as any)
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
        .from('secure_notes_view' as any)
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

  // Check for severe allergies for extra emphasis
  const hasSevereAllergies = allergies?.some(a => a.severity === 'severe') || false;

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
      <Card className="border-emerald-200/50 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-950/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <Shield className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="text-emerald-700 dark:text-emerald-300 font-medium">No allergies or medical alerts on file</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "border-2",
      hasSevereAllergies
        ? "border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/30"
        : "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30"
    )}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-9 w-9 rounded-full flex items-center justify-center",
            hasSevereAllergies
              ? "bg-red-100 dark:bg-red-900/50"
              : "bg-amber-100 dark:bg-amber-900/50"
          )}>
            <AlertTriangle className={cn(
              "h-5 w-5",
              hasSevereAllergies ? "text-red-600" : "text-amber-600"
            )} />
          </div>
          <h4 className={cn(
            "font-semibold text-base",
            hasSevereAllergies ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"
          )}>
            {hasSevereAllergies ? "⚠️ CRITICAL SAFETY ALERTS" : "Patient Safety Alerts"}
          </h4>
        </div>

        {/* Allergies */}
        {hasAllergies && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Pill className="h-4 w-4" />
              <span className="text-foreground">Allergies</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {allergies.map((allergy) => (
                <Badge
                  key={allergy.id}
                  variant="outline"
                  className={cn(
                    "text-sm font-semibold py-1 px-3",
                    allergy.severity === 'severe'
                      ? 'border-2 border-red-400 text-red-800 bg-red-100 dark:border-red-700 dark:text-red-200 dark:bg-red-950/50'
                      : allergy.severity === 'moderate'
                      ? 'border-orange-300 text-orange-800 bg-orange-100 dark:border-orange-700 dark:text-orange-200 dark:bg-orange-950/50'
                      : 'border-yellow-300 text-yellow-800 bg-yellow-100 dark:border-yellow-700 dark:text-yellow-200 dark:bg-yellow-950/50'
                  )}
                >
                  {allergy.severity === 'severe' && '⚠️ '}
                  {allergy.allergy_name}
                  {allergy.severity === 'severe' && ' - SEVERE'}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Medical Conditions */}
        {hasMedicalNotes && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Heart className="h-4 w-4" />
              <span className="text-foreground">Medical Conditions</span>
            </div>
            <div className="bg-white/50 dark:bg-black/20 rounded-md p-3 space-y-1.5">
              {medicalNotes.slice(0, 3).map((note) => (
                <div key={note.id} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span className="text-foreground font-medium">
                    {note.title || note.content.slice(0, 60)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
