/**
 * AppointmentLinker - Component for linking appointments to treatment plans
 * 
 * Allows dentist to:
 * - View appointments linked to a plan
 * - Link new appointments to an existing plan
 * - Unlink appointments from a plan
 */

import React, { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Link2, 
  Unlink, 
  Calendar, 
  ClipboardList,
  Loader2,
  CheckCircle2,
  Clock,
  ChevronRight
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AppointmentLinkerProps {
  appointmentId: string;
  patientId: string;
  businessId: string;
  currentPlanId?: string | null;
  onPlanLinked?: (planId: string | null) => void;
}

export function AppointmentLinker({
  appointmentId,
  patientId,
  businessId,
  currentPlanId,
  onPlanLinked,
}: AppointmentLinkerProps) {
  const queryClient = useQueryClient();
  const [linking, setLinking] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  // Fetch available treatment plans for this patient in this business
  const { data: availablePlans, isLoading: loadingPlans } = useQuery({
    queryKey: ["available-treatment-plans", patientId, businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treatment_plans_decrypted")
        .select(`
          id,
          title,
          status,
          version,
          created_at,
          total_estimated_cents
        `)
        .eq("patient_id", patientId)
        .eq("business_id", businessId)
        .in("status", ["draft", "proposed"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: dialogOpen,
  });

  // Fetch current linked plan details if exists
  const { data: linkedPlan, isLoading: loadingLinkedPlan } = useQuery({
    queryKey: ["linked-treatment-plan", currentPlanId],
    queryFn: async () => {
      if (!currentPlanId) return null;

      const { data, error } = await supabase
        .from("treatment_plans_decrypted")
        .select("id, title, status, version")
        .eq("id", currentPlanId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!currentPlanId,
  });

  // Link appointment to plan
  const handleLinkToPlan = useCallback(async () => {
    if (!selectedPlanId) return;

    setLinking(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ treatment_plan_id: selectedPlanId })
        .eq("id", appointmentId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["linked-treatment-plan"] });
      onPlanLinked?.(selectedPlanId);
      toast.success("Appointment linked to treatment plan");
      setDialogOpen(false);
      setSelectedPlanId("");
    } catch (error) {
      console.error("Error linking appointment:", error);
      toast.error("Failed to link appointment");
    } finally {
      setLinking(false);
    }
  }, [appointmentId, selectedPlanId, queryClient, onPlanLinked]);

  // Unlink appointment from plan
  const handleUnlink = useCallback(async () => {
    setLinking(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ treatment_plan_id: null })
        .eq("id", appointmentId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["linked-treatment-plan"] });
      onPlanLinked?.(null);
      toast.success("Appointment unlinked from treatment plan");
    } catch (error) {
      console.error("Error unlinking appointment:", error);
      toast.error("Failed to unlink appointment");
    } finally {
      setLinking(false);
    }
  }, [appointmentId, queryClient, onPlanLinked]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "proposed":
        return <Badge variant="default" className="bg-blue-500">Proposed</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-emerald-500">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // If currently linked to a plan
  if (currentPlanId && linkedPlan) {
    return (
      <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <ClipboardList className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{linkedPlan.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {getStatusBadge(linkedPlan.status)}
              {linkedPlan.version > 1 && (
                <span className="text-xs text-muted-foreground">v{linkedPlan.version}</span>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleUnlink}
          disabled={linking}
          className="text-muted-foreground hover:text-destructive"
        >
          {linking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Unlink className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  }

  // Link to plan dialog
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Link2 className="h-4 w-4 mr-2" />
          Link to Treatment Plan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link to Treatment Plan</DialogTitle>
          <DialogDescription>
            Link this appointment to an existing treatment plan. This groups related
            appointments together for the patient's records.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loadingPlans ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : availablePlans && availablePlans.length > 0 ? (
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a treatment plan" />
              </SelectTrigger>
              <SelectContent>
                {availablePlans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      <span>{plan.title}</span>
                      {getStatusBadge(plan.status)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No treatment plans available for this patient.
              Create one from this appointment first.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleLinkToPlan} 
            disabled={!selectedPlanId || linking}
          >
            {linking ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4 mr-2" />
            )}
            Link Appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * LinkedAppointmentsList - Shows appointments linked to a treatment plan
 * Used in TreatmentPlanDetailSheet for patient view
 */
interface LinkedAppointmentsListProps {
  planId: string;
  onAppointmentClick?: (appointmentId: string) => void;
  /** Called when clicking an actionable appointment (upcoming/needs completion) to enter consultation mode */
  onEnterConsultation?: (appointmentId: string) => void;
}

export function LinkedAppointmentsList({
  planId,
  onAppointmentClick,
  onEnterConsultation,
}: LinkedAppointmentsListProps) {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ["plan-linked-appointments", planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments_decrypted")
        .select('id, appointment_date, reason, status, completed_at, dentist_id')
        .eq("treatment_plan_id", planId)
        .order("appointment_date", { ascending: true });

      if (error) throw error;

      // Fetch dentist data separately (views don't support PostgREST joins)
      const dentistIds = [...new Set((data || []).map(a => a.dentist_id).filter(Boolean))];
      const { data: dentists } = dentistIds.length > 0
        ? await supabase.from('dentists').select('id, first_name, last_name').in('id', dentistIds)
        : { data: [] };
      const dentistsMap = new Map((dentists || []).map(d => [d.id, d]));

      return (data || []).map(apt => ({
        ...apt,
        dentists: dentistsMap.get(apt.dentist_id) || undefined,
      }));
    },
    enabled: !!planId,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  if (!appointments || appointments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No appointments linked to this plan yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {appointments.map((apt: any) => {
        const dentistData = apt.dentists;
        const dentistName = dentistData
          ? `Dr. ${dentistData.first_name || ""} ${dentistData.last_name || ""}`.trim()
          : "";
        const isCompleted = apt.status === "completed";
        const isCancelled = apt.status === "cancelled";
        const isPending = apt.status === "pending";
        const isUpcoming = new Date(apt.appointment_date) > new Date() && !isCancelled;
        const isPast = new Date(apt.appointment_date) < new Date();
        
        // Actionable = can enter consultation (upcoming confirmed, or past not completed)
        const isActionable = !isCompleted && !isCancelled && !isPending && (isUpcoming || isPast);
        
        const handleClick = () => {
          // If actionable and onEnterConsultation is provided, enter consultation directly
          if (isActionable && onEnterConsultation) {
            onEnterConsultation(apt.id);
          } else if (onAppointmentClick) {
            onAppointmentClick(apt.id);
          }
        };
        
        const hasClickHandler = (isActionable && onEnterConsultation) || onAppointmentClick;

        return (
          <div
            key={apt.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-colors",
              hasClickHandler && "cursor-pointer hover:bg-muted/50"
            )}
            onClick={handleClick}
            role={hasClickHandler ? "button" : undefined}
            tabIndex={hasClickHandler ? 0 : undefined}
          >
            <div className={cn(
              "p-2 rounded-full",
              isCompleted && "bg-emerald-100 dark:bg-emerald-900/30",
              isUpcoming && !isCompleted && "bg-blue-100 dark:bg-blue-900/30",
              !isCompleted && !isUpcoming && "bg-muted"
            )}>
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : isUpcoming ? (
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <Calendar className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {apt.reason || "Appointment"}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{format(parseISO(apt.appointment_date), "MMM d, yyyy")}</span>
                {dentistName && (
                  <>
                    <span>•</span>
                    <span>{dentistName}</span>
                  </>
                )}
              </div>
            </div>

            <Badge 
              variant="outline" 
              className={cn(
                isCompleted && "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
                isUpcoming && !isCompleted && "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
                isCancelled && "bg-gray-100 text-gray-600 border-gray-200",
                isPending && "bg-amber-100 text-amber-800 border-amber-200"
              )}
            >
              {isCompleted ? "Completed" : isPending ? "Pending" : isUpcoming ? "Upcoming" : isCancelled ? "Cancelled" : "Needs Completion"}
            </Badge>

            {hasClickHandler && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        );
      })}
    </div>
  );
}
