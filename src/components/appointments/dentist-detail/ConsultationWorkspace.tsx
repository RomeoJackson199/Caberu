import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, Upload, DollarSign, Calendar, 
  Plus, Trash2, Save, Loader2, Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AppointmentImagingTab } from "@/components/imaging";
import { cn } from "@/lib/utils";

interface ChargeItem {
  id: string;
  description: string;
  amount_cents: number;
}

interface ConsultationWorkspaceProps {
  appointmentId: string;
  patientId: string;
  dentistId: string;
  businessId: string;
  isEditable: boolean;
  existingNotes?: string;
  existingCharges?: ChargeItem[];
  onNotesChange?: (notes: string) => void;
  onChargesChange?: (charges: ChargeItem[]) => void;
}

/**
 * Consultation Workspace - The core editing area
 * Only visible and editable in COMPLETED_DRAFT state
 * Read-only in FINALIZED state
 */
export function ConsultationWorkspace({
  appointmentId,
  patientId,
  dentistId,
  businessId,
  isEditable,
  existingNotes = "",
  existingCharges = [],
  onNotesChange,
  onChargesChange,
}: ConsultationWorkspaceProps) {
  const { toast } = useToast();
  
  // Clinical Notes - sync with external changes
  const [notes, setNotes] = useState(existingNotes);
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  
  // Charges - sync with external changes
  const [charges, setCharges] = useState<ChargeItem[]>(existingCharges);
  const [newChargeDesc, setNewChargeDesc] = useState("");
  const [newChargeAmount, setNewChargeAmount] = useState("");

  // Sync notes when external prop changes
  useEffect(() => {
    setNotes(existingNotes);
  }, [existingNotes]);

  // Sync charges when external prop changes
  useEffect(() => {
    console.log('🔄 ConsultationWorkspace: syncing charges from props', existingCharges);
    setCharges(existingCharges);
  }, [existingCharges]);

  // Auto-save notes with debounce
  useEffect(() => {
    if (!isEditable || notes === existingNotes) return;
    
    const timeoutId = setTimeout(async () => {
      setNotesSaving(true);
      try {
        await supabase
          .from('appointments')
          .update({ consultation_notes: notes })
          .eq('id', appointmentId);
        
        setNotesSaved(true);
        onNotesChange?.(notes);
        setTimeout(() => setNotesSaved(false), 2000);
      } catch (error) {
        console.error('Error saving notes:', error);
      } finally {
        setNotesSaving(false);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [notes, appointmentId, isEditable]);

  // Calculate totals
  const totalCents = charges.reduce((sum, c) => sum + c.amount_cents, 0);
  const totalFormatted = (totalCents / 100).toFixed(2);

  const handleAddCharge = useCallback(() => {
    if (!newChargeDesc.trim() || !newChargeAmount) return;
    
    const amountCents = Math.round(parseFloat(newChargeAmount) * 100);
    if (isNaN(amountCents)) return;

    const newCharge: ChargeItem = {
      id: `temp-${Date.now()}`,
      description: newChargeDesc.trim(),
      amount_cents: amountCents,
    };
    
    const updatedCharges = [...charges, newCharge];
    setCharges(updatedCharges);
    onChargesChange?.(updatedCharges);
    
    setNewChargeDesc("");
    setNewChargeAmount("");
  }, [newChargeDesc, newChargeAmount, charges, onChargesChange]);

  const handleRemoveCharge = useCallback((id: string) => {
    const updatedCharges = charges.filter(c => c.id !== id);
    setCharges(updatedCharges);
    onChargesChange?.(updatedCharges);
  }, [charges, onChargesChange]);

  return (
    <div className="space-y-4">
      {/* Clinical Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Clinical Notes
            {isEditable && (
              <Badge variant="outline" className="ml-auto text-xs">
                Draft
              </Badge>
            )}
            {notesSaving && (
              <Loader2 className="h-3 w-3 animate-spin ml-auto text-muted-foreground" />
            )}
            {notesSaved && (
              <Check className="h-3 w-3 ml-auto text-emerald-600" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditable ? (
            <Textarea
              placeholder="Enter clinical notes, findings, and treatment details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[120px] resize-none"
            />
          ) : (
            <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-md min-h-[80px]">
              {notes || "No clinical notes recorded."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents / Imaging */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Upload className="h-4 w-4 text-muted-foreground" />
            Documents & Imaging
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AppointmentImagingTab
            patientId={patientId}
            appointmentId={appointmentId}
          />
        </CardContent>
      </Card>

      {/* Charges / Financials */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Charges
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Existing charges */}
          {charges.length > 0 && (
            <div className="space-y-2">
              {charges.map((charge) => (
                <div 
                  key={charge.id} 
                  className="flex items-center justify-between p-2 bg-muted/30 rounded-md"
                >
                  <span className="text-sm">{charge.description}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      ${(charge.amount_cents / 100).toFixed(2)}
                    </span>
                    {isEditable && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveCharge(charge.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              <Separator />
              
              <div className="flex items-center justify-between font-medium">
                <span>Total</span>
                <span>${totalFormatted}</span>
              </div>
            </div>
          )}

          {/* Add new charge */}
          {isEditable && (
            <div className="flex gap-2">
              <Input
                placeholder="Description"
                value={newChargeDesc}
                onChange={(e) => setNewChargeDesc(e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Amount"
                value={newChargeAmount}
                onChange={(e) => setNewChargeAmount(e.target.value)}
                className="w-24"
                min="0"
                step="0.01"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleAddCharge}
                disabled={!newChargeDesc.trim() || !newChargeAmount}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

          {charges.length === 0 && !isEditable && (
            <p className="text-sm text-muted-foreground">No charges recorded.</p>
          )}
        </CardContent>
      </Card>

      {/* Follow-up placeholder - to be implemented with scheduling */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Follow-up
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditable ? (
            <Button variant="outline" className="w-full" disabled>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Follow-up (Coming soon)
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">No follow-up scheduled.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
