import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NoteForm } from "./types";

// Common note templates for dentists
const NOTE_TEMPLATES = [
  {
    label: "Post-Extraction Instructions",
    title: "Post-Extraction Care Instructions",
    content: "- Bite on gauze for 30-45 minutes\n- Avoid spitting, rinsing, or using straws for 24 hours\n- Soft foods only for 48 hours\n- No smoking for at least 72 hours\n- Ice pack on cheek 20 min on/off\n- Pain medication as prescribed\n- Call if excessive bleeding or fever",
    note_type: "consultation",
  },
  {
    label: "Follow-up Required",
    title: "Follow-up Appointment Needed",
    content: "Patient requires follow-up appointment in [X] weeks for:\n- Treatment progress check\n- Suture removal\n- Further treatment planning",
    note_type: "follow_up",
  },
  {
    label: "Treatment Consent",
    title: "Informed Consent Obtained",
    content: "Discussed treatment options, risks, benefits, and alternatives with patient. Patient understood and gave informed consent for the proposed treatment. All questions answered satisfactorily.",
    note_type: "consultation",
  },
  {
    label: "Anxiety Patient",
    title: "Patient Anxiety Note",
    content: "Patient experiences dental anxiety. Recommended:\n- Extra time scheduled for appointments\n- Gentle approach and clear communication\n- Consider sedation options if needed\n- Build-up appointments recommended",
    note_type: "general",
  },
  {
    label: "Payment Discussion",
    title: "Payment Plan Discussion",
    content: "Discussed payment options with patient:\n- Treatment cost: €[AMOUNT]\n- Payment plan agreed: [DETAILS]\n- Next payment due: [DATE]",
    note_type: "billing",
  },
  {
    label: "Medication Allergy",
    title: "Allergy Alert - Update Required",
    content: "Patient reported allergy to: [MEDICATION/SUBSTANCE]\nReaction: [DESCRIPTION]\nSeverity: [MILD/MODERATE/SEVERE]\nAlternatives discussed.",
    note_type: "clinical",
  },
  {
    label: "Referral Made",
    title: "Specialist Referral",
    content: "Patient referred to:\n- Specialist: [NAME/SPECIALTY]\n- Reason: [REASON]\n- Referral letter provided: Yes/No\n- Urgent: Yes/No",
    note_type: "consultation",
  },
  {
    label: "No-Show",
    title: "Missed Appointment",
    content: "Patient did not attend scheduled appointment.\n- Attempted contact: [YES/NO]\n- Rescheduled: [YES/NO]\n- Notes: ",
    note_type: "general",
  },
];

interface NoteFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: NoteForm;
  onFormChange: (form: NoteForm) => void;
  onSubmit: () => void;
  isEditing: boolean;
}

export function NoteFormSheet({
  open,
  onOpenChange,
  form,
  onFormChange,
  onSubmit,
  isEditing
}: NoteFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Note' : 'Add Note'}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          {/* Quick Template Selector */}
          <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
            <Label className="text-xs text-muted-foreground mb-2 block">Quick Fill from Template</Label>
            <Select
              onValueChange={(value) => {
                const template = NOTE_TEMPLATES.find(t => t.label === value);
                if (template) {
                  onFormChange({
                    ...form,
                    title: template.title,
                    content: template.content,
                    note_type: template.note_type,
                  });
                }
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {NOTE_TEMPLATES.map((template) => (
                  <SelectItem key={template.label} value={template.label}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="note_title">Title *</Label>
            <Input
              id="note_title"
              value={form.title}
              onChange={(e) => onFormChange({ ...form, title: e.target.value })}
              placeholder="Note title..."
            />
          </div>
          <div>
            <Label htmlFor="note_content">Content *</Label>
            <Textarea
              id="note_content"
              value={form.content}
              onChange={(e) => onFormChange({ ...form, content: e.target.value })}
              placeholder="Write your note here..."
              className="min-h-[120px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="note_type">Type</Label>
              <Select
                value={form.note_type}
                onValueChange={(value) => onFormChange({ ...form, note_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="clinical">Clinical</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="private"
                checked={form.is_private}
                onChange={(e) => onFormChange({ ...form, is_private: e.target.checked })}
                className="rounded border-muted-foreground"
              />
              <Label htmlFor="private" className="text-sm">Private note</Label>
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={!form.title || !form.content}
            >
              {isEditing ? 'Save Changes' : 'Add Note'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
