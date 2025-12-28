import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DraftSaveButtonProps {
  appointmentId: string;
  notes: string;
  onSaved?: () => void;
}

/**
 * Draft Save Button - Saves appointment data without sending notifications
 * Patient cannot see draft data until appointment is finalized
 */
export function DraftSaveButton({
  appointmentId,
  notes,
  onSaved,
}: DraftSaveButtonProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          consultation_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointmentId);

      if (error) throw error;

      setSaved(true);
      onSaved?.();
      
      toast({
        title: "Draft saved",
        description: "Your notes have been saved. Patient will not see this until finalized.",
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
      variant="outline"
      size="sm"
      onClick={handleSave}
      disabled={saving}
      className="gap-2"
    >
      {saving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : saved ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <Save className="h-3.5 w-3.5" />
      )}
      {saved ? "Saved" : "Save Draft"}
    </Button>
  );
}
