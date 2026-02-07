import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, Upload, Plus, Loader2, Check, 
  MessageSquarePlus, Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AppointmentImagingTab } from "@/components/imaging";

interface AddendumNote {
  id: string;
  content: string;
  created_at: string;
  title: string | null;
}

interface FinalizedAddendumProps {
  appointmentId: string;
  patientId: string;
  dentistId: string;
  businessId: string;
  originalNotes?: string;
  originalCompletedAt?: string;
}

/**
 * Finalized Addendum Section
 * Allows dentist to ADD new notes and documents to a finalized appointment
 * but NEVER edit existing data
 */
export function FinalizedAddendum({
  appointmentId,
  patientId,
  dentistId,
  businessId,
  originalNotes,
  originalCompletedAt,
}: FinalizedAddendumProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);

  // Fetch addendum notes for this appointment
  const { data: addendumNotes = [], isLoading } = useQuery({
    queryKey: ['addendum-notes', appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('secure_notes_view' as any)
        .select('id, content, created_at, title')
        .eq('appointment_id', appointmentId)
        .eq('note_type', 'addendum')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AddendumNote[];
    },
  });

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('notes')
        .insert({
          patient_id: patientId,
          appointment_id: appointmentId,
          title: `Addendum - ${format(new Date(), 'PPP')}`,
          content: newNote.trim(),
          note_type: 'addendum',
          created_by: dentistId,
        });

      if (error) throw error;

      setSaved(true);
      setNewNote("");
      setShowNoteInput(false);
      queryClient.invalidateQueries({ queryKey: ['addendum-notes', appointmentId] });
      
      toast({
        title: "Note added",
        description: "Your addendum note has been saved and is visible to the patient.",
      });

      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "Error adding note",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Original Notes (Read-only) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Original Consultation Notes
            <Badge variant="outline" className="ml-auto text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
              Locked
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-md min-h-[60px]">
            {originalNotes || "No notes recorded."}
          </div>
          {originalCompletedAt && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Finalized on {format(new Date(originalCompletedAt), 'PPP')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Addendum Notes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquarePlus className="h-4 w-4 text-amber-600" />
              Addendum Notes
              {addendumNotes.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {addendumNotes.length}
                </Badge>
              )}
            </CardTitle>
            {!showNoteInput && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNoteInput(true)}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Note
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* New Note Input */}
          {showNoteInput && (
            <div className="space-y-2 p-3 border rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
              <Textarea
                placeholder="Add a follow-up note or addendum..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[80px] resize-none"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowNoteInput(false);
                    setNewNote("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || saving}
                  className="gap-1.5"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : saved ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Add Note
                </Button>
              </div>
            </div>
          )}

          {/* Existing Addendum Notes */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : addendumNotes.length > 0 ? (
            <div className="space-y-2">
              {addendumNotes.map((note) => (
                <div 
                  key={note.id} 
                  className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-md border border-amber-200/50 dark:border-amber-800/50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                      Addendum
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                </div>
              ))}
            </div>
          ) : !showNoteInput ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              No addendum notes yet
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Documents - Can add new, not edit existing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Upload className="h-4 w-4 text-muted-foreground" />
            Documents & Imaging
            <Badge variant="outline" className="ml-auto text-xs">
              Add new only
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AppointmentImagingTab
            patientId={patientId}
            appointmentId={appointmentId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
