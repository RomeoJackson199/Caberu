/**
 * TemplateManager - Save and manage treatment plan templates
 * 
 * Allows dentist to:
 * - Save current plan items as a template
 * - View and manage existing templates
 */

import React, { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BookTemplate, Save, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TemplateItem {
  name: string;
  procedure_code?: string;
  tooth?: string;
  qty: number;
  unit_price_cents: number;
  description?: string;
  sort_order: number;
}

interface SaveAsTemplateProps {
  businessId: string;
  dentistId: string;
  items: TemplateItem[];
  suggestedName?: string;
}

export function SaveAsTemplateButton({
  businessId,
  dentistId,
  items,
  suggestedName = "",
}: SaveAsTemplateProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState(suggestedName);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    if (items.length === 0) {
      toast.error("No items to save as template");
      return;
    }

    setSaving(true);
    try {
      // Format items for storage
      const templateItems = items.map((item, index) => ({
        name: item.name,
        procedure_code: item.procedure_code || null,
        tooth: item.tooth || null,
        qty: item.qty,
        unit_price_cents: item.unit_price_cents,
        description: item.description || null,
        sort_order: index,
      }));

      const { error } = await supabase
        .from("treatment_templates")
        .insert({
          business_id: businessId,
          name: name.trim(),
          description: description.trim() || null,
          default_items: templateItems,
          created_by_dentist_id: dentistId,
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["treatment-templates"] });
      toast.success("Template saved successfully");
      setDialogOpen(false);
      setName("");
      setDescription("");
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  }, [businessId, dentistId, items, name, description, queryClient]);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={items.length === 0}>
          <BookTemplate className="h-4 w-4 mr-2" />
          Save as Template
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Save the current treatment items as a reusable template.
            Templates can be applied to future treatment plans.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              placeholder="e.g., Root Canal Package"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="template-desc">Description (optional)</Label>
            <Textarea
              id="template-desc"
              placeholder="Brief description of this template..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            This template will include {items.length} item{items.length !== 1 ? "s" : ""}.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * TemplateList - Display and manage existing templates
 */
interface TemplateListProps {
  businessId: string;
}

export function TemplateList({ businessId }: TemplateListProps) {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: templates, isLoading } = useQuery({
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
  });

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("treatment_templates")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["treatment-templates"] });
      toast.success("Template deleted");
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    } finally {
      setDeleting(false);
    }
  }, [deleteId, queryClient]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-12 bg-muted/50 rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No templates saved yet. Create a treatment plan and save it as a template.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {templates.map((template) => {
          const itemCount = Array.isArray(template.default_items)
            ? template.default_items.length
            : 0;

          return (
            <div
              key={template.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-full">
                  <BookTemplate className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{template.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {itemCount} item{itemCount !== 1 ? "s" : ""}
                    {template.description && ` • ${template.description}`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteId(template.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The template will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
