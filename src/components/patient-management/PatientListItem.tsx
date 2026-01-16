import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Patient, PatientFlags } from "./types";

interface PatientListItemProps {
  patient: Patient;
  isSelected: boolean;
  patientFlags: PatientFlags | undefined;
  onClick: () => void;
}

export function PatientListItem({ patient, isSelected, patientFlags, onClick }: PatientListItemProps) {
  return (
    <div
      className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
        isSelected ? 'bg-dental-primary/10 border-dental-primary' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        <Avatar className="h-12 w-12 flex-shrink-0">
          <AvatarImage src={patient.profile_picture_url || undefined} />
          <AvatarFallback className="bg-dental-primary/10 text-dental-primary">
            {patient.first_name?.[0]}{patient.last_name?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium truncate">
              {patient.first_name} {patient.last_name}
            </p>
            {/* Medical alerts */}
            {patient.medical_history && patient.medical_history.toLowerCase().includes('allerg') && (
              <Badge variant="destructive" className="text-[10px] px-2 py-0.5">Allergies</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground truncate mt-1">
            <span>{patient.phone || 'No phone'}</span>
            {patientFlags?.lastVisitDate && (
              <span>• Last: {format(new Date(patientFlags.lastVisitDate), 'PP')}</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {patientFlags?.hasUpcomingAppointment && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5">Upcoming</Badge>
            )}
            {patientFlags?.hasActiveTreatmentPlan && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5">Active Plan</Badge>
            )}
            {patientFlags?.hasUnpaidBalance && (
              <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
                Unpaid {patientFlags.outstandingCents ? `€${(patientFlags.outstandingCents / 100).toFixed(2)}` : ''}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
