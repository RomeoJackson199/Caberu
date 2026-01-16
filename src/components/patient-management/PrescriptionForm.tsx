import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PrescriptionForm } from "./types";

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
