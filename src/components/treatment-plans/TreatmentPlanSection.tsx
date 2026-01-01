/**
 * TreatmentPlanSection - Wrapper component for Appointment Detail
 * 
 * Combines the summary card with the editor sheet.
 * This is the main entry point used in DentistAppointmentDetail.
 */

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TreatmentPlanSummaryCard } from "./TreatmentPlanSummaryCard";
import { TreatmentPlanEditorSheet } from "./TreatmentPlanEditorSheet";

interface TreatmentPlanSectionProps {
  appointmentId: string;
  patientId: string;
  dentistId: string;
  businessId: string;
  existingPlanId?: string | null;
  isEditable: boolean;
  onPlanCreated?: (planId: string) => void;
  onPlanUpdated?: () => void;
}

export function TreatmentPlanSection({
  appointmentId,
  patientId,
  dentistId,
  businessId,
  existingPlanId,
  isEditable,
  onPlanCreated,
  onPlanUpdated,
}: TreatmentPlanSectionProps) {
  const [editorOpen, setEditorOpen] = useState(false);

  // Fetch plan summary for the card
  const { data: planSummary, isLoading } = useQuery({
    queryKey: ["treatment-plan-summary", existingPlanId],
    queryFn: async () => {
      if (!existingPlanId) return null;

      const { data: plan, error: planError } = await supabase
        .from("treatment_plans")
        .select("id, title, status, version, total_estimated_cents, currency")
        .eq("id", existingPlanId)
        .single();

      if (planError) throw planError;

      const { data: items, error: itemsError } = await supabase
        .from("treatment_plan_items")
        .select("id")
        .eq("treatment_plan_id", existingPlanId);

      if (itemsError) throw itemsError;

      return { ...plan, items: items || [] };
    },
    enabled: !!existingPlanId,
  });

  return (
    <>
      <TreatmentPlanSummaryCard
        existingPlan={planSummary ?? null}
        isLoading={isLoading}
        onOpenEditor={() => setEditorOpen(true)}
        isEditable={isEditable}
      />

      <TreatmentPlanEditorSheet
        open={editorOpen}
        onOpenChange={setEditorOpen}
        appointmentId={appointmentId}
        patientId={patientId}
        dentistId={dentistId}
        businessId={businessId}
        existingPlanId={existingPlanId}
        isEditable={isEditable}
        onPlanCreated={onPlanCreated}
        onPlanUpdated={onPlanUpdated}
      />
    </>
  );
}
