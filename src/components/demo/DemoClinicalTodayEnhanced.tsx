/**
 * Enhanced Clinical Today Demo with improved UX
 */

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Calendar, AlertCircle, BarChart3, Users, Plus, 
  Clock, MessageSquare, FileText, Activity
} from "lucide-react";
import { 
  TimeGreeting, 
  QuickActions, 
  AnimatedStatCard,
  AppointmentStatusBadge,
  QuickPeekCard,
  AvatarWithInitials,
  LastVisit
} from "@/components/ui/page-enhancements";
import { StaggeredList, PulseIndicator } from "@/components/ui/micro-interactions";
import { motion } from "framer-motion";

export function DemoClinicalTodayEnhanced() {
  // Quick actions for the dashboard
  const quickActions = [
    { 
      icon: Plus, 
      label: "New Appointment", 
      onClick: () => {},
      color: "bg-primary"
    },
    { 
      icon: Users, 
      label: "Add Patient", 
      onClick: () => {},
      color: "bg-secondary"
    },
    { 
      icon: MessageSquare, 
      label: "Messages", 
      onClick: () => {},
      badge: 3
    },
    { 
      icon: FileText, 
      label: "Documents", 
      onClick: () => {}
    },
  ];

  const appointments = [
    { 
      time: "9:00 AM", 
      patient: "John Smith", 
      reason: "Routine Checkup", 
      status: "completed" as const,
      avatar: null,
      email: "john@example.com"
    },
    { 
      time: "10:30 AM", 
      patient: "Sarah Johnson", 
      reason: "Tooth Pain", 
      status: "in-progress" as const,
      avatar: null,
      email: "sarah@example.com"
    },
    { 
      time: "11:00 AM", 
      patient: "Mike Davis", 
      reason: "Cleaning", 
      status: "upcoming" as const,
      avatar: null,
      email: "mike@example.com"
    },
    { 
      time: "2:00 PM", 
      patient: "Emma Wilson", 
      reason: "Root Canal", 
      status: "upcoming" as const,
      avatar: null,
      email: "emma@example.com"
    },
    { 
      time: "3:00 PM", 
      patient: "David Brown", 
      reason: "Follow-up", 
      status: "upcoming" as const,
      avatar: null,
      email: "david@example.com"
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Time of Day Greeting */}
      <TimeGreeting name="Dr. Smith" />

      {/* Quick Actions */}
      <QuickActions actions={quickActions} />

      {/* Stats Grid with Animated Counters */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-tour="stats-cards">
        <AnimatedStatCard
          title="Today's Appointments"
          value={12}
          icon={Calendar}
          trend={8}
          gradient="from-blue-500 to-cyan-500"
        />
        <AnimatedStatCard
          title="Urgent Cases"
          value={3}
          icon={AlertCircle}
          trend={-25}
          gradient="from-red-500 to-orange-500"
        />
        <AnimatedStatCard
          title="Completion Rate"
          value={94}
          suffix="%"
          icon={BarChart3}
          trend={5}
          gradient="from-green-500 to-emerald-500"
        />
        <AnimatedStatCard
          title="Total Patients"
          value={248}
          icon={Users}
          trend={12}
          gradient="from-purple-500 to-pink-500"
        />
      </div>

      {/* Today's Appointments List with Enhanced Items */}
      <Card className="p-6" data-tour="appointments-list">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Today's Appointments</h2>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <PulseIndicator size="sm" color="success" />
              <span>1 in progress</span>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            View All
          </Button>
        </div>
        
        <StaggeredList className="space-y-3" staggerDelay={0.08}>
          {appointments.map((apt, idx) => (
            <QuickPeekCard
              key={idx}
              preview={
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <AvatarWithInitials name={apt.patient} size="lg" />
                    <div>
                      <p className="font-semibold">{apt.patient}</p>
                      <p className="text-sm text-muted-foreground">{apt.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Reason</p>
                      <p className="font-medium">{apt.reason}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Visit</p>
                      <LastVisit date={new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1">Start Consultation</Button>
                    <Button size="sm" variant="outline">Reschedule</Button>
                  </div>
                </div>
              }
            >
              <motion.div
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer group"
                whileHover={{ x: 4 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-4">
                  <AvatarWithInitials 
                    name={apt.patient} 
                    size="md"
                    showStatus
                    status={apt.status === "in-progress" ? "online" : "offline"}
                  />
                  <div className="text-sm font-medium text-muted-foreground w-24">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {apt.time}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium group-hover:text-primary transition-colors">
                      {apt.patient}
                    </div>
                    <div className="text-sm text-muted-foreground">{apt.reason}</div>
                  </div>
                </div>
                <AppointmentStatusBadge status={apt.status} />
              </motion.div>
            </QuickPeekCard>
          ))}
        </StaggeredList>
      </Card>

      {/* Activity Feed */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Recent Activity</h2>
        </div>
        <div className="space-y-4">
          {[
            { time: "10 min ago", action: "Appointment completed", patient: "John Smith" },
            { time: "25 min ago", action: "New message received", patient: "Sarah Johnson" },
            { time: "1 hour ago", action: "Payment received", patient: "Mike Davis" },
          ].map((activity, idx) => (
            <motion.div
              key={idx}
              className="flex items-center gap-4 text-sm"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-muted-foreground w-20">{activity.time}</span>
              <span>{activity.action} - <span className="font-medium">{activity.patient}</span></span>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}
