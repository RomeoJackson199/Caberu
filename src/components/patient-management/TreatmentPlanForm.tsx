import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TreatmentForm } from "./types";

interface TreatmentPlanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: TreatmentForm;
  onFormChange: (form: TreatmentForm) => void;
  onSubmit: () => void;
  isEditing: boolean;
}

export function TreatmentPlanFormSheet({
  open,
  onOpenChange,
  form,
  onFormChange,
  onSubmit,
  isEditing
}: TreatmentPlanFormProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Treatment Plan' : 'Add Treatment Plan'}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => onFormChange({ ...form, title: e.target.value })}
              placeholder="e.g., Root Canal Treatment"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => onFormChange({ ...form, description: e.target.value })}
              placeholder="Treatment details..."
            />
          </div>
          <div>
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Textarea
              id="diagnosis"
              value={form.diagnosis}
              onChange={(e) => onFormChange({ ...form, diagnosis: e.target.value })}
              placeholder="Clinical findings and diagnosis..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(value) => onFormChange({ ...form, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cost">Estimated Cost ($)</Label>
              <Input
                id="cost"
                type="number"
                value={form.estimated_cost}
                onChange={(e) => onFormChange({ ...form, estimated_cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="duration">Duration (weeks)</Label>
            <Input
              id="duration"
              type="number"
              value={form.estimated_duration_weeks}
              onChange={(e) => onFormChange({ ...form, estimated_duration_weeks: e.target.value })}
              placeholder="e.g., 4"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={!form.title}>
              {isEditing ? 'Save Changes' : 'Add Treatment Plan'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
