import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PrescriptionForm } from "./types";

// Common dental prescription templates
const PRESCRIPTION_TEMPLATES = [
  {
    label: "Amoxicillin (Antibiotic)",
    medication_name: "Amoxicillin",
    dosage: "500mg",
    frequency: "3 times daily",
    duration_days: "7",
    instructions: "Take with or without food. Complete the full course even if symptoms improve.",
  },
  {
    label: "Ibuprofen (Pain Relief)",
    medication_name: "Ibuprofen",
    dosage: "400mg",
    frequency: "Every 6 hours as needed",
    duration_days: "5",
    instructions: "Take with food. Do not exceed 1200mg in 24 hours. Avoid if you have stomach ulcers.",
  },
  {
    label: "Paracetamol (Pain Relief)",
    medication_name: "Paracetamol",
    dosage: "1000mg",
    frequency: "Every 6 hours as needed",
    duration_days: "5",
    instructions: "Do not exceed 4000mg in 24 hours. Avoid alcohol while taking this medication.",
  },
  {
    label: "Metronidazole (Antibiotic)",
    medication_name: "Metronidazole",
    dosage: "400mg",
    frequency: "3 times daily",
    duration_days: "5",
    instructions: "Avoid alcohol during treatment and for 48 hours after. Take with or after food.",
  },
  {
    label: "Chlorhexidine Mouthwash",
    medication_name: "Chlorhexidine Gluconate 0.2%",
    dosage: "10ml",
    frequency: "Twice daily",
    duration_days: "14",
    instructions: "Rinse for 1 minute then spit out. Do not rinse with water after. Use 30 minutes after brushing.",
  },
  {
    label: "Clindamycin (For Penicillin Allergy)",
    medication_name: "Clindamycin",
    dosage: "300mg",
    frequency: "4 times daily",
    duration_days: "7",
    instructions: "Take with a full glass of water. May cause diarrhea - contact dentist if severe.",
  },
  {
    label: "Prednisolone (Steroid)",
    medication_name: "Prednisolone",
    dosage: "5mg",
    frequency: "Once daily in the morning",
    duration_days: "5",
    instructions: "Take with food. Do not stop abruptly - follow tapering instructions if provided.",
  },
];

interface PrescriptionFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: PrescriptionForm;
  onFormChange: (form: PrescriptionForm) => void;
  onSubmit: () => void;
  isEditing: boolean;
}

export function PrescriptionFormSheet({
  open,
  onOpenChange,
  form,
  onFormChange,
  onSubmit,
  isEditing
}: PrescriptionFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Prescription' : 'Add Prescription'}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          {/* Quick Template Selector */}
          <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
            <Label className="text-xs text-muted-foreground mb-2 block">Quick Fill from Template</Label>
            <Select
              onValueChange={(value) => {
                const template = PRESCRIPTION_TEMPLATES.find(t => t.label === value);
                if (template) {
                  onFormChange({
                    medication_name: template.medication_name,
                    dosage: template.dosage,
                    frequency: template.frequency,
                    duration_days: template.duration_days,
                    instructions: template.instructions,
                  });
                }
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select a common prescription..." />
              </SelectTrigger>
              <SelectContent>
                {PRESCRIPTION_TEMPLATES.map((template) => (
                  <SelectItem key={template.label} value={template.label}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="medication">Medication Name *</Label>
            <Input
              id="medication"
              value={form.medication_name}
              onChange={(e) => onFormChange({ ...form, medication_name: e.target.value })}
              placeholder="e.g., Amoxicillin"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dosage">Dosage *</Label>
              <Input
                id="dosage"
                value={form.dosage}
                onChange={(e) => onFormChange({ ...form, dosage: e.target.value })}
                placeholder="e.g., 500mg"
              />
            </div>
            <div>
              <Label htmlFor="frequency">Frequency *</Label>
              <Input
                id="frequency"
                value={form.frequency}
                onChange={(e) => onFormChange({ ...form, frequency: e.target.value })}
                placeholder="e.g., 3 times daily"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="duration_days">Duration (days)</Label>
            <Input
              id="duration_days"
              type="number"
              value={form.duration_days}
              onChange={(e) => onFormChange({ ...form, duration_days: e.target.value })}
              placeholder="e.g., 7"
            />
          </div>
          <div>
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={form.instructions}
              onChange={(e) => onFormChange({ ...form, instructions: e.target.value })}
              placeholder="Take with food, avoid alcohol, etc..."
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={!form.medication_name || !form.dosage || !form.frequency}
            >
              {isEditing ? 'Save Changes' : 'Add Prescription'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
