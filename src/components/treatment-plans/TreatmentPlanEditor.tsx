/**
 * TreatmentPlanEditor - Dentist-facing component for creating/editing treatment plans
 * 
 * Used in Appointment Detail to:
 * - Create new treatment plans from an appointment
 * - Add/edit/remove items
 * - Save as draft or propose to patient
 * - Apply templates
 */

import React, { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  Save, 
  Send,
  Loader2,
  FileText,
  DollarSign,
  BookTemplate,
  Check,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Simple UUID generator for temporary IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
import { 
  TreatmentPlanItem, 
  TreatmentPlanStatus,
  formatCurrency,
  formatPlanStatus,
  getPlanStatusColor
} from "./types";

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

interface TreatmentPlanEditorProps {
  appointmentId: string;
  patientId: string;
  dentistId: string;
  businessId: string;
  existingPlanId?: string | null;
  isEditable: boolean;
  onPlanCreated?: (planId: string) => void;
  onPlanUpdated?: () => void;
}

export function TreatmentPlanEditor({
  appointmentId,
  patientId,
  dentistId,
  businessId,
  existingPlanId,
  isEditable,
  onPlanCreated,
  onPlanUpdated,
}: TreatmentPlanEditorProps) {
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<EditableItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(existingPlanId || null);
  const [planStatus, setPlanStatus] = useState<TreatmentPlanStatus>("draft");
  const [planVersion, setPlanVersion] = useState(1);
  const [showVersionWarning, setShowVersionWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<"save" | "propose" | null>(null);

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
    enabled: !!currentPlanId,
  });

  // Fetch available templates
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
    enabled: isEditable,
  });

  // Initialize form when plan data loads
  React.useEffect(() => {
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
    }
  }, [existingPlan]);

  // Calculate total
  const totalCents = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.unit_price_cents * item.qty), 0);
  }, [items]);

  // Add empty item
  const handleAddItem = useCallback(() => {
    setItems(prev => [
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

  // Remove item
  const handleRemoveItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  // Update item field
  const handleUpdateItem = useCallback((id: string, field: keyof EditableItem, value: string | number) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }, []);

  // Apply template
  const handleApplyTemplate = useCallback((templateId: string) => {
    const template = templates?.find(t => t.id === templateId);
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

    setItems(prev => [...prev, ...newItems]);
    if (!title) {
      setTitle(template.name);
    }
    toast.success(`Applied template: ${template.name}`);
  }, [templates, items.length, title]);

  // Check if plan needs versioning (editing a proposed/completed plan)
  const needsVersioning = planStatus === "proposed" || planStatus === "completed";

  // Save as draft
  const handleSaveDraft = useCallback(async () => {
    if (needsVersioning) {
      setPendingAction("save");
      setShowVersionWarning(true);
      return;
    }
    await performSave("draft");
  }, [needsVersioning]);

  // Propose to patient
  const handlePropose = useCallback(async () => {
    if (!title.trim()) {
      toast.error("Please enter a plan title");
      return;
    }
    if (items.length === 0) {
      toast.error("Please add at least one treatment item");
      return;
    }
    if (needsVersioning) {
      setPendingAction("propose");
      setShowVersionWarning(true);
      return;
    }
    await performSave("proposed");
  }, [title, items, needsVersioning]);

  // Perform the actual save/create operation
  const performSave = async (newStatus: TreatmentPlanStatus, createNewVersion = false) => {
    setSaving(true);
    try {
      let planId = currentPlanId;

      // If creating new version, mark old as superseded and create new
      if (createNewVersion && currentPlanId) {
        // Mark current as superseded
        await supabase
          .from("treatment_plans")
          .update({ status: "superseded" })
          .eq("id", currentPlanId);

        planId = null; // Force creation of new plan
      }

      if (!planId) {
        // Create new plan
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
        // Update existing plan
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

      // Delete existing items and insert new ones
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

      // Link appointment to plan
      await supabase
        .from("appointments")
        .update({ treatment_plan_id: planId })
        .eq("id", appointmentId);

      setPlanStatus(newStatus);
      queryClient.invalidateQueries({ queryKey: ["treatment-plan-editor"] });
      queryClient.invalidateQueries({ queryKey: ["patient-treatment-plans"] });

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
    } catch (error) {
      console.error("Error saving treatment plan:", error);
      toast.error("Failed to save treatment plan");
    } finally {
      setSaving(false);
      setProposing(false);
    }
  };

  // Handle version warning confirmation
  const handleVersionConfirm = async () => {
    setShowVersionWarning(false);
    if (pendingAction === "propose") {
      await performSave("proposed", true);
    } else {
      await performSave("draft", true);
    }
    setPendingAction(null);
  };

  if (loadingPlan) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          Treatment Plan
          {currentPlanId && (
            <Badge variant="outline" className={getPlanStatusColor(planStatus)}>
              {formatPlanStatus(planStatus)}
            </Badge>
          )}
          {planVersion > 1 && (
            <Badge variant="secondary" className="text-xs">
              v{planVersion}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Title and Template */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="plan-title" className="text-xs text-muted-foreground">Plan Title</Label>
            <Input
              id="plan-title"
              placeholder="e.g., Root Canal Treatment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!isEditable}
            />
          </div>
          {isEditable && templates && templates.length > 0 && (
            <div className="w-48">
              <Label className="text-xs text-muted-foreground">Apply Template</Label>
              <Select onValueChange={handleApplyTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
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
        </div>

        {/* Items List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Treatment Items</Label>
            {isEditable && (
              <Button variant="ghost" size="sm" onClick={handleAddItem}>
                <Plus className="h-3 w-3 mr-1" />
                Add Item
              </Button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-md">
              No items yet. Add treatment items or apply a template.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {items.map((item, index) => (
                <div 
                  key={item.id} 
                  className="flex gap-2 items-start p-2 bg-muted/30 rounded-md"
                >
                  <div className="flex-1 grid grid-cols-12 gap-2">
                    <Input
                      placeholder="Treatment name"
                      value={item.name}
                      onChange={(e) => handleUpdateItem(item.id, "name", e.target.value)}
                      disabled={!isEditable}
                      className="col-span-5"
                    />
                    <Input
                      placeholder="Tooth"
                      value={item.tooth}
                      onChange={(e) => handleUpdateItem(item.id, "tooth", e.target.value)}
                      disabled={!isEditable}
                      className="col-span-2"
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={(e) => handleUpdateItem(item.id, "qty", parseInt(e.target.value) || 1)}
                      disabled={!isEditable}
                      className="col-span-2"
                      min={1}
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      value={(item.unit_price_cents / 100).toFixed(2)}
                      onChange={(e) => handleUpdateItem(item.id, "unit_price_cents", Math.round(parseFloat(e.target.value || "0") * 100))}
                      disabled={!isEditable}
                      className="col-span-3"
                      min={0}
                      step={0.01}
                    />
                  </div>
                  {isEditable && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total */}
        {items.length > 0 && (
          <>
            <Separator />
            <div className="flex justify-between items-center font-medium">
              <span className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Estimated Total
              </span>
              <span className="text-lg">{formatCurrency(totalCents, "USD")}</span>
            </div>
          </>
        )}

        {/* Notes */}
        <div>
          <Label htmlFor="plan-notes" className="text-xs text-muted-foreground">
            Notes (visible to patient)
          </Label>
          <Textarea
            id="plan-notes"
            placeholder="Add any notes for the patient..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!isEditable}
            className="mt-1"
            rows={2}
          />
        </div>

        {/* Actions */}
        {isEditable && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={saving || proposing}
              className="flex-1"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Draft
            </Button>
            <Button
              onClick={handlePropose}
              disabled={saving || proposing || !title.trim() || items.length === 0}
              className="flex-1"
            >
              {proposing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Propose to Patient
            </Button>
          </div>
        )}

        {/* Versioning Warning Dialog */}
        <AlertDialog open={showVersionWarning} onOpenChange={setShowVersionWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Create New Version?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This plan has already been {planStatus === "proposed" ? "proposed to the patient" : "completed"}. 
                Making changes will create a new version (v{planVersion + 1}) and mark the current version as superseded.
                <br /><br />
                The patient will see both versions in their records.
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
      </CardContent>
    </Card>
  );
}
