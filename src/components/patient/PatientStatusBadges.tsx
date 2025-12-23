import { Crown, Star, Clock, UserCheck, UserX, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";

interface PatientStatusInfo {
  patient_status?: string;
  is_vip?: boolean;
  last_contact_at?: string;
  next_recall_date?: string;
  last_visit_date?: string;
}

interface PatientFlags {
  hasUnpaidBalance?: boolean;
  hasUpcomingAppointment?: boolean;
  hasActiveTreatmentPlan?: boolean;
  outstandingCents?: number;
}

interface PatientStatusBadgesProps {
  patient: PatientStatusInfo;
  flags?: PatientFlags;
  compact?: boolean;
}

export function PatientStatusBadges({ patient, flags, compact = false }: PatientStatusBadgesProps) {
  const badges: { key: string; label: string; icon: React.ElementType; variant: string; tooltip?: string }[] = [];

  // VIP badge
  if (patient.is_vip) {
    badges.push({
      key: 'vip',
      label: 'VIP',
      icon: Crown,
      variant: 'bg-amber-100 text-amber-700 border-amber-300',
    });
  }

  // Patient status
  if (patient.patient_status && patient.patient_status !== 'active') {
    const statusConfig: Record<string, { label: string; icon: React.ElementType; variant: string }> = {
      inactive: { label: 'Inactive', icon: UserX, variant: 'bg-slate-100 text-slate-600 border-slate-300' },
      new: { label: 'New', icon: Star, variant: 'bg-blue-100 text-blue-700 border-blue-300' },
      returning: { label: 'Returning', icon: UserCheck, variant: 'bg-green-100 text-green-700 border-green-300' },
    };
    
    const config = statusConfig[patient.patient_status];
    if (config) {
      badges.push({
        key: 'status',
        ...config,
      });
    }
  }

  // Recall due
  if (patient.next_recall_date) {
    const recallDate = new Date(patient.next_recall_date);
    const daysUntilRecall = differenceInDays(recallDate, new Date());
    
    if (daysUntilRecall <= 0) {
      badges.push({
        key: 'recall-overdue',
        label: 'Recall Overdue',
        icon: AlertCircle,
        variant: 'bg-red-100 text-red-700 border-red-300',
        tooltip: `Was due ${format(recallDate, 'MMM d')}`,
      });
    } else if (daysUntilRecall <= 30) {
      badges.push({
        key: 'recall-due',
        label: `Recall in ${daysUntilRecall}d`,
        icon: Clock,
        variant: 'bg-orange-100 text-orange-700 border-orange-300',
        tooltip: `Due ${format(recallDate, 'MMM d')}`,
      });
    }
  }

  // Unpaid balance
  if (flags?.hasUnpaidBalance && flags.outstandingCents && flags.outstandingCents > 0) {
    const amount = (flags.outstandingCents / 100).toFixed(2);
    badges.push({
      key: 'balance',
      label: compact ? '$' + amount : `$${amount} due`,
      icon: AlertCircle,
      variant: 'bg-red-50 text-red-600 border-red-200',
    });
  }

  // Last contact - only show if no contact in 90+ days
  if (patient.last_contact_at) {
    const daysSinceContact = differenceInDays(new Date(), new Date(patient.last_contact_at));
    if (daysSinceContact >= 90) {
      badges.push({
        key: 'no-contact',
        label: `${daysSinceContact}d no contact`,
        icon: Clock,
        variant: 'bg-slate-100 text-slate-600 border-slate-300',
      });
    }
  }

  // Active treatment plan
  if (flags?.hasActiveTreatmentPlan) {
    badges.push({
      key: 'treatment',
      label: 'In Treatment',
      icon: Star,
      variant: 'bg-purple-100 text-purple-700 border-purple-300',
    });
  }

  if (badges.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {badges.slice(0, 3).map((badge) => {
          const Icon = badge.icon;
          return (
            <Badge
              key={badge.key}
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0 h-5 border", badge.variant)}
            >
              <Icon className="h-3 w-3 mr-0.5" />
              {badge.label}
            </Badge>
          );
        })}
        {badges.length > 3 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-slate-50">
            +{badges.length - 3}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => {
        const Icon = badge.icon;
        return (
          <Badge
            key={badge.key}
            variant="outline"
            className={cn("text-xs px-2 py-0.5 border", badge.variant)}
          >
            <Icon className="h-3 w-3 mr-1" />
            {badge.label}
          </Badge>
        );
      })}
    </div>
  );
}
