import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AppointmentRow } from './AppointmentRow';
import { PatientAppointment } from '../types';

interface AppointmentGroupProps {
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  appointments: PatientAppointment[];
  visibleCount: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusBadge: (status: string) => string;
  onAppointmentClick: (apt: PatientAppointment) => void;
  onEnterConsultation?: (appointmentId: string) => void;
  onReasonUpdated?: () => void;
  onTreatmentPlanClick?: (planId: string) => void;
  isSearching?: boolean;
  highlight?: boolean;
}

export function AppointmentGroup({
  title,
  icon,
  colorClass,
  appointments,
  visibleCount,
  isExpanded,
  onToggleExpand,
  getStatusIcon,
  getStatusBadge,
  onAppointmentClick,
  onEnterConsultation,
  onReasonUpdated,
  onTreatmentPlanClick,
  isSearching = false,
  highlight = false
}: AppointmentGroupProps) {
  if (appointments.length === 0) return null;

  const displayedAppointments = isExpanded || isSearching 
    ? appointments 
    : appointments.slice(0, visibleCount);

  const remainingCount = appointments.length - visibleCount;

  return (
    <div className="space-y-2">
      <h4 className={cn(
        "text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 px-1",
        colorClass
      )}>
        {icon}
        {title} ({appointments.length})
      </h4>
      
      <div className="space-y-2">
        {displayedAppointments.map((apt) => {
          const isActionable = apt.status !== 'pending' && apt.status !== 'completed' && apt.status !== 'cancelled';
          return (
            <AppointmentRow
              key={apt.id}
              appointment={apt}
              onClick={() => 
                isActionable && onEnterConsultation 
                  ? onEnterConsultation(apt.id) 
                  : onAppointmentClick(apt)
              }
              getStatusIcon={getStatusIcon}
              getStatusBadge={getStatusBadge}
              highlight={highlight}
              onReasonUpdated={onReasonUpdated}
              onTreatmentPlanClick={onTreatmentPlanClick}
            />
          );
        })}
      </div>

      {remainingCount > 0 && !isSearching && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-1 text-xs h-8"
          onClick={onToggleExpand}
        >
          {isExpanded ? 'Show Less' : `Show ${remainingCount} More`}
        </Button>
      )}
    </div>
  );
}
