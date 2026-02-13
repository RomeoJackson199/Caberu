import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  FileText, Upload, Calendar,
  Plus, Loader2, Check, Package, Stethoscope
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AppointmentImagingTab } from "@/components/imaging";
import { ExpandableNotesEditor } from "./ExpandableNotesEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChargeItem {
  id: string;
  description: string;
  amount_cents: number;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  duration_minutes: number | null;
  category: string | null;
}

interface ConsultationWorkspaceProps {
  appointmentId: string;
  patientId: string;
  dentistId: string;
  businessId: string;
  isEditable: boolean;
  existingNotes?: string;
  existingCharges?: ChargeItem[];
  existingServiceId?: string | null;
  patientSymptoms?: string | null;
  onNotesChange?: (notes: string) => void;
  onChargesChange?: (charges: ChargeItem[]) => void;
  onServiceChange?: (serviceId: string | null) => void;
  /** Callback to report save status to parent */
  onSaveStatusChange?: (status: 'saved' | 'saving' | 'unsaved') => void;
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
  existingServiceId = null,
  patientSymptoms = null,
  onNotesChange,
  onChargesChange,
  onServiceChange,
  onSaveStatusChange,
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
  const [chargesSaving, setChargesSaving] = useState(false);
  const [chargesSaved, setChargesSaved] = useState(false);

  // Services
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(existingServiceId);
  const [loadingServices, setLoadingServices] = useState(false);
  const [serviceSaving, setServiceSaving] = useState(false);

  // Track the last saved values to detect changes
  const lastSavedNotesRef = useRef(existingNotes);
  const lastSavedChargesRef = useRef(JSON.stringify(existingCharges));

  // Compute unsaved state
  const hasUnsavedNotes = notes !== lastSavedNotesRef.current;
  const hasUnsavedCharges = JSON.stringify(charges) !== lastSavedChargesRef.current;
  const hasUnsavedChanges = hasUnsavedNotes || hasUnsavedCharges;
  const isSaving = notesSaving || chargesSaving;
  const isSaved = (notesSaved || chargesSaved) && !hasUnsavedChanges;

  // Report save status to parent
  useEffect(() => {
    if (isSaving) {
      onSaveStatusChange?.('saving');
    } else if (hasUnsavedChanges) {
      onSaveStatusChange?.('unsaved');
    } else {
      onSaveStatusChange?.('saved');
    }
  }, [isSaving, hasUnsavedChanges, onSaveStatusChange]);

  // Sync notes when external prop changes
  useEffect(() => {
    setNotes(existingNotes);
    lastSavedNotesRef.current = existingNotes;
  }, [existingNotes]);

  // Sync charges when external prop changes
  useEffect(() => {
    setCharges(existingCharges);
    lastSavedChargesRef.current = JSON.stringify(existingCharges);
  }, [existingCharges]);

  // Sync service when external prop changes
  useEffect(() => {
    setSelectedServiceId(existingServiceId);
  }, [existingServiceId]);

  // Fetch available services
  useEffect(() => {
    const fetchServices = async () => {
      setLoadingServices(true);
      try {
        const { data, error } = await supabase
          .from('business_services')
          .select('*')
          .eq('business_id', businessId)
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setServices(data || []);
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setLoadingServices(false);
      }
    };

    fetchServices();
  }, [businessId]);

