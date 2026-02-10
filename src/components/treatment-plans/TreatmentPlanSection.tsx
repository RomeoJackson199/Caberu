/**
 * TreatmentPlanSection - Wrapper component for Appointment Detail
 * 
 * Combines the summary card with the editor sheet and link existing sheet.
 * This is the main entry point used in DentistAppointmentDetail.
 */

import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TreatmentPlanSummaryCard } from "./TreatmentPlanSummaryCard";
import { TreatmentPlanEditorSheet } from "./TreatmentPlanEditorSheet";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link, ClipboardList, X } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatPlanStatus, getPlanStatusColor } from "./types";

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
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);
  const [linking, setLinking] = useState(false);

  // Track the effective plan ID locally so linking updates the UI immediately
  // without waiting for the parent's appointment prop to re-fetch
  const [effectivePlanId, setEffectivePlanId] = useState(existingPlanId);

  // Sync with parent prop when it changes (e.g., parent re-fetches appointment)
  useEffect(() => {
    setEffectivePlanId(existingPlanId);
  }, [existingPlanId]);

  // When a plan is created from the editor, update local state immediately
  // so the summary card reflects the link without waiting for parent re-fetch
  const handlePlanCreated = (planId: string) => {
    setEffectivePlanId(planId);
    queryClient.invalidateQueries({ queryKey: ["treatment-plan-summary"] });
    queryClient.invalidateQueries({ queryKey: ["appointment"] });
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
    onPlanCreated?.(planId);
  };

  const handlePlanUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["treatment-plan-summary"] });
    queryClient.invalidateQueries({ queryKey: ["appointment"] });
    onPlanUpdated?.();
  };

  // Fetch plan summary for the card
  const { data: planSummary, isLoading } = useQuery({
    queryKey: ["treatment-plan-summary", effectivePlanId],
    queryFn: async () => {
      if (!effectivePlanId) return null;

      const { data: plan, error: planError } = await supabase
        .from("treatment_plans_decrypted")
        .select("id, title, status, version, total_estimated_cents, currency")
        .eq("id", effectivePlanId)
        .single();

      if (planError) throw planError;

      const { data: items, error: itemsError } = await supabase
        .from("treatment_plan_items")
        .select("id")
        .eq("treatment_plan_id", effectivePlanId);

      if (itemsError) throw itemsError;

      return { ...plan, items: items || [] };
    },
    enabled: !!effectivePlanId,
  });

  // Fetch existing plans for this patient in this business
  const { data: existingPlans, isLoading: loadingPlans } = useQuery({
    queryKey: ["patient-treatment-plans", patientId, businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treatment_plans_decrypted")
        .select(`
          id,
          title,
          status,
          version,
          total_estimated_cents,
          currency,
          created_at,
          treatment_plan_items(id)
        `)
        .eq("patient_id", patientId)
        .eq("business_id", businessId)
        .neq("status", "superseded")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: linkSheetOpen,
  });

  const handleLinkPlan = async (planId: string) => {
    setLinking(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ treatment_plan_id: planId })
        .eq("id", appointmentId);

      if (error) throw error;

      // Update local state immediately so the UI reflects the link
      setEffectivePlanId(planId);

      queryClient.invalidateQueries({ queryKey: ["treatment-plan-summary"] });
      queryClient.invalidateQueries({ queryKey: ["appointment"] });

      toast.success("Appointment linked to treatment plan");
      setLinkSheetOpen(false);
      onPlanCreated?.(planId);
    } catch (error) {
      console.error("Error linking plan:", error);
      toast.error("Failed to link treatment plan");
    } finally {
      setLinking(false);
    }
  };

  return (
    <>
      <TreatmentPlanSummaryCard
        existingPlan={planSummary ?? null}
        isLoading={isLoading}
        onOpenEditor={() => setEditorOpen(true)}
        onLinkExisting={() => setLinkSheetOpen(true)}
        isEditable={isEditable}
      />

      <TreatmentPlanEditorSheet
        open={editorOpen}
        onOpenChange={setEditorOpen}
        appointmentId={appointmentId}
        patientId={patientId}
        dentistId={dentistId}
        businessId={businessId}
        existingPlanId={effectivePlanId}
        isEditable={isEditable}
        onPlanCreated={handlePlanCreated}
        onPlanUpdated={handlePlanUpdated}
      />

      {/* Link Existing Plan Sheet */}
      <Sheet open={linkSheetOpen} onOpenChange={setLinkSheetOpen}>
        <SheetContent side="bottom" className="h-[70vh] sm:h-[60vh] p-0 rounded-t-xl">
          <div className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
            <SheetHeader className="space-y-0">
              <SheetTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                Link to Existing Plan
              </SheetTitle>
            </SheetHeader>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLinkSheetOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <ScrollArea className="h-[calc(70vh-80px)] sm:h-[calc(60vh-80px)]">
            <div className="p-4 space-y-3">
              {loadingPlans ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : existingPlans && existingPlans.length > 0 ? (
                existingPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="p-4 bg-muted/30 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                    onClick={() => handleLinkPlan(plan.id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <ClipboardList className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm truncate">
                              {plan.title || "Treatment Plan"}
                            </p>
                            <Badge
                              variant="outline"
                              className={`text-xs ${getPlanStatusColor(plan.status as any)}`}
                            >
                              {formatPlanStatus(plan.status as any)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {plan.treatment_plan_items?.length || 0} items • {formatCurrency(plan.total_estimated_cents, plan.currency)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={linking}
                        className="shrink-0"
                      >
                        {linking ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Link className="h-4 w-4 mr-1.5" />
                            Link
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No existing treatment plans for this patient
                  </p>
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={() => {
                      setLinkSheetOpen(false);
                      setEditorOpen(true);
                    }}
                  >
                    Create New Plan
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
