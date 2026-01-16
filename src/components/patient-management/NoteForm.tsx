import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NoteForm } from "./types";

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
                  <SelectItem value="follow_up">Follow-up</SelectItem>
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
