import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export function UploadEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors cursor-pointer">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Upload className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Upload files</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        Drag and drop files here or click to browse
      </p>
      <Button variant="outline">Browse Files</Button>
    </div>
  );
}
