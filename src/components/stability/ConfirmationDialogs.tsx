import React, { useState, useCallback, createContext, useContext, ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CheckCircle2, Info, Trash2, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

// Types for confirmation dialogs
export type ConfirmationType = "danger" | "warning" | "info" | "success" | "financial";

interface ConfirmationConfig {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: ConfirmationType;
  requireTypedConfirmation?: string; // User must type this to confirm
  loading?: boolean;
}

interface ConfirmationContextType {
  confirm: (config: ConfirmationConfig) => Promise<boolean>;
  confirmDanger: (title: string, description: string) => Promise<boolean>;
  confirmFinancial: (title: string, description: string, amount?: string) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextType | null>(null);

/**
 * Retrieves the confirmation context created by ConfirmationProvider.
 *
 * @returns The confirmation context exposing `confirm`, `confirmDanger`, and `confirmFinancial` methods.
 * @throws If called outside of a `ConfirmationProvider`.
 */
export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error("useConfirmation must be used within a ConfirmationProvider");
  }
  return context;
}

/**
 * Provides a confirmation dialog context and renders a global confirmation dialog UI.
 *
 * @returns The provider element that supplies `confirm`, `confirmDanger`, and `confirmFinancial` methods to descendants and renders its children along with the configurable AlertDialog used for confirmations.
 */
export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ConfirmationConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [typedValue, setTypedValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const resolverRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((newConfig: ConfirmationConfig): Promise<boolean> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setConfig(newConfig);
      setTypedValue("");
      setIsOpen(true);
    });
  }, []);

  const confirmDanger = useCallback((title: string, description: string): Promise<boolean> => {
    return confirm({
      title,
      description,
      type: "danger",
      confirmLabel: "Delete",
    });
  }, [confirm]);

  const confirmFinancial = useCallback((title: string, description: string, amount?: string): Promise<boolean> => {
    return confirm({
      title,
      description: amount ? `${description}\n\nAmount: ${amount}` : description,
      type: "financial",
      confirmLabel: "Confirm Payment",
    });
  }, [confirm]);

  const handleConfirm = useCallback(async () => {
    if (config?.requireTypedConfirmation && typedValue !== config.requireTypedConfirmation) {
      return;
    }
    setIsLoading(true);
    // Small delay for UX
    await new Promise(r => setTimeout(r, 200));
    setIsLoading(false);
    setIsOpen(false);
    resolverRef.current?.(true);
  }, [config, typedValue]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resolverRef.current?.(false);
  }, []);

  const getTypeConfig = (type: ConfirmationType = "info") => {
    switch (type) {
      case "danger":
        return {
          icon: Trash2,
          iconClass: "text-red-500",
          buttonClass: "bg-red-600 hover:bg-red-700 text-white",
          bgClass: "bg-red-50 dark:bg-red-950/20",
        };
      case "warning":
        return {
          icon: AlertTriangle,
          iconClass: "text-amber-500",
          buttonClass: "bg-amber-600 hover:bg-amber-700 text-white",
          bgClass: "bg-amber-50 dark:bg-amber-950/20",
        };
      case "financial":
        return {
          icon: DollarSign,
          iconClass: "text-emerald-500",
          buttonClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
          bgClass: "bg-emerald-50 dark:bg-emerald-950/20",
        };
      case "success":
        return {
          icon: CheckCircle2,
          iconClass: "text-green-500",
          buttonClass: "bg-green-600 hover:bg-green-700 text-white",
          bgClass: "bg-green-50 dark:bg-green-950/20",
        };
      default:
        return {
          icon: Info,
          iconClass: "text-blue-500",
          buttonClass: "",
          bgClass: "bg-blue-50 dark:bg-blue-950/20",
        };
    }
  };

  const typeConfig = config ? getTypeConfig(config.type) : getTypeConfig("info");
  const Icon = typeConfig.icon;
  const canConfirm = !config?.requireTypedConfirmation || typedValue === config.requireTypedConfirmation;

  return (
    <ConfirmationContext.Provider value={{ confirm, confirmDanger, confirmFinancial }}>
      {children}
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className={cn("mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2", typeConfig.bgClass)}>
              <Icon className={cn("h-6 w-6", typeConfig.iconClass)} />
            </div>
            <AlertDialogTitle className="text-center">{config?.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-center whitespace-pre-line">
              {config?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {config?.requireTypedConfirmation && (
            <div className="my-4">
              <p className="text-sm text-muted-foreground mb-2">
                Type <span className="font-mono font-bold text-foreground">{config.requireTypedConfirmation}</span> to confirm:
              </p>
              <input
                type="text"
                value={typedValue}
                onChange={(e) => setTypedValue(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={config.requireTypedConfirmation}
                autoFocus
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
              {config?.cancelLabel || "Cancel"}
            </AlertDialogCancel>
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm || isLoading}
              className={cn(typeConfig.buttonClass)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                config?.confirmLabel || "Confirm"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmationContext.Provider>
  );
}

// Simple inline confirmation button with built-in dialog
interface ConfirmButtonProps {
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  type?: ConfirmationType;
  confirmLabel?: string;
  children: ReactNode;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
}

/**
 * Renders a trigger button that opens a confirmation dialog and runs an action when confirmed.
 *
 * The dialog shows an icon and styling based on `type`, displays `title` and `description`,
 * and disables controls while the confirmation action is in progress.
 *
 * @param onConfirm - Callback invoked when the user confirms; if it returns a promise, the dialog shows a loading state until it settles.
 * @param title - Dialog title text.
 * @param description - Dialog description text.
 * @param type - Visual variant for the dialog and confirm button (`"danger" | "warning" | "info" | "success" | "financial"`).
 * @param confirmLabel - Label for the confirm button.
 * @param children - Content rendered inside the trigger button.
 * @param className - Additional CSS classes applied to the trigger button.
 * @param variant - Button variant for the trigger.
 * @param size - Button size for the trigger.
 * @param disabled - Whether the trigger button is disabled.
 * @returns A React element that renders the trigger button and the associated confirmation dialog.
 */
export function ConfirmButton({
  onConfirm,
  title,
  description,
  type = "warning",
  confirmLabel = "Confirm",
  children,
  className,
  variant = "default",
  size = "default",
  disabled = false,
}: ConfirmButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const typeConfig = {
    danger: { icon: Trash2, iconClass: "text-red-500", buttonClass: "bg-red-600 hover:bg-red-700" },
    warning: { icon: AlertTriangle, iconClass: "text-amber-500", buttonClass: "bg-amber-600 hover:bg-amber-700" },
    financial: { icon: DollarSign, iconClass: "text-emerald-500", buttonClass: "bg-emerald-600 hover:bg-emerald-700" },
    success: { icon: CheckCircle2, iconClass: "text-green-500", buttonClass: "bg-green-600 hover:bg-green-700" },
    info: { icon: Info, iconClass: "text-blue-500", buttonClass: "" },
  }[type];

  const Icon = typeConfig.icon;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setIsOpen(true)}
        disabled={disabled}
      >
        {children}
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2">
              <Icon className={cn("h-6 w-6", typeConfig.iconClass)} />
            </div>
            <AlertDialogTitle className="text-center">{title}</AlertDialogTitle>
            <AlertDialogDescription className="text-center">{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className={cn("text-white", typeConfig.buttonClass)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                confirmLabel
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}