import React, { createContext, useContext, useState, useCallback, useRef } from "react";
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

interface UnsavedChangesContextType {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  /** Call before navigating. Returns true if safe to proceed, false if blocked. */
  confirmNavigation: (onConfirm: () => void) => boolean;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType>({
  hasUnsavedChanges: false,
  setHasUnsavedChanges: () => {},
  confirmNavigation: () => true,
});

export const useUnsavedChangesGuard = () => useContext(UnsavedChangesContext);

export const UnsavedChangesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const confirmNavigation = useCallback((onConfirm: () => void) => {
    if (!hasUnsavedChanges) {
      onConfirm();
      return true;
    }
    pendingActionRef.current = onConfirm;
    setShowDialog(true);
    return false;
  }, [hasUnsavedChanges]);

  const handleConfirm = () => {
    setShowDialog(false);
    setHasUnsavedChanges(false);
    pendingActionRef.current?.();
    pendingActionRef.current = null;
  };

  const handleCancel = () => {
    setShowDialog(false);
    pendingActionRef.current = null;
  };

  return (
    <UnsavedChangesContext.Provider value={{ hasUnsavedChanges, setHasUnsavedChanges, confirmNavigation }}>
      {children}

      <AlertDialog open={showDialog} onOpenChange={(open) => !open && handleCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes that will be lost if you navigate away. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Stay on Page</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UnsavedChangesContext.Provider>
  );
};
