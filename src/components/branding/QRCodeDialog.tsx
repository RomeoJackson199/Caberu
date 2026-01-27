import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";
import type { RefObject } from "react";

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessLink: string;
  onDownload: () => void;
  qrCanvasRef: RefObject<HTMLCanvasElement | null>;
}

export function QRCodeDialog({ open, onOpenChange, businessLink, onDownload, qrCanvasRef }: QRCodeDialogProps) {
  const { t } = useLanguage();
  const baseOrigin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.businessLinkQr}</DialogTitle>
          <DialogDescription>
            {t.businessLinkQr}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <QRCodeCanvas
              ref={qrCanvasRef}
              value={businessLink || baseOrigin || ""}
              size={200}
              level="H"
              includeMargin
              bgColor="#FFFFFF"
              style={{ width: "200px", height: "200px" }}
            />
          </div>
          <Button onClick={onDownload} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            {t.downloadQr}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