  // Auto-save notes with debounce
  useEffect(() => {
    if (!isEditable || notes === lastSavedNotesRef.current) return;

    const timeoutId = setTimeout(async () => {
      setNotesSaving(true);
      try {
        await supabase
          .from('appointments')
          .update({ consultation_notes: notes })
          .eq('id', appointmentId);

        lastSavedNotesRef.current = notes;
        setNotesSaved(true);
        onNotesChange?.(notes);
        setTimeout(() => setNotesSaved(false), 2000);
      } catch {
        toast({
          title: "Failed to save notes",
          description: "Your notes will be saved automatically when you try again.",
          variant: "destructive",
        });
      } finally {
        setNotesSaving(false);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [notes, appointmentId, isEditable, onNotesChange, toast]);

  // Auto-save charges with debounce
  useEffect(() => {
    const currentChargesJson = JSON.stringify(charges);
    if (!isEditable || currentChargesJson === lastSavedChargesRef.current) return;

    const timeoutId = setTimeout(async () => {
      setChargesSaving(true);
      try {
        // Delete existing draft charges
        await supabase
          .from('notes')
          .delete()
          .eq('appointment_id', appointmentId)
          .eq('note_type', 'draft_charges');

        // Insert new charges if any
        if (charges.length > 0) {
          await supabase
            .from('notes')
            .insert({
              appointment_id: appointmentId,
              dentist_id: dentistId,
              created_by: dentistId,
              note_type: 'draft_charges',
              content: currentChargesJson,
              is_private: true,
            });
        }

        lastSavedChargesRef.current = currentChargesJson;
        setChargesSaved(true);
        onChargesChange?.(charges);
        setTimeout(() => setChargesSaved(false), 2000);
      } catch {
        toast({
          title: "Failed to save charges",
          description: "Your charges will be saved automatically when you try again.",
          variant: "destructive",
        });
      } finally {
        setChargesSaving(false);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [charges, appointmentId, dentistId, isEditable, onChargesChange, toast]);

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

  // New service creation state
  const [showNewServiceDialog, setShowNewServiceDialog] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceDuration, setNewServiceDuration] = useState("30");
  const [creatingSvc, setCreatingSvc] = useState(false);

  const handleServiceChange = useCallback(async (serviceId: string) => {
    if (!isEditable) return;

    if (serviceId === "__create_new__") {
      setShowNewServiceDialog(true);
      return;
    }

    const parsedServiceId = serviceId === "none" ? null : serviceId;
    setSelectedServiceId(parsedServiceId);
    setServiceSaving(true);

    try {
      const service = services.find(s => s.id === parsedServiceId);

      const { error } = await supabase
        .from('appointments')
        .update({
          service_id: parsedServiceId,
          duration_minutes: service?.duration_minutes || 30,
          reason: service?.name || null,
        })
        .eq('id', appointmentId);

      if (error) throw error;

      onServiceChange?.(parsedServiceId);

      toast({
        title: "Service Updated",
        description: `Service changed to ${service?.name || "None"}`,
      });
    } catch (error) {
      console.error("Error updating service:", error);
      toast({
        title: "Failed to update service",
        description: "Please try again.",
        variant: "destructive",
      });
      // Revert on error
      setSelectedServiceId(existingServiceId);
    } finally {
      setServiceSaving(false);
    }
  }, [isEditable, services, appointmentId, existingServiceId, onServiceChange, toast]);

  const handleCreateService = useCallback(async () => {
    if (!newServiceName.trim() || !newServicePrice) return;
    setCreatingSvc(true);
    try {
      const priceCents = Math.round(parseFloat(newServicePrice) * 100);
      if (isNaN(priceCents)) throw new Error("Invalid price");

      const { data, error } = await supabase
        .from('business_services')
        .insert({
          business_id: businessId,
          name: newServiceName.trim(),
          price_cents: priceCents,
          duration_minutes: parseInt(newServiceDuration) || 30,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local list and select it
      setServices(prev => [...prev, data]);
      setShowNewServiceDialog(false);
      setNewServiceName("");
      setNewServicePrice("");
      setNewServiceDuration("30");

      // Auto-select the new service
      await handleServiceChange(data.id);

      toast({ title: "Service Created", description: `${data.name} has been added` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create service", variant: "destructive" });
    } finally {
      setCreatingSvc(false);
    }
  }, [newServiceName, newServicePrice, newServiceDuration, businessId, toast, handleServiceChange]);

  return (
    <div className="space-y-4">
      {/* Service Selection */}
      <Card className="border-muted/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4 text-primary/70" />
            Service
            {serviceSaving && (
              <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Updating...
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingServices ? (
            <div className="text-sm text-muted-foreground">Loading services...</div>
          ) : isEditable ? (
            <Select
              value={selectedServiceId || "none"}
              onValueChange={handleServiceChange}
              disabled={serviceSaving}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No service</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} - ${(service.price_cents / 100).toFixed(2)} ({service.duration_minutes || 30} min)
                  </SelectItem>
                ))}
                <SelectItem value="__create_new__" className="text-primary font-medium">
                  <span className="flex items-center gap-1">
                    <Plus className="h-3 w-3" />
                    Add New Service
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm">
              {selectedServiceId
                ? services.find(s => s.id === selectedServiceId)?.name || "Unknown service"
                : "No service selected"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Patient Symptoms */}
      {patientSymptoms && (
        <Card className="border-muted/60 bg-orange-50/50 dark:bg-orange-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-orange-600" />
              Patient Symptoms / Reason for Visit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-3 text-sm border border-orange-200 dark:border-orange-800">
              {patientSymptoms}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clinical Notes */}
      <Card className="border-muted/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary/70" />
            Clinical Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ExpandableNotesEditor
            value={notes}
            onChange={setNotes}
            isEditable={isEditable}
            isSaving={notesSaving}
            isSaved={notesSaved}
            placeholder="Enter clinical notes, findings, and treatment details..."
            minHeight="120px"
          />
        </CardContent>
      </Card>

      {/* Documents / Imaging */}
      <Card className="border-muted/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary/70" />
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

      {/* Charges section removed - service prices define costs */}

      {/* Follow-up placeholder - to be implemented with scheduling */}
      <Card className="border-muted/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary/70" />
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

      {/* New Service Dialog */}
      <Dialog open={showNewServiceDialog} onOpenChange={setShowNewServiceDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="svc-name">Service Name</Label>
              <Input
                id="svc-name"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                placeholder="e.g. Root Canal"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="svc-price">Price ($)</Label>
                <Input
                  id="svc-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="svc-dur">Duration (min)</Label>
                <Input
                  id="svc-dur"
                  type="number"
                  min="5"
                  value={newServiceDuration}
                  onChange={(e) => setNewServiceDuration(e.target.value)}
                  placeholder="30"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewServiceDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateService} disabled={!newServiceName.trim() || !newServicePrice || creatingSvc}>
              {creatingSvc ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
