/**
 * Enhanced Appointments Demo with improved UX
 */

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, AlertTriangle } from "lucide-react";
import { 
  AppointmentStatusBadge,
  QuickPeekCard,
  AvatarWithInitials 
} from "@/components/ui/page-enhancements";
import { PulseIndicator } from "@/components/ui/micro-interactions";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function DemoAppointmentsEnhanced() {
  const [selectedDay, setSelectedDay] = useState(2); // Wednesday
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const times = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];
  
  const appointments: Record<string, { 
    patient: string; 
    type: string; 
    status: "upcoming" | "in-progress" | "completed";
    duration: number;
    notes?: string;
  }> = {
    '9:00 AM-Monday': { patient: 'John Smith', type: 'Checkup', status: 'completed', duration: 30 },
    '10:00 AM-Monday': { patient: 'Sarah Johnson', type: 'Cleaning', status: 'completed', duration: 45 },
    '2:00 PM-Tuesday': { patient: 'Mike Davis', type: 'Filling', status: 'completed', duration: 60 },
    '11:00 AM-Wednesday': { patient: 'Emma Wilson', type: 'Root Canal', status: 'in-progress', duration: 90, notes: 'Patient requested sedation' },
    '2:00 PM-Wednesday': { patient: 'Alex Turner', type: 'Consultation', status: 'upcoming', duration: 30 },
    '3:00 PM-Thursday': { patient: 'David Brown', type: 'Consultation', status: 'upcoming', duration: 30 },
    '9:00 AM-Friday': { patient: 'Lisa Anderson', type: 'Checkup', status: 'upcoming', duration: 30 },
    '10:00 AM-Friday': { patient: 'Tom Wilson', type: 'X-Ray', status: 'upcoming', duration: 20 },
  };

  // Count appointments per day
  const appointmentCounts = days.map(day => 
    Object.keys(appointments).filter(key => key.includes(day)).length
  );

  // Check for conflicts (overlapping appointments)
  const hasConflict = (time: string, day: string) => {
    // Simplified conflict detection for demo
    return false;
  };

  return (
    <div className="p-6 space-y-6" data-tour="appointments-section">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Appointment Calendar</h1>
          <p className="text-muted-foreground mt-1">Schedule and manage appointments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="min-w-32">
            This Week
          </Button>
          <Button variant="outline" size="sm">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Week Day Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {days.map((day, idx) => (
          <motion.button
            key={day}
            onClick={() => setSelectedDay(idx)}
            className={cn(
              "flex flex-col items-center px-6 py-3 rounded-xl transition-all min-w-[100px]",
              selectedDay === idx 
                ? "bg-primary text-primary-foreground shadow-lg" 
                : "bg-muted/50 hover:bg-muted"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="text-sm font-medium">{day}</span>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs opacity-80">{appointmentCounts[idx]} appts</span>
              {idx === 2 && ( // Show pulse for current day
                <PulseIndicator size="sm" color={selectedDay === idx ? "primary" : "success"} />
              )}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Calendar Grid */}
      <Card className="p-6 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="space-y-2">
              {times.map((time) => {
                const key = `${time}-${days[selectedDay]}`;
                const apt = appointments[key];
                const conflict = hasConflict(time, days[selectedDay]);
                
                return (
                  <div key={time} className="flex gap-4">
                    <div className="w-20 py-4 text-sm text-muted-foreground flex items-center">
                      <Clock className="h-3.5 w-3.5 mr-1.5" />
                      {time}
                    </div>
                    
                    <motion.div
                      className={cn(
                        "flex-1 p-4 rounded-xl border-2 border-dashed min-h-[80px] transition-all",
                        apt
                          ? "border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10"
                          : "border-border hover:border-primary/30 hover:bg-muted/30 cursor-pointer",
                        conflict && "border-warning-500 bg-warning-50"
                      )}
                      whileHover={{ scale: 1.01 }}
                    >
                      {apt ? (
                        <QuickPeekCard
                          preview={
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <AvatarWithInitials name={apt.patient} size="lg" />
                                <div>
                                  <p className="font-semibold">{apt.patient}</p>
                                  <p className="text-sm text-muted-foreground">{apt.type}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Duration</p>
                                  <p className="font-medium">{apt.duration} min</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Status</p>
                                  <AppointmentStatusBadge status={apt.status} />
                                </div>
                              </div>
                              {apt.notes && (
                                <div className="p-2 bg-warning-50 rounded-lg text-sm">
                                  <p className="text-warning-700">⚠️ {apt.notes}</p>
                                </div>
                              )}
                              <div className="flex gap-2">
                                <Button size="sm" className="flex-1">
                                  {apt.status === "upcoming" ? "Start" : "View Details"}
                                </Button>
                                {apt.status === "upcoming" && (
                                  <Button size="sm" variant="outline">Reschedule</Button>
                                )}
                              </div>
                            </div>
                          }
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <AvatarWithInitials 
                                name={apt.patient} 
                                size="sm"
                                showStatus
                                status={apt.status === "in-progress" ? "online" : "offline"}
                              />
                              <div>
                                <div className="font-semibold text-foreground">{apt.patient}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                  {apt.type}
                                  <span className="text-xs">• {apt.duration} min</span>
                                </div>
                              </div>
                            </div>
                            <AppointmentStatusBadge status={apt.status} time={time} />
                          </div>
                        </QuickPeekCard>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Available
                        </div>
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Today", value: 5, color: "text-primary" },
          { label: "This Week", value: 23, color: "text-foreground" },
          { label: "Completed", value: 18, color: "text-success-600" },
          { label: "Cancelled", value: 2, color: "text-danger-600" },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 text-center">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
