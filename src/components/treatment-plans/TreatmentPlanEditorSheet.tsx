/**
 * TreatmentPlanEditorSheet - Full-screen modal/sheet for editing treatment plans
 * 
 * Opens from the summary card. Contains all editing functionality.
 * Mobile-native feel with clear hierarchy.
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  BookTemplate,
  AlertTriangle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  TreatmentPlanItem,
  TreatmentPlanStatus,
  formatCurrency,
  formatPlanStatus,
  getPlanStatusColor,
} from "./types";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface EditableItem {
  id: string;
  name: string;
  procedure_code: string;
  tooth: string;
  qty: number;
  unit_price_cents: number;
  description: string;
  sort_order: number;
}

interface TreatmentPlanEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  patientId: string;
  dentistId: string;
  businessId: string;
  existingPlanId?: string | null;
  isEditable: boolean;
  onPlanCreated?: (planId: string) => void;
  onPlanUpdated?: () => void;
}

export function TreatmentPlanEditorSheet({
  open,
  onOpenChange,
  appointmentId,
  patientId,
  dentistId,
  businessId,
  existingPlanId,
  isEditable,
  onPlanCreated,
  onPlanUpdated,
}: TreatmentPlanEditorSheetProps) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<EditableItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(existingPlanId || null);
  const [planStatus, setPlanStatus] = useState<TreatmentPlanStatus>("draft");
  const [planVersion, setPlanVersion] = useState(1);
  const [showVersionWarning, setShowVersionWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<"save" | "propose" | null>(null);

  // Sync existingPlanId when prop changes
  useEffect(() => {
    setCurrentPlanId(existingPlanId || null);
  }, [existingPlanId]);

  // Fetch existing plan if we have one
  const { data: existingPlan, isLoading: loadingPlan } = useQuery({
    queryKey: ["treatment-plan-editor", currentPlanId],
    queryFn: async () => {
      if (!currentPlanId) return null;

      const { data: plan, error: planError } = await supabase
        .from("treatment_plans_decrypted")
        .select("*")
        .eq("id", currentPlanId)
        .single();

      if (planError) throw planError;

      const { data: planItems, error: itemsError } = await supabase
        .from("treatment_plan_items")
        .select("*")
        .eq("treatment_plan_id", currentPlanId)
        .order("sort_order", { ascending: true });

      if (itemsError) throw itemsError;

      return { ...plan, items: planItems || [] };
    },
    enabled: !!currentPlanId && open,
  });

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: ["treatment-templates", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treatment_templates")
        .select("*")
        .eq("business_id", businessId)
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: isEditable && open,
  });

  // Initialize form when plan loads or sheet opens
  useEffect(() => {
    if (existingPlan) {
      setTitle(existingPlan.title || "");
      setNotes(existingPlan.notes || "");
      setPlanStatus(existingPlan.status as TreatmentPlanStatus);
      setPlanVersion(existingPlan.version || 1);
      setItems(
        existingPlan.items.map((item: TreatmentPlanItem) => ({
          id: item.id,
          name: item.name,
          procedure_code: item.procedure_code || "",
          tooth: item.tooth || "",
          qty: item.qty,
          unit_price_cents: item.unit_price_cents,
          description: item.description || "",
          sort_order: item.sort_order,
        }))
      );
    } else if (!currentPlanId) {
      // Reset form for new plan
      setTitle("");
      setNotes("");
      setItems([]);
      setPlanStatus("draft");
      setPlanVersion(1);
    }
  }, [existingPlan, currentPlanId, open]);

  const totalCents = useMemo(() => {
    return items.reduce((sum, item) => sum + item.unit_price_cents * item.qty, 0);
  }, [items]);

  const handleAddItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        id: generateId(),
        name: "",
        procedure_code: "",
        tooth: "",
        qty: 1,
        unit_price_cents: 0,
        description: "",
        sort_order: prev.length,
      },
    ]);
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleUpdateItem = useCallback(
    (id: string, field: keyof EditableItem, value: string | number) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
      );
    },
    []
  );

  const handleApplyTemplate = useCallback(
    (templateId: string) => {
      const template = templates?.find((t) => t.id === templateId);
      if (!template) return;

      const templateItems = (template.default_items as any[]) || [];
      const newItems: EditableItem[] = templateItems.map((item, index) => ({
        id: generateId(),
        name: item.name || "",
        procedure_code: item.procedure_code || "",
        tooth: item.tooth || "",
        qty: item.qty || 1,
        unit_price_cents: item.unit_price_cents || 0,
        description: item.description || "",
        sort_order: items.length + index,
      }));

      setItems((prev) => [...prev, ...newItems]);
      if (!title) {
        setTitle(template.name);
      }
      toast.success(`Applied template: ${template.name}`);
    },
    [templates, items.length, title]
  );

  const needsVersioning = planStatus === "completed";

  const handleSave = useCallback(async () => {
    if (items.length === 0) {
      toast.error("Please add at least one treatment item");
      return;
    }
    if (needsVersioning) {
      setPendingAction("save");
      setShowVersionWarning(true);
      return;
    }
    await performSave("proposed");
  }, [items, needsVersioning]);

  const performSave = async (
    newStatus: TreatmentPlanStatus,
    createNewVersion = false
  ) => {
    setSaving(true);
    try {
      let planId = currentPlanId;

      if (createNewVersion && currentPlanId) {
        await supabase
          .from("treatment_plans")
          .update({ status: "superseded" })
          .eq("id", currentPlanId);

        planId = null;
      }

      if (!planId) {
        const { data: newPlan, error: planError } = await supabase
          .from("treatment_plans")
          .insert({
            patient_id: patientId,
            dentist_id: dentistId,
            business_id: businessId,
            title: title.trim() || "Treatment Plan",
            notes: notes.trim() || null,
            status: newStatus,
            version: createNewVersion ? planVersion + 1 : 1,
            currency: "USD",
            total_estimated_cents: totalCents,
            created_from_appointment_id: appointmentId,
            created_by_dentist_id: dentistId,
          })
          .select()
          .single();

        if (planError) throw planError;
        planId = newPlan.id;
        setCurrentPlanId(planId);
        setPlanVersion(newPlan.version);
      } else {
        const { error: updateError } = await supabase
          .from("treatment_plans")
          .update({
            title: title.trim() || "Treatment Plan",
            notes: notes.trim() || null,
            status: newStatus,
            total_estimated_cents: totalCents,
          })
          .eq("id", planId);

        if (updateError) throw updateError;
      }

      await supabase
        .from("treatment_plan_items")
        .delete()
        .eq("treatment_plan_id", planId);

      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          treatment_plan_id: planId,
          name: item.name,
          procedure_code: item.procedure_code || null,
          tooth: item.tooth || null,
          qty: item.qty,
          unit_price_cents: item.unit_price_cents,
          line_total_cents: item.unit_price_cents * item.qty,
          description: item.description || null,
          sort_order: index,
        }));

        const { error: itemsError } = await supabase
          .from("treatment_plan_items")
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      await supabase
        .from("appointments")
        .update({ treatment_plan_id: planId })
        .eq("id", appointmentId);

      setPlanStatus(newStatus);
      queryClient.invalidateQueries({ queryKey: ["treatment-plan-editor"] });
      queryClient.invalidateQueries({ queryKey: ["treatment-plan-summary"] });
      queryClient.invalidateQueries({ queryKey: ["patient-treatment-plans"] });
      queryClient.invalidateQueries({ queryKey: ["appointment"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });

      if (!currentPlanId || createNewVersion) {
        onPlanCreated?.(planId!);
        toast.success(createNewVersion ? "New version created" : "Treatment plan created");
      } else {
        onPlanUpdated?.();
        toast.success(
          newStatus === "proposed"
            ? "Treatment plan proposed to patient"
            : "Treatment plan saved"
        );
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving treatment plan:", error);
      const errorMessage = error?.message || error?.details || "Failed to save treatment plan";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleVersionConfirm = async () => {
    setShowVersionWarning(false);
    await performSave("proposed", true);
    setPendingAction(null);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] sm:h-[85vh] p-0 rounded-t-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
            <SheetHeader className="space-y-0">
              <SheetTitle className="flex items-center gap-2">
                Treatment Plan
                {currentPlanId && (
                  <Badge
                    variant="outline"
                    className={cn("text-xs", getPlanStatusColor(planStatus))}
                  >
                    {formatPlanStatus(planStatus)}
                  </Badge>
                )}
                {planVersion > 1 && (
                  <Badge variant="secondary" className="text-xs">
                    v{planVersion}
                  </Badge>
                )}
              </SheetTitle>
            </SheetHeader>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {loadingPlan ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Content */}
              <ScrollArea className="h-[calc(90vh-140px)] sm:h-[calc(85vh-140px)]">
                <div className="p-4 space-y-6">
                  {/* Plan Name (optional, low emphasis) */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="plan-title"
                      className="text-xs text-muted-foreground"
                    >
                      Plan name (optional)
                    </Label>
                    <Input
                      id="plan-title"
                      placeholder="e.g., Crown + Root Canal"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={!isEditable}
                      className="bg-muted/30"
                    />
                  </div>

                  {/* Template Selector */}
                  {isEditable && templates && templates.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Apply template
                      </Label>
                      <Select onValueChange={handleApplyTemplate}>
                        <SelectTrigger className="bg-muted/30">
                          <SelectValue placeholder="Choose a template..." />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              <div className="flex items-center gap-2">
                                <BookTemplate className="h-3 w-3" />
                                {t.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Separator />

                  {/* Treatment Items */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Treatment Items</Label>
                      {isEditable && (
                        <Button variant="outline" size="sm" onClick={handleAddItem}>
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Add item
                        </Button>
                      )}
                    </div>

                    {items.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground mb-3">
                          No treatment items yet
                        </p>
                        {isEditable && (
                          <Button variant="outline" size="sm" onClick={handleAddItem}>
                            <Plus className="h-4 w-4 mr-1.5" />
                            Add treatment item
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 bg-muted/30 rounded-lg space-y-2"
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-1 space-y-2">
                                <Input
                                  placeholder="Treatment name"
                                  value={item.name}
                                  onChange={(e) =>
                                    handleUpdateItem(item.id, "name", e.target.value)
                                  }
                                  disabled={!isEditable}
                                  className="font-medium"
                                />
                                <div className="grid grid-cols-3 gap-2">
                                  <Input
                                    placeholder="Tooth"
                                    value={item.tooth}
                                    onChange={(e) =>
                                      handleUpdateItem(item.id, "tooth", e.target.value)
                                    }
                                    disabled={!isEditable}
                                  />
                                  <Input
                                    type="number"
                                    placeholder="Qty"
                                    value={item.qty}
                                    onChange={(e) =>
                                      handleUpdateItem(
                                        item.id,
                                        "qty",
                                        parseInt(e.target.value) || 1
                                      )
                                    }
                                    disabled={!isEditable}
                                    min={1}
                                  />
                                  <Input
                                    type="number"
                                    placeholder="Price"
                                    value={(item.unit_price_cents / 100).toFixed(2)}
                                    onChange={(e) =>
                                      handleUpdateItem(
                                        item.id,
                                        "unit_price_cents",
                                        Math.round(parseFloat(e.target.value || "0") * 100)
                                      )
                                    }
                                    disabled={!isEditable}
                                    min={0}
                                    step={0.01}
                                  />
                                </div>
                              </div>
                              {isEditable && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                  onClick={() => handleRemoveItem(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            {/* Line total */}
                            <div className="text-right text-sm text-muted-foreground">
                              Subtotal: {formatCurrency(item.unit_price_cents * item.qty, "USD")}
                            </div>
                          </div>
                        ))}

                        {/* Total */}
                        <div className="flex justify-between items-center pt-3 border-t font-medium">
                          <span>Estimated Total</span>
                          <span className="text-lg">{formatCurrency(totalCents, "USD")}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <Label htmlFor="plan-notes" className="text-sm font-medium">
                      Notes for patient
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      This will be visible to the patient
                    </p>
                    <Textarea
                      id="plan-notes"
                      placeholder="Add any notes for the patient..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={!isEditable}
                      className="bg-muted/30 min-h-[80px]"
                    />
                  </div>
                </div>
              </ScrollArea>

              {/* Actions Footer */}
              {isEditable && (
                <div className="p-4 border-t bg-background sticky bottom-0 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving || items.length === 0}
                    className="flex-1"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Plan
                  </Button>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Version Warning Dialog */}
      <AlertDialog open={showVersionWarning} onOpenChange={setShowVersionWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Create New Version?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This plan has already been{" "}
              {planStatus === "proposed" ? "proposed to the patient" : "completed"}.
              Making changes will create a new version (v{planVersion + 1}) and
              mark the current version as superseded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAction(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleVersionConfirm}>
              Create New Version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
