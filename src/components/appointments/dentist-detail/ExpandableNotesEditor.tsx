import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Expand, Loader2, Check, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandableNotesEditorProps {
  value: string;
  onChange: (value: string) => void;
  isEditable: boolean;
  isSaving?: boolean;
  isSaved?: boolean;
  placeholder?: string;
  minHeight?: string;
}

export function ExpandableNotesEditor({
  value,
  onChange,
  isEditable,
  isSaving = false,
  isSaved = false,
  placeholder = "Enter clinical notes, findings, and treatment details...",
  minHeight = "120px",
}: ExpandableNotesEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedValue, setExpandedValue] = useState(value);

  // Sync expanded value when dialog opens
  useEffect(() => {
    if (isExpanded) {
      setExpandedValue(value);
    }
  }, [isExpanded, value]);

  const handleExpandedSave = () => {
    onChange(expandedValue);
    setIsExpanded(false);
  };

  const handleExpandedCancel = () => {
    setExpandedValue(value);
    setIsExpanded(false);
  };

  if (!isEditable) {
    return (
      <div className="relative group">
        <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-md min-h-[80px]">
          {value || "No clinical notes recorded."}
        </div>
        {value && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setIsExpanded(true)}
          >
            <Expand className="h-4 w-4" />
          </Button>
        )}

        {/* Read-only expanded view */}
        <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Clinical Notes
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto p-4 bg-muted/30 rounded-lg">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">
                {value || "No clinical notes recorded."}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="relative">
      <Textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn("resize-none pr-10", `min-h-[${minHeight}]`)}
        style={{ minHeight }}
      />
      
      {/* Expand button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={() => setIsExpanded(true)}
        title="Expand to full editor"
      >
        <Expand className="h-4 w-4" />
      </Button>

      {/* Status indicators */}
      {isSaving && (
        <Loader2 className="absolute bottom-2 right-2 h-3 w-3 animate-spin text-muted-foreground" />
      )}
      {isSaved && !isSaving && (
        <Check className="absolute bottom-2 right-2 h-3 w-3 text-emerald-600" />
      )}

      {/* Expanded document editor dialog */}
      <Dialog open={isExpanded} onOpenChange={(open) => {
        if (!open) handleExpandedCancel();
      }}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Clinical Notes
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col min-h-0">
            <Textarea
              placeholder={placeholder}
              value={expandedValue}
              onChange={(e) => setExpandedValue(e.target.value)}
              className="flex-1 resize-none text-base leading-relaxed p-4 rounded-lg border"
              style={{ minHeight: '100%' }}
            />
          </div>

          <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleExpandedCancel}>
              Cancel
            </Button>
            <Button onClick={handleExpandedSave}>
              <Check className="h-4 w-4 mr-2" />
              Apply Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
