import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface ChargeItem {
  id: string;
  description: string;
  amount_cents: number;
}

interface DraftSaveButtonProps {
  appointmentId: string;
  dentistId: string;
  notes: string;
  charges?: ChargeItem[];
  onSaved?: () => void;
}

/**
 * Draft Save Button - Saves appointment data without sending notifications
 * Patient cannot see draft data until appointment is finalized
 */
export function DraftSaveButton({
  appointmentId,
  dentistId,
  notes,
  charges = [],
  onSaved,
}: DraftSaveButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    
    try {
      // Save notes to appointments table
      const { error: notesError } = await supabase
        .from('appointments')
        .update({ 
          consultation_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointmentId)
        .select('id, consultation_notes');

      if (notesError) {
        throw notesError;
      }

      // Save charges to notes table as JSON for draft persistence
      // First delete any existing draft_charges, then insert new
      await supabase
        .from('notes')
        .delete()
        .eq('appointment_id', appointmentId)
        .eq('note_type', 'draft_charges');

      if (charges.length > 0) {
        const chargesJson = JSON.stringify(charges);
        
        const { error: chargesError } = await supabase
          .from('notes')
          .insert({
            appointment_id: appointmentId,
            dentist_id: dentistId,
            created_by: dentistId,
            note_type: 'draft_charges',
            content: chargesJson,
            is_private: true,
          })
          .select('id');

        if (chargesError) {
          throw chargesError;
        }
      }

      setSaved(true);
      
      // Invalidate queries to refresh data immediately
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
      await queryClient.invalidateQueries({ queryKey: ['draft-charges', appointmentId] });
      
      // Call the onSaved callback to trigger parent refresh
      onSaved?.();
      
      toast({
        title: "Draft saved",
        description: "Your notes and charges have been saved. Patient will not see this until finalized.",
      });

      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast({
        title: "Error saving draft",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [saving, appointmentId, dentistId, notes, charges, queryClient, onSaved, toast]);

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleSave}
      disabled={saving}
      className="gap-2"
    >
      {saving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : saved ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Save className="h-3.5 w-3.5" />
      )}
      {saved ? "Saved!" : "Save Draft"}
    </Button>
  );
}