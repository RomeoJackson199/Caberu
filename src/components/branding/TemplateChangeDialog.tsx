import type { TemplateType } from "@/lib/businessTemplates";

interface TemplateChangeDialogProps {
  currentTemplate: TemplateType;
  pendingTemplate: TemplateType | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TemplateChangeDialog({ currentTemplate, pendingTemplate, onConfirm, onCancel }: TemplateChangeDialogProps) {
  if (!pendingTemplate) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background p-6 rounded-lg max-w-md">
        <h3 className="font-bold mb-2">Switch Template?</h3>
        <p className="mb-4">
          Are you sure you want to switch from {currentTemplate} to {pendingTemplate}?
        </p>
        <div className="flex gap-2 justify-end">
          <button className="px-4 py-2 border rounded" onClick={onCancel}>
            Cancel
          </button>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
