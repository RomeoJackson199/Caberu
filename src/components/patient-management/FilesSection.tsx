import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccordionItem, AccordionContent, AccordionTrigger } from "@/components/ui/accordion";
import { FileText } from "lucide-react";
import { PhotoUpload } from "@/components/PhotoUpload";

export function FilesSection() {
  return (
    <AccordionItem value="files">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-dental-primary" />
              <span>Images / Files</span>
            </div>
            <AccordionTrigger className="py-0" />
          </CardTitle>
        </CardHeader>
        <AccordionContent>
          <CardContent>
            <div className="py-2">
              <PhotoUpload onComplete={() => { }} onCancel={() => { }} />
            </div>
          </CardContent>
        </AccordionContent>
      </Card>
    </AccordionItem>
  );
}
