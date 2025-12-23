/**
 * Demo Clinical Today Dashboard - mirrors ClinicalToday.tsx exactly with hardcoded data
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User as UserIcon, CheckCircle, Plus, Users, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { AnimatedBackground, EmptyState } from "@/components/ui/polished-components";
import { TimeGreeting, QuickActions, AnimatedStatCard } from "@/components/ui/page-enhancements";

// Demo data - hardcoded appointments
const DEMO_APPOINTMENTS = [
  {
    id: "demo-apt-1",
    appointment_date: new Date().setHours(9, 0, 0, 0),
    patient_name: "John Smith",
    reason: "Routine Checkup",
    status: "confirmed",
    urgency: "normal",
    profiles: { first_name: "John", last_name: "Smith" }
  },
  {
    id: "demo-apt-2",
    appointment_date: new Date().setHours(10, 30, 0, 0),
    patient_name: "Sarah Johnson",
    reason: "Tooth Pain - Emergency",
    status: "pending",
    urgency: "high",
    profiles: { first_name: "Sarah", last_name: "Johnson" }
  },
  {
    id: "demo-apt-3",
    appointment_date: new Date().setHours(14, 0, 0, 0),
    patient_name: "Mike Davis",
    reason: "Crown Fitting",
    status: "confirmed",
    urgency: "normal",
    profiles: { first_name: "Mike", last_name: "Davis" }
  }
];

// Demo pending approvals
const DEMO_PENDING_APPROVALS = [
  {
    id: "demo-pending-1",
    appointment_date: new Date(Date.now() + 86400000).setHours(11, 0, 0, 0),
    patient_name: "Romeo Jackson",
    reason: "Dental Cleaning",
    patient_id: "demo-patient-1",
    profiles: { first_name: "Romeo", last_name: "Jackson" }
  },
  {
    id: "demo-pending-2",
    appointment_date: new Date(Date.now() + 172800000).setHours(15, 30, 0, 0),
    patient_name: "Emma Wilson",
    reason: "Wisdom Tooth Consultation",
    patient_id: "demo-patient-2",
    profiles: { first_name: "Emma", last_name: "Wilson" }
  }
];

// Demo Pending Approval Card - matches PendingApprovalCard.tsx
function DemoPendingApprovalCard() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const pendingAppointments = DEMO_PENDING_APPROVALS;

  const goToPrevious = () => setCurrentIndex(prev => Math.max(0, prev - 1));
  const goToNext = () => setCurrentIndex(prev => Math.min(pendingAppointments.length - 1, prev + 1));

  const currentAppointment = pendingAppointments[currentIndex];

  const formatClinicTime = (date: number, formatStr: string) => {
    return format(new Date(date), formatStr);
  };

  return (
    <Card className="relative overflow-hidden border-none shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-500 opacity-10" />
      <div className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10 p-4">
        <span className="text-sm font-medium">Pending Approvals</span>
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
          <Clock className="h-5 w-5 text-white" />
        </div>
      </div>
      <CardContent className="relative z-10 pt-0">
        {currentAppointment && (
          <div className="space-y-3">
            {/* Navigation */}
            {pendingAppointments.length > 1 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span>{currentIndex + 1} / {pendingAppointments.length}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={goToNext}
                  disabled={currentIndex === pendingAppointments.length - 1}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Current appointment */}
            <div className="p-3 bg-background/80 rounded-lg border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <UserIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium truncate underline underline-offset-2">
                  {currentAppointment.profiles.first_name} {currentAppointment.profiles.last_name}
                </span>
              </div>
              
              <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20 mb-3">
                {formatClinicTime(currentAppointment.appointment_date, 'MMM d, HH:mm')}
              </Badge>

              {currentAppointment.reason && (
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {currentAppointment.reason}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DemoClinicalTodayEnhanced() {
  // Demo stats
  const stats = {
    todayCount: 2,
    weekCompleted: 12,
    totalPatients: 47
  };

  const todayAppointments = DEMO_APPOINTMENTS;

  const getPatientName = (appointment: typeof DEMO_APPOINTMENTS[0]) => {
    if (appointment.profiles) {
      return `${appointment.profiles.first_name} ${appointment.profiles.last_name}`;
    }
    return appointment.patient_name || 'Unknown Patient';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success/10 text-success border-success/20';
      case 'confirmed': return 'bg-primary/10 text-primary border-primary/20';
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  // Quick actions for the dashboard - matches ClinicalToday.tsx
  const quickActions = [
    {
      icon: Plus,
      label: "New",
      onClick: () => {},
      color: "bg-primary"
    },
    {
      icon: Users,
      label: "Patients",
      onClick: () => {},
      color: "bg-purple-500"
    },
    {
      icon: Calendar,
      label: "Schedule",
      onClick: () => {},
      color: "bg-emerald-500"
    },
    {
      icon: FileText,
      label: "Records",
      onClick: () => {},
      color: "bg-orange-500"
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      {/* Enhanced Welcome Header with Time Greeting - matches ClinicalToday.tsx */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 rounded-2xl p-4 sm:p-6 shadow-sm">
        <AnimatedBackground />
        <div className="relative z-10">
          <TimeGreeting showDate={true} />
        </div>
      </div>

      {/* Quick Actions - matches ClinicalToday.tsx */}
      <QuickActions actions={quickActions} columns={4} />

      {/* Quick Stats with Animated Cards - matches ClinicalToday.tsx layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" data-tour="stats-cards">
        <AnimatedStatCard
          title="Today's Appointments"
          value={stats.todayCount}
          icon={Calendar}
          gradient="from-blue-500 to-cyan-500"
        />

        {/* Pending Approval Card - matches ClinicalToday.tsx */}
        <DemoPendingApprovalCard />

        <AnimatedStatCard
          title="Completed This Week"
          value={stats.weekCompleted}
          icon={CheckCircle}
          gradient="from-green-500 to-emerald-500"
        />

        <AnimatedStatCard
          title="Patients"
          value={stats.totalPatients}
          icon={UserIcon}
          gradient="from-indigo-500 to-blue-500"
        />
      </div>

      {/* Today's Schedule - matches ClinicalToday.tsx */}
      <Card className="border-none shadow-sm" data-tour="appointments-list">
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-base sm:text-lg font-semibold">Today's Schedule</h2>
            <Button
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Appointment
            </Button>
          </div>

          <div className="space-y-2 sm:space-y-3">
            {todayAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="group flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border bg-card hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-500/40 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 w-full min-w-0">
                  <div className="flex flex-col items-center justify-center min-w-[50px] sm:min-w-[60px] flex-shrink-0">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground mb-1" />
                    <span className="text-xs sm:text-sm font-medium">
                      {format(new Date(appointment.appointment_date), 'HH:mm')}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-medium text-sm sm:text-base truncate">{getPatientName(appointment)}</p>
                      {appointment.urgency === 'high' && (
                        <Badge variant="destructive" className="text-xs flex-shrink-0">Urgent</Badge>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                      {appointment.reason || 'No reason specified'}
                    </p>
                  </div>
                </div>

                <Badge variant="outline" className={`${getStatusColor(appointment.status)} text-xs flex-shrink-0 self-start sm:self-center`}>
                  {appointment.status}
                </Badge>
              </div>
            ))}

            <Button
              variant="outline"
              className="w-full mt-3 sm:mt-4"
            >
              View All Appointments
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
