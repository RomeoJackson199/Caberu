/**
 * TreatmentPlanDetailSheet - Read-only detail view for patients
 * 
 * Shows:
 * - Clinic name (very visible)
 * - Dentist name
 * - Plan status
 * - List of items with details
 * - Total estimated cost
 * - Notes
 */

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, 
  User, 
  Calendar, 
  FileText, 
  ClipboardList,
  DollarSign,
  Hash,
  Circle,
  CalendarDays
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { LinkedAppointmentsList } from "./AppointmentLinker";
import { 
  TreatmentPlan, 
  TreatmentPlanItem,
  formatPlanStatus, 
  getPlanStatusColor,
  formatCurrency,
  calculatePlanTotal
} from "./types";

interface TreatmentPlanDetailSheetProps {
  planId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAppointmentClick?: (appointmentId: string) => void;
  /** Called when clicking an actionable appointment to enter consultation mode directly */
  onEnterConsultation?: (appointmentId: string) => void;
}

export function TreatmentPlanDetailSheet({ 
  planId, 
  open, 
  onOpenChange,
  onAppointmentClick,
  onEnterConsultation 
}: TreatmentPlanDetailSheetProps) {
  const { data: plan, isLoading } = useQuery({
    queryKey: ["treatment-plan-detail", planId],
    queryFn: async () => {
      if (!planId) return null;
      
      // Fetch plan first (no inner joins to avoid RLS issues)
      const { data: planData, error: planError } = await supabase
        .from("treatment_plans_decrypted")
        .select("*")
        .eq("id", planId)
        .single();

      if (planError) throw planError;
      if (!planData) return null;

      // Fetch items, business, and dentist info separately
      const [itemsResult, businessResult, dentistResult] = await Promise.all([
        supabase
          .from("treatment_plan_items")
          .select("*")
          .eq("treatment_plan_id", planId)
          .order("sort_order", { ascending: true }),
        planData.business_id 
          ? supabase.from("businesses").select("id, name").eq("id", planData.business_id).single()
          : { data: null, error: null },
        planData.dentist_id
          ? supabase.from("dentists").select("id, first_name, last_name").eq("id", planData.dentist_id).single()
          : { data: null, error: null }
      ]);

      return {
        ...planData,
        items: itemsResult.data || [],
        businesses: businessResult.data || null,
        dentists: dentistResult.data || null,
      } as TreatmentPlan;
    },
    enabled: !!planId && open,
  });

  const dentistName = plan?.dentists
    ? `Dr. ${plan.dentists.first_name || ''} ${plan.dentists.last_name || ''}`.trim()
    : undefined;

  const totalCents = plan?.items 
    ? calculatePlanTotal(plan.items as TreatmentPlanItem[])
    : (plan?.total_estimated_cents || 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-4 sm:p-6 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Treatment Plan
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-4 sm:p-6 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : plan ? (
            <div className="p-4 sm:p-6 space-y-4">
              {/* Header Info */}
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">{plan.title}</h2>
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={getPlanStatusColor(plan.status)}>
                    {formatPlanStatus(plan.status)}
                  </Badge>
                  {plan.version > 1 && (
                    <Badge variant="secondary" className="text-xs">
                      Version {plan.version}
                    </Badge>
                  )}
                </div>

                {/* Clinic Badge - Very Visible */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <span className="font-medium text-primary">
                        {plan.businesses?.name || 'Clinic'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Meta info */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {dentistName && (
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>{dentistName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{format(parseISO(plan.created_at), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Treatment Items */}
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Treatment Items
                </h3>

                {plan.items && plan.items.length > 0 ? (
                  <div className="space-y-2">
                    {plan.items.map((item: TreatmentPlanItem) => (
                      <Card key={item.id} className="bg-muted/50">
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{item.name}</p>
                              <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                                {item.tooth && (
                                  <span className="flex items-center gap-0.5">
                                    <Circle className="h-3 w-3" />
                                    Tooth {item.tooth}
                                  </span>
                                )}
                                {item.procedure_code && (
                                  <span className="flex items-center gap-0.5">
                                    <Hash className="h-3 w-3" />
                                    {item.procedure_code}
                                  </span>
                                )}
                                <span>Qty: {item.qty}</span>
                              </div>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-semibold">
                                {formatCurrency(item.line_total_cents, plan.currency)}
                              </p>
                              {item.qty > 1 && (
                                <p className="text-xs text-muted-foreground">
                                  {formatCurrency(item.unit_price_cents, plan.currency)} each
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No items in this plan.</p>
                )}
              </div>

              <Separator />

              {/* Linked Appointments */}
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Linked Appointments
                </h3>
                <LinkedAppointmentsList 
                  planId={plan.id} 
                  onAppointmentClick={onAppointmentClick}
                  onEnterConsultation={onEnterConsultation}
                />
              </div>

              <Separator />

              {/* Total */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Estimated Total
                    </span>
                    <span className="text-xl font-bold text-primary">
                      {formatCurrency(totalCents, plan.currency)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {plan.notes && (
                <div className="space-y-2">
                  <h3 className="font-medium">Notes</h3>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3">
                      <p className="text-sm whitespace-pre-wrap">{plan.notes}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Description */}
              {plan.description && (
                <div className="space-y-2">
                  <h3 className="font-medium">Description</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {plan.description}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 sm:p-6 text-center text-muted-foreground">
              Treatment plan not found.
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
