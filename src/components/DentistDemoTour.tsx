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
    {
      target: "body",
      content: (
        <div className="p-4">
          <h2 className="text-2xl font-bold mb-3">Welcome to Your Dentist Dashboard! 🦷</h2>
          <p className="text-muted-foreground">
            Let's take a quick tour of the key features that will help you manage your practice efficiently.
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
    {
      target: '[data-tour="nav-dashboard"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Dashboard Overview</h3>
          <p className="text-sm text-muted-foreground">
            Here you can see today's appointments, urgent cases, and key statistics at a glance.
            This is your command center for daily operations.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: '[data-tour="stats-cards"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Quick Stats</h3>
          <p className="text-sm text-muted-foreground">
            Monitor today's appointments, urgent cases, weekly completion rate, and total patient count.
            These metrics help you stay on top of your practice's performance.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: '[data-tour="appointments-list"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Today's Appointments</h3>
          <p className="text-sm text-muted-foreground">
            View all appointments scheduled for today. You can quickly see patient names, appointment times,
            reasons, and urgency levels. Click on any appointment to view more details.
          </p>
        </div>
      ),
      placement: "top",
    },
    {
      target: '[data-tour="nav-patients"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Patient Management</h3>
          <p className="text-sm text-muted-foreground">
            Access your complete patient database here. You can add new patients, view patient histories,
            update records, and manage patient information all in one place.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: '[data-tour="nav-appointments"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Appointment Scheduling</h3>
          <p className="text-sm text-muted-foreground">
            Schedule new appointments, view your calendar, reschedule existing appointments,
            and manage your availability. The calendar view helps you visualize your schedule.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: '[data-tour="nav-employees"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Staff Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage your team members, assign roles, track staff schedules, and coordinate
            with your hygienists, receptionists, and other dental professionals.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: '[data-tour="nav-messages"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Patient Messages</h3>
          <p className="text-sm text-muted-foreground">
            Communicate with your patients securely. Send appointment reminders,
            follow-up messages, and respond to patient inquiries all from one place.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: '[data-tour="user-menu"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Settings & Profile</h3>
          <p className="text-sm text-muted-foreground">
            Access your account settings, practice branding, security settings, and more.
            Customize your dashboard to match your practice's unique needs.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: "body",
      content: (
        <div className="p-4">
          <h2 className="text-2xl font-bold mb-3">You're All Set! 🎉</h2>
          <p className="text-muted-foreground mb-3">
            You now know the key features of your dentist dashboard. You can restart this tour
            anytime by clicking the "Start Tour" button.
          </p>
          <p className="text-sm text-muted-foreground">
            Ready to transform your dental practice? Let's get started!
          </p>
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
      // Mark tour as completed in database
      markTourComplete();
      onClose();
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      setStepIndex(nextStepIndex);
    }
  }, [onClose]);

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
          overlayColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: "0.5rem",
          padding: "1rem",
        },
        tooltipContainer: {
          textAlign: "left",
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
          borderRadius: "0.375rem",
          padding: "0.5rem 1rem",
          fontSize: "0.875rem",
          fontWeight: 500,
        },
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
          marginRight: "0.5rem",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
        },
      }}
      locale={{
        back: "Back",
        close: "Close",
        last: "Finish",
        next: "Next",
        skip: "Skip Tour",
      }}
    />
  );
}
