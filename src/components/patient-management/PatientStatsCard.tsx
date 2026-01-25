import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Activity,
  TrendingUp,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Appointment, TreatmentPlan, Prescription, PatientFlags } from "./types";

interface PatientStatsCardProps {
  appointments: Appointment[];
  treatmentPlans: TreatmentPlan[];
  prescriptions: Prescription[];
  flags?: PatientFlags;
}

export function PatientStatsCard({
  appointments,
  treatmentPlans,
  prescriptions,
  flags,
}: PatientStatsCardProps) {
  // Calculate stats
  const completedAppointments = appointments.filter(a => a.status === 'completed').length;
  const totalAppointments = appointments.filter(a => a.status !== 'cancelled').length;
  const completionRate = totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0;

  const activeTreatments = treatmentPlans.filter(t => t.status === 'active').length;
  const completedTreatments = treatmentPlans.filter(t => t.status === 'completed').length;

  const activePrescriptions = prescriptions.filter(p => p.status === 'active').length;

  // Days since last visit
  const lastVisit = flags?.lastVisitDate ? new Date(flags.lastVisitDate) : null;
  const daysSinceLastVisit = lastVisit ? differenceInDays(new Date(), lastVisit) : null;

  // Next appointment countdown
  const nextAppointment = flags?.nextAppointmentDate ? new Date(flags.nextAppointmentDate) : null;
  const daysUntilNext = nextAppointment ? differenceInDays(nextAppointment, new Date()) : null;

  return (
    <Card className="glass-card">
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Appointment Completion Rate */}
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-sm font-medium mb-1">
              <Activity className="h-4 w-4 text-dental-primary" />
              <span>Completion</span>
            </div>
            <div className="text-2xl font-bold text-dental-primary">{completionRate}%</div>
            <div className="text-xs text-muted-foreground">
              {completedAppointments}/{totalAppointments} visits
            </div>
          </div>

          {/* Last Visit */}
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-sm font-medium mb-1">
              <Clock className="h-4 w-4 text-orange-500" />
              <span>Last Visit</span>
            </div>
            {lastVisit ? (
              <>
                <div className="text-lg font-semibold">
                  {daysSinceLastVisit === 0 ? 'Today' : `${daysSinceLastVisit}d ago`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(lastVisit, 'MMM d')}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No visits yet</div>
            )}
          </div>

          {/* Next Appointment */}
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-sm font-medium mb-1">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span>Next Visit</span>
            </div>
            {nextAppointment ? (
              <>
                <div className="text-lg font-semibold">
                  {daysUntilNext === 0 ? 'Today!' : `In ${daysUntilNext}d`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(nextAppointment, 'MMM d, p')}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Not scheduled</div>
            )}
          </div>

          {/* Active Treatments */}
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-sm font-medium mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>Treatments</span>
            </div>
            <div className="text-2xl font-bold">{activeTreatments}</div>
            <div className="text-xs text-muted-foreground">
              {completedTreatments} completed
            </div>
          </div>

          {/* Active Prescriptions */}
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-sm font-medium mb-1">
              <CheckCircle className="h-4 w-4 text-purple-500" />
              <span>Prescriptions</span>
            </div>
            <div className="text-2xl font-bold">{activePrescriptions}</div>
            <div className="text-xs text-muted-foreground">active</div>
          </div>

          {/* Balance */}
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-sm font-medium mb-1">
              <CreditCard className={`h-4 w-4 ${flags?.hasUnpaidBalance ? 'text-red-500' : 'text-green-500'}`} />
              <span>Balance</span>
            </div>
            {flags?.hasUnpaidBalance ? (
              <>
                <div className="text-lg font-bold text-red-600">
                  €{((flags.outstandingCents || 0) / 100).toFixed(2)}
                </div>
                <Badge variant="destructive" className="text-xs">Outstanding</Badge>
              </>
            ) : (
              <>
                <div className="text-lg font-bold text-green-600">€0.00</div>
                <Badge variant="outline" className="text-xs text-green-600 border-green-300">Clear</Badge>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
