import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

interface TermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TermsDialog = ({ open, onOpenChange }: TermsDialogProps) => {
  const { t } = useLanguage();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg glass-card border-dental-primary/20">
        <DialogHeader>
          <DialogTitle className="text-center">{t.termsTitle}</DialogTitle>
          <DialogDescription>Review our terms and conditions for using this service.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-80 pr-4 space-y-4">
          <p>{t.termsIntro}</p>
          <ol className="list-decimal pl-4 space-y-2 text-sm">
            <li>{t.termsUse}</li>
            <li>{t.termsPrivacy}</li>
            <li>{t.termsMedical}</li>
          </ol>
        </ScrollArea>
        <Button
          onClick={() => onOpenChange(false)}
          className="w-full mt-4 bg-gradient-primary text-white hover:shadow-glow"
        >
          {t.close}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
