import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatClinicTime } from '@/lib/timezone';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  Pencil,
  Check,
  X,
  Loader2,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import { PatientAppointment } from '../types';

interface AppointmentRowProps {
  appointment: PatientAppointment;
  onClick: () => void;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusBadge: (status: string) => string;
  highlight?: boolean;
  onReasonUpdated?: () => void;
  onTreatmentPlanClick?: (planId: string) => void;
}

export function AppointmentRow({ 
  appointment, 
  onClick, 
  getStatusIcon,
  getStatusBadge,
  highlight = false,
  onReasonUpdated,
  onTreatmentPlanClick
}: AppointmentRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedReason, setEditedReason] = useState(appointment.reason || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditedReason(appointment.reason || '');
    setIsEditing(true);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setEditedReason(appointment.reason || '');
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editedReason.trim()) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ reason: editedReason.trim() })
        .eq('id', appointment.id);
      
      if (error) throw error;
      
      setIsEditing(false);
      onReasonUpdated?.();
    } catch (error) {
      console.error('Error updating appointment reason:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      handleSave(e as unknown as React.MouseEvent);
    } else if (e.key === 'Escape') {
      handleCancel(e as unknown as React.MouseEvent);
    }
  };

  const statusBgClass = appointment.status === 'completed' 
    ? "bg-emerald-100 dark:bg-emerald-900/30" 
    : appointment.status === 'confirmed' 
    ? "bg-primary/10" 
    : appointment.status === 'pending' 
    ? "bg-amber-100 dark:bg-amber-900/30" 
    : "bg-muted";

  return (
    <div
      onClick={isEditing ? undefined : onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-primary/20",
        highlight && "border-amber-300 bg-amber-50/50 dark:bg-amber-900/10",
        !highlight && "bg-card",
        !isEditing && "cursor-pointer hover:bg-muted/50 hover:shadow-sm"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
            statusBgClass
          )}>
            {getStatusIcon(appointment.status)}
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={editedReason}
                  onChange={(e) => setEditedReason(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-8 text-sm"
                  autoFocus
                  disabled={isSaving}
                  placeholder="Appointment reason..."
                />
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                  onClick={handleSave}
                  disabled={isSaving || !editedReason.trim()}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 group/reason">
                <p className="text-sm font-medium truncate">
                  {appointment.reason || 'General consultation'}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 opacity-0 group-hover/reason:opacity-100 transition-opacity"
                  onClick={handleEditClick}
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatClinicTime(appointment.appointment_date, 'EEE, MMM d')} at {formatClinicTime(appointment.appointment_date, 'h:mm a')}
              {appointment.duration_minutes && <span className="opacity-75"> · {appointment.duration_minutes} min</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {appointment.treatment_plan_id && (
            <Badge 
              variant="secondary" 
              className="text-[10px] gap-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 cursor-pointer hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onTreatmentPlanClick?.(appointment.treatment_plan_id!);
              }}
            >
              <ClipboardList className="h-3 w-3" />
              Plan
            </Badge>
          )}
          <Badge variant="outline" className={cn("text-[10px] capitalize", getStatusBadge(appointment.status))}>
            {appointment.status}
          </Badge>
          {!isEditing && <ChevronRight className="h-4 w-4 text-muted-foreground/50" />}
        </div>
      </div>
    </div>
  );
}
