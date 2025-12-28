import { useState } from "react";
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
  notes,
  charges = [],
  onSaved,
}: DraftSaveButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    
    console.log('💾 Saving draft...', { appointmentId, notes: notes?.slice(0, 50), chargesCount: charges.length });
    
    try {
      // Save notes to appointments table
      const { data: notesData, error: notesError } = await supabase
        .from('appointments')
        .update({ 
          consultation_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointmentId)
        .select('id, consultation_notes');

      if (notesError) {
        console.error('❌ Error saving notes:', notesError);
        throw notesError;
      }
      console.log('✅ Notes saved:', notesData);

      // Save charges to notes table as JSON for draft persistence
      // First delete any existing draft_charges, then insert new
      const { error: deleteError } = await supabase
        .from('notes')
        .delete()
        .eq('appointment_id', appointmentId)
        .eq('note_type', 'draft_charges');
      
      if (deleteError) {
        console.warn('⚠️ Delete draft_charges warning:', deleteError);
      }
      
      if (charges.length > 0) {
        const chargesJson = JSON.stringify(charges);
        console.log('💰 Saving charges:', chargesJson);
        
        const { data: chargesData, error: chargesError } = await supabase
          .from('notes')
          .insert({
            appointment_id: appointmentId,
            note_type: 'draft_charges',
            content: chargesJson,
            is_private: true,
          })
          .select('id');

        if (chargesError) {
          console.error('❌ Error saving charges:', chargesError);
          throw chargesError;
        }
        console.log('✅ Charges saved:', chargesData);
      }

      setSaved(true);
      
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
      
      onSaved?.();
      
      toast({
        title: "Draft saved",
        description: "Your notes and charges have been saved. Patient will not see this until finalized.",
      });

      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Error saving draft",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

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
