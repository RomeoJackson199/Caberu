import { useState, useEffect, useCallback } from "react";
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS } from "react-joyride";
import { DentistSection } from "@/components/layout/DentistAppShell";
import { supabase } from "@/integrations/supabase/client";

const TOUR_KEY = 'dentist-dashboard';

interface DentistDemoTourProps {
  run: boolean;
  onClose: () => void;
  onChangeSection?: (section: DentistSection) => void;
}

// Map step indices to the section they should navigate to
const STEP_SECTION_MAP: Record<number, DentistSection | null> = {
  0: null,        // Welcome - stay on current
  1: 'dashboard', // Dashboard nav
  2: 'dashboard', // Stats cards
  3: 'dashboard', // Appointments timeline
  4: 'patients',  // Patients nav
  5: 'appointments', // Appointments nav
  6: 'messages',  // Messages nav
  7: null,        // Notifications - stay on current
  8: null,        // User menu - stay on current
  9: null,        // Completion - stay on current
};

export function DentistDemoTour({ run, onClose, onChangeSection }: DentistDemoTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    setRunTour(run);
  }, [run]);

  const markTourComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('tour_completions').upsert({
        user_id: user.id,
        tour_type: TOUR_KEY,
        completed_at: new Date().toISOString()
      }, { onConflict: 'user_id,tour_type' });

      localStorage.setItem('dentist-tour-completed', 'true');
    } catch (error) {
      console.error('Failed to save tour completion:', error);
      localStorage.setItem('dentist-tour-completed', 'true');
    }
  };

  const steps: Step[] = [
    // Step 0: Welcome
    {
      target: "body",
      content: (
        <div className="p-2">
          <h2 className="text-xl font-bold mb-3">Welcome to Your Practice Dashboard!</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Let's walk through the key features that will help you run your practice smoothly. This tour takes about 1 minute.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              Dashboard &amp; Stats
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              Patient Records
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
              Scheduling
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              Messages &amp; Settings
            </div>
          </div>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
    // Step 1: Dashboard nav
    {
      target: '[data-tour="nav-dashboard"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Dashboard Overview</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Your command center for daily operations. See today's appointments, urgent cases, and key performance metrics at a glance.
          </p>
          <div className="text-xs bg-primary/5 border border-primary/10 rounded-md p-2">
            <span className="font-medium text-primary">Tip:</span>{" "}
            The dashboard refreshes automatically so you always have the latest data.
          </div>
        </div>
      ),
      placement: "bottom",
    },
    // Step 2: Stats cards
    {
      target: '[data-tour="stats-cards"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Practice Statistics</h3>
          <p className="text-sm text-muted-foreground mb-3">
            These live metrics track your day at a glance:
          </p>
          <ul className="text-xs text-muted-foreground space-y-1.5 mb-3">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
              <span><strong>Today</strong> &mdash; appointments scheduled for today</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 shrink-0" />
              <span><strong>Pending</strong> &mdash; appointments awaiting confirmation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
              <span><strong>This Week</strong> &mdash; completed appointments this week</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1 shrink-0" />
              <span><strong>Patients</strong> &mdash; total patients in your practice</span>
            </li>
          </ul>
          <div className="text-xs bg-primary/5 border border-primary/10 rounded-md p-2">
            <span className="font-medium text-primary">Tip:</span>{" "}
            Click any stat to jump directly to the relevant section.
          </div>
        </div>
      ),
      placement: "bottom",
    },
    // Step 3: Today's timeline
    {
      target: '[data-tour="appointments-list"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Today's Appointment Timeline</h3>
          <p className="text-sm text-muted-foreground mb-3">
            A chronological view of your day, split into morning and afternoon blocks. You can see patient names, appointment times, reasons, and urgency levels.
          </p>
          <div className="text-xs bg-primary/5 border border-primary/10 rounded-md p-2">
            <span className="font-medium text-primary">Tip:</span>{" "}
            Your next upcoming appointment is highlighted so you always know what's coming up.
          </div>
        </div>
      ),
      placement: "top",
    },
    // Step 4: Patients nav
    {
      target: '[data-tour="nav-patients"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Patient Management</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Your complete patient database. Add new patients, search records, view treatment histories, and manage all patient information in one place.
          </p>
          <div className="text-xs bg-primary/5 border border-primary/10 rounded-md p-2">
            <span className="font-medium text-primary">Tip:</span>{" "}
            Use the search bar to quickly find any patient by name, email, or phone number.
          </div>
        </div>
      ),
      placement: "bottom",
    },
    // Step 5: Appointments nav
    {
      target: '[data-tour="nav-appointments"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Appointment Scheduling</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Schedule, reschedule, and manage all your appointments. The calendar view helps you visualize your availability and avoid double-booking.
          </p>
          <div className="text-xs bg-primary/5 border border-primary/10 rounded-md p-2">
            <span className="font-medium text-primary">Tip:</span>{" "}
            Patients can also book appointments online, and you can require approval before they are confirmed.
          </div>
        </div>
      ),
      placement: "bottom",
    },
    // Step 6: Messages nav
    {
      target: '[data-tour="nav-messages"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Patient Messages</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Communicate with your patients securely. Send appointment reminders, follow-up care instructions, and respond to inquiries &mdash; all from one inbox.
          </p>
          <div className="text-xs bg-primary/5 border border-primary/10 rounded-md p-2">
            <span className="font-medium text-primary">Tip:</span>{" "}
            You'll see a badge on this tab when you have unread messages waiting.
          </div>
        </div>
      ),
      placement: "bottom",
    },
    // Step 7: Notification bell
    {
      target: '[data-tour="notification-bell"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Notifications</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Stay on top of everything happening in your practice. You'll be notified about new bookings, cancellations, patient messages, and more.
          </p>
          <div className="text-xs bg-primary/5 border border-primary/10 rounded-md p-2">
            <span className="font-medium text-primary">Tip:</span>{" "}
            A red dot appears when you have unread notifications so you never miss anything important.
          </div>
        </div>
      ),
      placement: "bottom",
    },
    // Step 8: User menu
    {
      target: '[data-tour="user-menu"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Account &amp; Settings</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Manage your profile, practice branding, security settings, and preferences. You can also configure your availability schedule and notification preferences here.
          </p>
          <div className="text-xs bg-primary/5 border border-primary/10 rounded-md p-2">
            <span className="font-medium text-primary">Tip:</span>{" "}
            Set up your practice branding early &mdash; your logo and colors will appear on patient-facing pages.
          </div>
        </div>
      ),
      placement: "bottom",
    },
    // Step 9: Completion
    {
      target: "body",
      content: (
        <div className="p-2">
          <h2 className="text-xl font-bold mb-3">You're All Set!</h2>
          <p className="text-sm text-muted-foreground mb-4">
            You now know the essentials. Here are some great next steps to get your practice up and running:
          </p>
          <ol className="text-xs text-muted-foreground space-y-2 mb-4 list-none">
            <li className="flex items-start gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px] font-bold">1</span>
              <span>Complete your profile and add your practice details</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px] font-bold">2</span>
              <span>Set your availability so patients can book online</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px] font-bold">3</span>
              <span>Add your first patient or import existing records</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px] font-bold">4</span>
              <span>Schedule your first appointment</span>
            </li>
          </ol>
          <div className="text-xs bg-primary/5 border border-primary/10 rounded-md p-2">
            You can restart this tour anytime from the onboarding checklist.
          </div>
        </div>
      ),
      placement: "center",
    },
  ];

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, type, index, action } = data;

    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      setRunTour(false);
      setStepIndex(0);
      // Navigate back to dashboard on tour end
      onChangeSection?.('dashboard');
      markTourComplete();
      onClose();
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);

      // Navigate to the appropriate section for the next step
      const targetSection = STEP_SECTION_MAP[nextStepIndex];
      if (targetSection && onChangeSection) {
        onChangeSection(targetSection);
      }

      setStepIndex(nextStepIndex);
    }
  }, [onClose, onChangeSection]);

  return (
    <Joyride
      steps={steps}
      run={runTour}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableScrolling={false}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          textColor: "hsl(var(--foreground))",
          backgroundColor: "hsl(var(--background))",
          arrowColor: "hsl(var(--background))",
          overlayColor: "rgba(0, 0, 0, 0.45)",
          zIndex: 10000,
          width: 380,
        },
        tooltip: {
          borderRadius: "0.75rem",
          padding: "1.25rem",
          boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        },
        tooltipContainer: {
          textAlign: "left",
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
          borderRadius: "0.5rem",
          padding: "0.5rem 1.25rem",
          fontSize: "0.875rem",
          fontWeight: 600,
        },
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
          marginRight: "0.5rem",
          fontSize: "0.875rem",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
          fontSize: "0.8125rem",
        },
        spotlight: {
          borderRadius: "0.5rem",
        },
      }}
      locale={{
        back: "Back",
        close: "Close",
        last: "Get Started",
        next: "Next",
        skip: "Skip Tour",
      }}
    />
  );
}
