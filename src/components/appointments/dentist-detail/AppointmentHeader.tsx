import { useState } from "react";
import { differenceInYears } from "date-fns";
import { formatClinicTime } from "@/lib/timezone";
import { Calendar, Clock, User, MapPin, Stethoscope, Pencil, Check, X, Loader2, MessageSquare, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { 
  DentistAppointmentState, 
  DENTIST_STATE_CONFIG 
} from "@/lib/dentistAppointmentState";

interface AppointmentHeaderProps {
  appointment: {
    id: string;
    appointment_date: string;
    duration_minutes?: number;
    reason?: string;
    notes?: string; // Patient symptoms
    ai_summary?: string;
    booking_source?: string;
    patient?: {
      first_name?: string;
      last_name?: string;
      date_of_birth?: string;
      profile_picture_url?: string | null;
    };
    patient_name?: string;
  };
  state: DentistAppointmentState;
  dentistName?: string;
  dentistSpecialization?: string;
  clinicName?: string;
}

/**
 * Appointment Header - Context & State (always visible)
 * Shows patient, date/time, status badge, clinic/dentist info
 * Reason is editable
 */
export function AppointmentHeader({
  appointment,
  state,
  dentistName,
  dentistSpecialization,
  clinicName,
}: AppointmentHeaderProps) {
  const queryClient = useQueryClient();
  const stateConfig = DENTIST_STATE_CONFIG[state];
  
  const [isEditingReason, setIsEditingReason] = useState(false);
  const [editedReason, setEditedReason] = useState(appointment.reason || '');
  const [isSaving, setIsSaving] = useState(false);
  
  const patientName = `${appointment.patient?.first_name || ""} ${appointment.patient?.last_name || ""}`.trim() 
    || appointment.patient_name 
    || "Unknown Patient";
  
  const patientInitials = (appointment.patient?.first_name?.[0] || '') + 
    (appointment.patient?.last_name?.[0] || '');
  
  const patientAge = appointment.patient?.date_of_birth 
    ? differenceInYears(new Date(), new Date(appointment.patient.date_of_birth))
    : null;
  
  // Removed - using formatClinicTime directly

  const handleEditReason = () => {
    setEditedReason(appointment.reason || '');
    setIsEditingReason(true);
  };

  const handleCancelEdit = () => {
    setIsEditingReason(false);
    setEditedReason(appointment.reason || '');
  };

  const handleSaveReason = async () => {
    if (!editedReason.trim()) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ reason: editedReason.trim() })
        .eq('id', appointment.id);
      
      if (error) throw error;
      
      setIsEditingReason(false);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    } catch (error) {
      console.error('Error updating appointment reason:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveReason();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className="p-4 sm:p-6 border-b bg-gradient-to-b from-muted/50 to-background flex-shrink-0 space-y-4">
      {/* Patient Info Row */}
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14 ring-2 ring-primary/10 shadow-sm">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
            {patientInitials || 'P'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-semibold text-foreground truncate">
              {patientName}
            </h2>
            <Badge
              variant="outline"
              className={cn("gap-1.5 font-medium text-xs px-2.5 py-0.5", stateConfig.badgeClassName)}
            >
              {stateConfig.icon === 'calendar' && <Calendar className="h-3 w-3" />}
              {stateConfig.icon === 'edit' && <Clock className="h-3 w-3" />}
              {stateConfig.icon === 'check' && <Check className="h-3 w-3" />}
              {stateConfig.label}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            {patientAge && <span>{patientAge} years old</span>}
            {patientAge && (appointment.reason || !isEditingReason) && <span className="text-muted-foreground/40">•</span>}
            {appointment.reason && !isEditingReason && (
              <div className="flex items-center gap-1">
                <span className="text-foreground/80">{appointment.reason}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-50 hover:opacity-100"
                  onClick={handleEditReason}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}
            {!appointment.reason && !isEditingReason && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleEditReason}
              >
                <Pencil className="h-3 w-3 mr-1" />
                Add reason
              </Button>
            )}
          </div>
          {isEditingReason && (
            <div className="flex items-center gap-2 mt-2">
              <Input
                value={editedReason}
                onChange={(e) => setEditedReason(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Appointment reason..."
                className="h-8 text-sm flex-1"
                autoFocus
                disabled={isSaving}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary"
                onClick={handleSaveReason}
                disabled={isSaving || !editedReason.trim()}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Date, Time & Location Row */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm pl-1">
        <div className="flex items-center gap-2 text-foreground">
          <Calendar className="h-4 w-4 text-primary/70" />
          <span className="font-medium">{formatClinicTime(appointment.appointment_date, 'EEE, MMM d')}</span>
          <span className="text-muted-foreground">at</span>
          <span className="font-medium">{formatClinicTime(appointment.appointment_date, 'h:mm a')}</span>
          {appointment.duration_minutes && (
            <span className="text-muted-foreground">({appointment.duration_minutes} min)</span>
          )}
        </div>
        {(dentistName || clinicName) && (
          <div className="flex items-center gap-4 text-muted-foreground">
            {dentistName && (
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span>{dentistName}</span>
              </div>
            )}
            {clinicName && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span>{clinicName}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Patient Symptoms Section */}
      {(appointment.notes || appointment.ai_summary) && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            {appointment.booking_source === 'ai_chat' ? (
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            )}
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Patient Symptoms
            </span>
            {appointment.booking_source === 'ai_chat' && (
              <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300">
                AI Assisted
              </Badge>
            )}
          </div>
          <p className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
            {appointment.notes || appointment.ai_summary}
          </p>
        </div>
      )}
    </div>
  );
}
