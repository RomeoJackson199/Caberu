/**
 * Floating Quick Action - Mobile FAB for quick actions
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  X, 
  Calendar, 
  Users, 
  MessageSquare,
  UserPlus
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface QuickActionItem {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  color?: string;
}

interface FloatingQuickActionProps {
  className?: string;
  onNewAppointment?: () => void;
  onViewPatients?: () => void;
  onMessages?: () => void;
  onAddPatient?: () => void;
}

export function FloatingQuickAction({ 
  className,
  onNewAppointment,
  onViewPatients,
  onMessages,
  onAddPatient
}: FloatingQuickActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();

  const actions: QuickActionItem[] = [
    {
      icon: Calendar,
      label: t.newAppointment || "New Appointment",
      onClick: () => {
        onNewAppointment?.();
        setIsOpen(false);
      },
      color: "bg-blue-500 hover:bg-blue-600"
    },
    {
      icon: Users,
      label: t.patient || "Patients",
      onClick: () => {
        onViewPatients?.();
        setIsOpen(false);
      },
      color: "bg-purple-500 hover:bg-purple-600"
    },
    {
      icon: MessageSquare,
      label: "Messages",
      onClick: () => {
        onMessages?.();
        setIsOpen(false);
      },
      color: "bg-emerald-500 hover:bg-emerald-600"
    },
  ];

  // Only show on mobile
  return (
    <div className={cn("fixed bottom-6 right-6 z-50 sm:hidden", className)}>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Action buttons */}
            <div className="absolute bottom-16 right-0 flex flex-col-reverse items-end gap-3">
              {actions.map((action, index) => (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <span className="px-3 py-1.5 rounded-lg bg-card border shadow-lg text-sm font-medium whitespace-nowrap">
                    {action.label}
                  </span>
                  <Button
                    size="icon"
                    className={cn(
                      "h-12 w-12 rounded-full shadow-lg",
                      action.color
                    )}
                    onClick={action.onClick}
                  >
                    <action.icon className="h-5 w-5 text-white" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.div
        whileTap={{ scale: 0.95 }}
      >
        <Button
          size="icon"
          className={cn(
            "h-14 w-14 rounded-full shadow-xl",
            "bg-primary hover:bg-primary/90",
            isOpen && "rotate-45"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {isOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Plus className="h-6 w-6" />
            )}
          </motion.div>
        </Button>
      </motion.div>
    </div>
  );
}
