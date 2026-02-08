/**
 * AppointmentProgressBar - Patient-facing 4-step appointment progress stepper
 *
 * Steps: Scheduled → Confirmed → Completed → Finalized
 * Each step is clickable/tappable to reveal an explanation panel.
 */

import React, { useState } from "react";
import {
  Calendar,
  ShieldCheck,
  ClipboardCheck,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatClinicTime } from "@/lib/timezone";
import { AppointmentState } from "@/lib/appointmentStateMachine";
import { AnimatePresence, motion } from "framer-motion";

type ProgressStep = 1 | 2 | 3 | 4;

interface StepDefinition {
  step: ProgressStep;
  label: string;
  icon: React.ElementType;
}

const STEPS: StepDefinition[] = [
  { step: 1, label: "Scheduled", icon: Calendar },
  { step: 2, label: "Confirmed", icon: ShieldCheck },
  { step: 3, label: "Completed", icon: ClipboardCheck },
  { step: 4, label: "Finalized", icon: Lock },
];

interface AppointmentProgressBarProps {
  /** The derived appointment state from the state machine */
  appointmentState: AppointmentState;
  /** Raw status string from the appointment record */
  rawStatus: string;
  /** ISO date string of the appointment */
  appointmentDate: string;
  className?: string;
}

/**
 * Map the internal appointment state + raw status to the active progress step.
 *
 * Step 1 (Scheduled): appointment exists but not yet confirmed
 * Step 2 (Confirmed): status is 'confirmed', or any later state
 * Step 3 (Completed): visit has taken place (COMPLETED_DRAFT or COMPLETED_FINAL_*)
 * Step 4 (Finalized): COMPLETED_FINAL_UNPAID or COMPLETED_FINAL_PAID (dentist finalized)
 */
function deriveActiveStep(
  appointmentState: AppointmentState,
  rawStatus: string
): ProgressStep {
  switch (appointmentState) {
    case "CANCELLED":
      // Show progress frozen at whatever step was reached
      if (rawStatus === "confirmed") return 2;
      return 1;

    case "UPCOMING":
      if (rawStatus === "confirmed") return 2;
      return 1;

    case "COMPLETED_DRAFT":
      return 3;

    case "COMPLETED_FINAL_UNPAID":
    case "COMPLETED_FINAL_PAID":
      return 4;

    default:
      return 1;
  }
}

function getStepExplanation(
  step: ProgressStep,
  appointmentDate: string,
  isCancelled: boolean
): { title: string; body: string; action: string | null } {
  const formattedDate = formatClinicTime(appointmentDate, "EEEE, MMM d");
  const formattedTime = formatClinicTime(appointmentDate, "h:mm a");

  if (isCancelled) {
    return {
      title: "Cancelled",
      body: "This appointment was cancelled and did not take place.",
      action: null,
    };
  }

  switch (step) {
    case 1:
      return {
        title: "Scheduled",
        body: `Your appointment is booked for:\n📅 ${formattedDate} at ${formattedTime} (Local time)`,
        action: "No action is needed right now.",
      };
    case 2:
      return {
        title: "Confirmed",
        body: "Your dentist has reviewed and confirmed this appointment.",
        action:
          "Please arrive a few minutes early and bring any required documents (e.g. insurance card).",
      };
    case 3:
      return {
        title: "Completed",
        body: "This appointment has already happened.",
        action:
          "Clinical notes, treatment plans, or follow-ups related to this visit may appear below.",
      };
    case 4:
      return {
        title: "Finalized",
        body: "This appointment is now complete and securely stored in your medical record.",
        action: "No further changes can be made.",
      };
  }
}

export function AppointmentProgressBar({
  appointmentState,
  rawStatus,
  appointmentDate,
  className,
}: AppointmentProgressBarProps) {
  const [expandedStep, setExpandedStep] = useState<ProgressStep | null>(null);
  const activeStep = deriveActiveStep(appointmentState, rawStatus);
  const isCancelled = appointmentState === "CANCELLED";

  const toggleStep = (step: ProgressStep) => {
    setExpandedStep((prev) => (prev === step ? null : step));
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Step indicators */}
      <div className="flex items-center w-full px-2">
        {STEPS.map((s, index) => {
          const isActive = s.step === activeStep;
          const isCompleted = s.step < activeStep;
          const isFuture = s.step > activeStep;
          const Icon = s.icon;

          return (
            <React.Fragment key={s.step}>
              {/* Step circle + label */}
              <button
                type="button"
                onClick={() => toggleStep(s.step)}
                className={cn(
                  "flex flex-col items-center gap-1.5 group relative",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg p-1 -m-1",
                  "transition-colors cursor-pointer",
                  isCancelled && "opacity-60"
                )}
                aria-expanded={expandedStep === s.step}
                aria-label={`Step ${s.step}: ${s.label}${isActive ? " (current)" : ""}${isCompleted ? " (done)" : ""}`}
              >
                {/* Circle */}
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border-2 flex-shrink-0",
                    isCompleted &&
                      "bg-emerald-500 border-emerald-500 text-white",
                    isActive &&
                      !isCancelled &&
                      "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20",
                    isActive &&
                      isCancelled &&
                      "bg-red-500 border-red-500 text-white ring-4 ring-red-200 dark:ring-red-900/30",
                    isFuture &&
                      "bg-muted border-muted-foreground/20 text-muted-foreground/50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "text-[11px] font-medium leading-tight text-center whitespace-nowrap",
                    isCompleted && "text-emerald-700 dark:text-emerald-400",
                    isActive && !isCancelled && "text-primary font-semibold",
                    isActive && isCancelled && "text-red-600 dark:text-red-400 font-semibold",
                    isFuture && "text-muted-foreground/50"
                  )}
                >
                  {s.label}
                </span>
              </button>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div className="flex-1 mx-1.5 mt-[-18px]">
                  <div
                    className={cn(
                      "h-0.5 w-full rounded-full transition-all duration-500",
                      s.step < activeStep
                        ? "bg-emerald-500"
                        : "bg-muted-foreground/15"
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Expanded explanation panel */}
      <AnimatePresence mode="wait">
        {expandedStep !== null && (
          <motion.div
            key={expandedStep}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-3 mx-1 p-3.5 rounded-xl bg-muted/50 border border-border/50">
              {(() => {
                const explanation = getStepExplanation(
                  expandedStep,
                  appointmentDate,
                  isCancelled && expandedStep === activeStep
                );
                return (
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold text-foreground">
                      {explanation.title}
                    </p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                      {explanation.body}
                    </p>
                    {explanation.action && (
                      <p className="text-xs text-muted-foreground/80 italic">
                        {explanation.action}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
