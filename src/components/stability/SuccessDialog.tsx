import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, FileText, ArrowRight, Home, Printer, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SuccessDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  details?: { label: string; value: string }[];
  actions?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
    icon?: React.ElementType;
  }[];
  showConfetti?: boolean;
  type?: "appointment" | "payment" | "treatment" | "general";
}

export function SuccessDialog({
  open,
  onClose,
  title,
  description,
  details,
  actions,
  showConfetti = false,
  type = "general",
}: SuccessDialogProps) {
  const iconConfig = {
    appointment: { icon: Calendar, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30" },
    payment: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
    treatment: { icon: FileText, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-900/30" },
    general: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-100 dark:bg-green-900/30" },
  }[type];

  const Icon = iconConfig.icon;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="relative">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={cn("mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4", iconConfig.bg)}
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                <Icon className={cn("h-8 w-8", iconConfig.color)} />
              </motion.div>
            </motion.div>
            {/* Celebration sparkles */}
            {showConfetti && (
              <>
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{
                      scale: [0, 1, 0],
                      opacity: [1, 1, 0],
                      x: [0, (i % 2 === 0 ? 1 : -1) * (20 + i * 10)],
                      y: [0, -20 - i * 8],
                    }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                    className="absolute left-1/2 top-1/2"
                  >
                    <Sparkles className={cn(
                      "h-4 w-4",
                      i % 3 === 0 ? "text-emerald-500" : i % 3 === 1 ? "text-blue-500" : "text-purple-500"
                    )} />
                  </motion.div>
                ))}
              </>
            )}
          </div>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-base mt-2">{description}</DialogDescription>
          )}
        </DialogHeader>

        {details && details.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 space-y-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4"
          >
            {details.map((detail, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{detail.label}</span>
                <span className="font-medium">{detail.value}</span>
              </div>
            ))}
          </motion.div>
        )}

        <DialogFooter className="mt-6 flex-col sm:flex-row gap-2">
          {actions ? (
            actions.map((action, index) => {
              const ActionIcon = action.icon;
              return (
                <Button
                  key={index}
                  variant={action.variant || "default"}
                  onClick={action.onClick}
                  className="w-full sm:w-auto gap-2"
                >
                  {ActionIcon && <ActionIcon className="h-4 w-4" />}
                  {action.label}
                </Button>
              );
            })
          ) : (
            <Button onClick={onClose} className="w-full">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PaymentSuccessProps {
  open: boolean;
  onClose: () => void;
  amount: string;
  paymentMethod?: string;
  transactionId?: string;
  onViewReceipt?: () => void;
  onPrint?: () => void;
}

export function PaymentSuccessDialog({
  open,
  onClose,
  amount,
  paymentMethod,
  transactionId,
  onViewReceipt,
  onPrint,
}: PaymentSuccessProps) {
  return (
    <SuccessDialog
      open={open}
      onClose={onClose}
      title="Payment Successful!"
      description="Your payment has been processed successfully."
      type="payment"
      showConfetti
      details={[
        { label: "Amount", value: amount },
        ...(paymentMethod ? [{ label: "Method", value: paymentMethod }] : []),
        ...(transactionId ? [{ label: "Transaction ID", value: transactionId }] : []),
      ]}
      actions={[
        ...(onPrint
          ? [{ label: "Print Receipt", onClick: onPrint, icon: Printer, variant: "outline" as const }]
          : []),
        ...(onViewReceipt
          ? [{ label: "View Receipt", onClick: onViewReceipt, icon: FileText, variant: "outline" as const }]
          : []),
        { label: "Done", onClick: onClose, icon: CheckCircle2 },
      ]}
    />
  );
}

interface TreatmentCompleteProps {
  open: boolean;
  onClose: () => void;
  patientName: string;
  treatmentName: string;
  nextSteps?: string;
  onViewPatient?: () => void;
  onScheduleFollowUp?: () => void;
}

export function TreatmentCompleteDialog({
  open,
  onClose,
  patientName,
  treatmentName,
  nextSteps,
  onViewPatient,
  onScheduleFollowUp,
}: TreatmentCompleteProps) {
  return (
    <SuccessDialog
      open={open}
      onClose={onClose}
      title="Treatment Completed!"
      description={nextSteps || "The treatment has been successfully completed and recorded."}
      type="treatment"
      details={[
        { label: "Patient", value: patientName },
        { label: "Treatment", value: treatmentName },
      ]}
      actions={[
        ...(onScheduleFollowUp
          ? [{ label: "Schedule Follow-up", onClick: onScheduleFollowUp, icon: Calendar, variant: "outline" as const }]
          : []),
        ...(onViewPatient
          ? [{ label: "View Patient", onClick: onViewPatient, icon: ArrowRight, variant: "outline" as const }]
          : []),
        { label: "Done", onClick: onClose, icon: CheckCircle2 },
      ]}
    />
  );
}
