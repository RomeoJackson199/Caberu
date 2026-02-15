import { useState, useEffect } from "react";
import { Clock, Save, Plus, Trash2, Calendar, Coffee, Copy, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { logger } from '@/lib/logger';
import { getCurrentBusinessId } from "@/lib/businessScopedSupabase";
import { format, parseISO } from "date-fns";
interface DentistAvailability {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  break_start_time?: string;
  break_end_time?: string;
}

interface VacationDay {
  id?: string;
  start_date: string;
  end_date: string;
  vacation_type: string;
  reason?: string;
  is_approved: boolean;
}

interface AvailabilitySettingsProps {
  dentistId: string;
}

interface ValidationError {
  dayOfWeek: number;
  message: string;
}

interface AffectedAppointment {
  id: string;
  appointment_date: string;
  patient_name: string;
  reason?: string;
}

export function AvailabilitySettings({ dentistId }: AvailabilitySettingsProps) {
  const [availability, setAvailability] = useState<DentistAvailability[]>([]);
  const [vacationDays, setVacationDays] = useState<VacationDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [affectedAppointments, setAffectedAppointments] = useState<AffectedAppointment[]>([]);
  const [showAffectedDialog, setShowAffectedDialog] = useState(false);
  const [copyFromDay, setCopyFromDay] = useState<number | null>(null);
  const [newVacation, setNewVacation] = useState<VacationDay>({
    start_date: '',
    end_date: '',
    vacation_type: 'vacation',
    reason: '',
    is_approved: true
  });
  const { toast } = useToast();
  const { t } = useLanguage();

  // Localized day labels - defined once inside component for translations
  const DAYS_OF_WEEK = [
    { value: 1, label: t.monday, short: t.monday.charAt(0) },
    { value: 2, label: t.tuesday, short: t.tuesday.charAt(0) },
    { value: 3, label: t.wednesday, short: t.wednesday.charAt(0) },
    { value: 4, label: t.thursday, short: t.thursday.charAt(0) },
    { value: 5, label: t.friday, short: t.friday.charAt(0) },
    { value: 6, label: t.saturday, short: t.saturday.charAt(0) },
    { value: 0, label: t.sunday, short: t.sunday.charAt(0) },
  ];

  const VACATION_TYPES = [
    { value: 'vacation', label: t.vacationsTypeVacation, color: 'bg-blue-100 text-blue-800', icon: '🏖️' },
    { value: 'sick', label: t.vacationsTypeSick, color: 'bg-red-100 text-red-800', icon: '🤒' },
    { value: 'personal', label: t.vacationsTypePersonal, color: 'bg-green-100 text-green-800', icon: '👤' },
    { value: 'maternity', label: t.vacationsTypeMaternity, color: 'bg-pink-100 text-pink-800', icon: '🤱' },
    { value: 'paternity', label: t.vacationsTypePaternity, color: 'bg-indigo-100 text-indigo-800', icon: '👶' },
    { value: 'bereavement', label: t.vacationsTypeBereavement, color: 'bg-gray-100 text-gray-800', icon: '🕊️' },
    { value: 'training', label: t.vacationsTypeTraining, color: 'bg-yellow-100 text-yellow-800', icon: '📚' },
    { value: 'unpaid', label: t.vacationsTypeUnpaid, color: 'bg-orange-100 text-orange-800', icon: '📋' },
    { value: 'jury_duty', label: t.vacationsTypeJuryDuty, color: 'bg-purple-100 text-purple-800', icon: '⚖️' },
  ];

  useEffect(() => {
    Promise.all([fetchAvailability(), fetchVacationDays()]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dentistId]);

  const fetchAvailability = async () => {
    try {
      const businessId = await getCurrentBusinessId();
      const { data, error } = await supabase
        .from('dentist_availability')
        .select('*')
        .eq('dentist_id', dentistId)
        .eq('business_id', businessId)
        .order('day_of_week');

      if (error) throw error;

      // Initialize with default availability for all days
      const defaultAvailability = DAYS_OF_WEEK.map(day => {
        const existing = data?.find(a => a.day_of_week === day.value);
        return existing || {
          day_of_week: day.value,
          start_time: '09:00',
          end_time: '17:00',
          is_available: day.value >= 1 && day.value <= 5, // Mon-Fri by default
          break_start_time: '',
          break_end_time: '',
        };
      });

      setAvailability(defaultAvailability);
    } catch (error) {
      // Fallback to sensible defaults if fetch fails
      const defaultAvailability = DAYS_OF_WEEK.map(day => ({
        day_of_week: day.value,
        start_time: '09:00',
        end_time: '17:00',
        is_available: day.value >= 1 && day.value <= 5,
        break_start_time: '',
        break_end_time: '',
      }));
      setAvailability(defaultAvailability);
      toast({
        title: t.error,
        description: t.failedToLoadAvailability,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchVacationDays = async () => {
    try {
      const { data, error } = await supabase
        .from('dentist_vacation_days')
        .select('*')
        .eq('dentist_id', dentistId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setVacationDays(data || []);
    } catch (error) {
      console.error('Error fetching vacation days:', error);
    }
  };

  const updateAvailability = (dayIndex: number, field: keyof DentistAvailability, value: any) => {
    setAvailability(prev =>
      prev.map((day, index) =>
        index === dayIndex ? { ...day, [field]: value } : day
      )
    );
    // Clear validation errors when user makes changes
    setValidationErrors([]);
  };

  // Get day name for validation messages
  const getDayName = (dayOfWeek: number): string => {
    const day = DAYS_OF_WEEK.find(d => d.value === dayOfWeek);
    return day?.label || `Day ${dayOfWeek}`;
  };

  // Validate availability settings before saving
  const validateAvailability = (availabilityData: DentistAvailability[]): ValidationError[] => {
    const errors: ValidationError[] = [];

    availabilityData.forEach(day => {
      if (!day.is_available) return; // Skip validation for unavailable days

      const dayName = getDayName(day.day_of_week);

      // Validate start_time < end_time (unless overnight shift)
      // For overnight shifts, end_time can be less than start_time (e.g., 22:00 - 06:00)
      if (day.start_time === day.end_time) {
        errors.push({
          dayOfWeek: day.day_of_week,
          message: `${dayName}: Start and end time cannot be the same`
        });
      }

      // Validate break times if both are set
      const hasBreakStart = !!day.break_start_time;
      const hasBreakEnd = !!day.break_end_time;

      if (hasBreakStart !== hasBreakEnd) {
        errors.push({
          dayOfWeek: day.day_of_week,
          message: `${dayName}: Both break start and end times must be set, or leave both empty`
        });
      }

      if (hasBreakStart && hasBreakEnd) {
        // Break end must be after break start
        if (day.break_start_time! >= day.break_end_time!) {
          errors.push({
            dayOfWeek: day.day_of_week,
            message: `${dayName}: Break end time must be after break start time`
          });
        }

        // Check if it's a normal (non-overnight) shift
        const isNormalShift = day.start_time < day.end_time;

        if (isNormalShift) {
          // Break must be within working hours
          if (day.break_start_time! < day.start_time) {
            errors.push({
              dayOfWeek: day.day_of_week,
              message: `${dayName}: Break cannot start before working hours begin`
            });
          }
          if (day.break_end_time! > day.end_time) {
            errors.push({
              dayOfWeek: day.day_of_week,
              message: `${dayName}: Break cannot end after working hours end`
            });
          }
        }
      }
    });

    return errors;
  };

  // Check for appointments that would be affected by availability changes
  const checkAffectedAppointments = async (newAvailability: DentistAvailability[]): Promise<AffectedAppointment[]> => {
    try {
      const businessId = await getCurrentBusinessId();

      // Get future appointments for this dentist
      const { data: appointments, error } = await supabase
        .from('appointments_decrypted' as any)
        .select('id, appointment_date, reason, patient_id')
        .eq('dentist_id', dentistId)
        .eq('business_id', businessId)
        .gte('appointment_date', new Date().toISOString())
        .in('status', ['pending', 'confirmed']);

      if (error || !appointments) return [];

      // Fetch patient profiles separately (views don't support PostgREST joins)
      const patientIds = [...new Set((appointments as any[]).map(a => a.patient_id).filter(Boolean))];
      const { data: profilesList } = patientIds.length > 0
        ? await supabase.from('profiles').select('id, first_name, last_name').in('id', patientIds)
        : { data: [] };
      const profilesMap = new Map((profilesList || []).map(p => [p.id, p]));

      const appointmentsWithProfiles = (appointments as any[]).map(apt => ({
        ...apt,
        profiles: profilesMap.get(apt.patient_id) || null,
      }));

      const affected: AffectedAppointment[] = [];

      for (const apt of appointmentsWithProfiles) {
        const aptDate = new Date(apt.appointment_date);
        const dayOfWeek = aptDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const aptTime = format(aptDate, 'HH:mm');

        // Find the availability for this day
        const dayAvail = newAvailability.find(a => a.day_of_week === dayOfWeek);

        if (!dayAvail) continue;

        let isOutsideHours = false;

        // Check if day is now unavailable
        if (!dayAvail.is_available) {
          isOutsideHours = true;
        } else {
          // Check if appointment time is within new working hours
          const isNormalShift = dayAvail.start_time < dayAvail.end_time;

          if (isNormalShift) {
            // Normal daytime hours
            if (aptTime < dayAvail.start_time || aptTime >= dayAvail.end_time) {
              isOutsideHours = true;
            }
          } else {
            // Overnight shift (e.g., 22:00 - 06:00)
            // Time is valid if >= start_time OR < end_time
            if (aptTime < dayAvail.start_time && aptTime >= dayAvail.end_time) {
              isOutsideHours = true;
            }
          }

          // Check if appointment falls during break time
          if (!isOutsideHours && dayAvail.break_start_time && dayAvail.break_end_time) {
            if (aptTime >= dayAvail.break_start_time && aptTime < dayAvail.break_end_time) {
              isOutsideHours = true;
            }
          }
        }

        if (isOutsideHours) {
          const patient = apt.profiles as { first_name?: string; last_name?: string } | null;
          affected.push({
            id: apt.id,
            appointment_date: apt.appointment_date,
            patient_name: patient ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim() : 'Unknown Patient',
            reason: apt.reason
          });
        }
      }

      return affected;
    } catch (error) {
      logger.error('Error checking affected appointments:', error);
      return [];
    }
  };

  // Copy availability from one day to another
  const copyAvailabilityToDay = (fromDayIndex: number, toDayIndex: number) => {
    const sourceDay = availability[fromDayIndex];
    if (!sourceDay) return;

    setAvailability(prev =>
      prev.map((day, index) =>
        index === toDayIndex
          ? {
              ...day,
              start_time: sourceDay.start_time,
              end_time: sourceDay.end_time,
              is_available: sourceDay.is_available,
              break_start_time: sourceDay.break_start_time,
              break_end_time: sourceDay.break_end_time,
            }
          : day
      )
    );
    setCopyFromDay(null);
    toast({
      title: t.success,
      description: `Copied schedule from ${getDayName(sourceDay.day_of_week)} to ${getDayName(availability[toDayIndex].day_of_week)}`,
    });
  };

  // Copy availability to all weekdays
  const copyToAllWeekdays = (fromDayIndex: number) => {
    const sourceDay = availability[fromDayIndex];
    if (!sourceDay) return;

    setAvailability(prev =>
      prev.map((day, index) => {
        // Copy to weekdays (Monday=1 to Friday=5) except the source day
        if (day.day_of_week >= 1 && day.day_of_week <= 5 && index !== fromDayIndex) {
          return {
            ...day,
            start_time: sourceDay.start_time,
            end_time: sourceDay.end_time,
            is_available: sourceDay.is_available,
            break_start_time: sourceDay.break_start_time,
            break_end_time: sourceDay.break_end_time,
          };
        }
        return day;
      })
    );
    setCopyFromDay(null);
    toast({
      title: t.success,
      description: `Copied schedule from ${getDayName(sourceDay.day_of_week)} to all weekdays`,
    });
  };

  // Main save function - validates and checks for conflicts before saving
  const saveAvailability = async (forceOverride = false) => {
    // Step 1: Validate availability settings
    const errors = validateAvailability(availability);
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast({
        title: t.error,
        description: "Please fix the validation errors before saving",
        variant: "destructive",
      });
      return;
    }

    // Step 2: Check for affected appointments (unless user already confirmed)
    if (!forceOverride) {
      setSaving(true);
      const affected = await checkAffectedAppointments(availability);
      setSaving(false);

      if (affected.length > 0) {
        setAffectedAppointments(affected);
        setShowAffectedDialog(true);
        return;
      }
    }

    // Step 3: Proceed with saving
    setSaving(true);
    try {
      const businessId = await getCurrentBusinessId();

      // Delete existing availability for this dentist and business
      const { error: deleteError } = await supabase
        .from('dentist_availability')
        .delete()
        .eq('dentist_id', dentistId)
        .eq('business_id', businessId);

      if (deleteError) {
        logger.error('Delete error:', deleteError);
        throw deleteError;
      }

      // Insert new availability settings (only include breaks if both times are set)
      const availabilityData = availability
        .map(day => {
          const hasCompleteBreak = !!day.break_start_time && !!day.break_end_time;
          return {
            dentist_id: dentistId,
            business_id: businessId,
            day_of_week: day.day_of_week,
            start_time: day.start_time,
            end_time: day.end_time,
            is_available: !!day.is_available,
            break_start_time: hasCompleteBreak ? day.break_start_time : null,
            break_end_time: hasCompleteBreak ? day.break_end_time : null,
          };
        });

      if (availabilityData.length > 0) {
        const { error: insertError } = await supabase
          .from('dentist_availability')
          .insert(availabilityData);

        if (insertError) {
          logger.error('Insert error:', insertError);
          throw insertError;
        }
      }

      // Clear old slots so they regenerate with new availability
      const { error: slotsError } = await supabase
        .from('appointment_slots')
        .delete()
        .eq('dentist_id', dentistId)
        .is('appointment_id', null);

      if (slotsError) {
        logger.warn('Error clearing slots (non-fatal):', slotsError);
      }

      // Clear states
      setValidationErrors([]);
      setAffectedAppointments([]);
      setShowAffectedDialog(false);

      // Refetch to confirm
      await fetchAvailability();

      toast({
        title: t.success,
        description: t.availabilityUpdated,
      });
    } catch (error: any) {
      console.error('Save availability failed:', error);
      logger.error('Failed to save availability:', error);
      toast({
        title: t.error,
        description: error?.message || t.failedToSaveAvailability,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addVacationDay = async () => {
    if (!newVacation.start_date || !newVacation.end_date) {
      toast({
        title: t.error,
        description: t.pleaseCompleteAllFields,
        variant: "destructive",
      });
      return;
    }

    try {
      const businessId = await getCurrentBusinessId();

      const { data, error } = await supabase
        .from('dentist_vacation_days')
        .insert({
          dentist_id: dentistId,
          business_id: businessId,
          ...newVacation
        })
        .select()
        .single();

      if (error) throw error;

      setVacationDays(prev => [data, ...prev]);
      setNewVacation({
        start_date: '',
        end_date: '',
        vacation_type: 'vacation',
        reason: '',
        is_approved: true
      });

      toast({
        title: t.success,
        description: t.changesSaved,
      });

      // Auto-cancel any overlapping appointments and notify patients
      try {
        const { data: cancelResult, error: cancelError } = await supabase.functions.invoke(
          'cancel-vacation-appointments',
          {
            body: {
              vacation_id: data.id,
              dentist_id: dentistId,
              start_date: newVacation.start_date,
              end_date: newVacation.end_date,
              vacation_type: newVacation.vacation_type,
              reason: newVacation.reason
            }
          }
        );

        if (cancelError) {
          logger.error('Failed to auto-cancel appointments:', cancelError);
        } else if (cancelResult?.cancelled_count > 0) {
          toast({
            title: "Appointments Cancelled",
            description: `${cancelResult.cancelled_count} appointment(s) were automatically cancelled and patients have been notified.`,
          });
        }
      } catch (cancelErr) {
        logger.error('Error invoking cancel-vacation-appointments:', cancelErr);
      }
    } catch (error) {
      logger.error('Failed to add vacation:', error);
      toast({
        title: t.error,
        description: t.error,
        variant: "destructive",
      });
    }
  };

  const deleteVacationDay = async (id: string) => {
    try {
      const { error } = await supabase
        .from('dentist_vacation_days')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setVacationDays(prev => prev.filter(v => v.id !== id));
      toast({
        title: t.success,
        description: t.changesSaved,
      });
    } catch (error) {
      toast({
        title: t.error,
        description: t.error,
        variant: "destructive",
      });
    }
  };

  const getVacationTypeConfig = (type: string) => {
    return VACATION_TYPES.find(t => t.value === type) || VACATION_TYPES[0];
  };

  // Compute time-off summary by type
  const getTimeOffSummary = () => {
    const now = new Date();
    const summary: Record<string, { total: number; upcoming: number }> = {};

    for (const vt of VACATION_TYPES) {
      summary[vt.value] = { total: 0, upcoming: 0 };
    }

    for (const v of vacationDays) {
      const startDate = new Date(v.start_date);
      const endDate = new Date(v.end_date);
      const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const type = v.vacation_type || 'vacation';

      if (!summary[type]) {
        summary[type] = { total: 0, upcoming: 0 };
      }
      summary[type].total += duration;
      if (startDate > now) {
        summary[type].upcoming += duration;
      }
    }

    return summary;
  };

  if (loading) {
    return <div className="flex justify-center p-8">{t.loadingSettings}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t.availabilityManagement}</h2>
          <p className="text-sm text-muted-foreground">Manage your working hours and time off</p>
        </div>
        <Button onClick={() => saveAvailability(false)} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? t.saving : t.saveAvailability}
        </Button>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Validation Errors</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              {validationErrors.map((error, index) => (
                <li key={index}>{error.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Affected Appointments Dialog */}
      <Dialog open={showAffectedDialog} onOpenChange={setShowAffectedDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Appointments May Be Affected
            </DialogTitle>
            <DialogDescription>
              {affectedAppointments.length} appointment(s) fall outside the new hours.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {affectedAppointments.map((apt) => (
              <div key={apt.id} className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800">
                <div className="font-medium text-sm">{apt.patient_name}</div>
                <div className="text-xs text-muted-foreground">
                  {format(parseISO(apt.appointment_date), 'EEE, MMM d, yyyy - h:mm a')}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAffectedDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => saveAvailability(true)} disabled={saving}>
              {saving ? 'Saving...' : 'Save Anyway'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="schedule">
            <Calendar className="h-4 w-4 mr-2" />
            {t.weeklySchedule}
          </TabsTrigger>
          <TabsTrigger value="vacation">
            <Coffee className="h-4 w-4 mr-2" />
            {t.vacationsAbsences}
          </TabsTrigger>
        </TabsList>

        {/* Weekly Schedule Tab */}
        <TabsContent value="schedule" className="space-y-3">
          {/* Presets */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAvailability(prev => prev.map(day => ({
                  ...day,
                  is_available: day.day_of_week >= 1 && day.day_of_week <= 5,
                  start_time: '09:00',
                  end_time: '17:00',
                  break_start_time: '12:00',
                  break_end_time: '13:00'
                })));
              }}
            >
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              Standard 9-17
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAvailability(prev => prev.map(day => ({
                  ...day,
                  is_available: day.day_of_week !== 0,
                  start_time: '08:00',
                  end_time: '20:00',
                  break_start_time: '',
                  break_end_time: ''
                })));
              }}
            >
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              Extended 8-20
            </Button>
          </div>

          {/* Days */}
          <div className="space-y-2">
            {DAYS_OF_WEEK.map((day, index) => {
              const dayAvailability: DentistAvailability = availability[index] ?? {
                day_of_week: day.value,
                start_time: '09:00',
                end_time: '17:00',
                is_available: day.value >= 1 && day.value <= 5,
                break_start_time: '12:00',
                break_end_time: '13:00',
              };

              return (
                <div
                  key={day.value}
                  className={`rounded-lg border p-3 ${dayAvailability.is_available ? 'bg-white dark:bg-card' : 'bg-muted/40'}`}
                >
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={dayAvailability.is_available}
                      onCheckedChange={(checked) =>
                        updateAvailability(index, 'is_available', checked)
                      }
                    />
                    <span className={`font-medium w-24 text-sm ${!dayAvailability.is_available ? 'text-muted-foreground' : ''}`}>
                      {day.label}
                    </span>

                    {dayAvailability.is_available && (
                      <>
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
                          <Input
                            type="time"
                            value={dayAvailability.start_time}
                            onChange={(e) => updateAvailability(index, 'start_time', e.target.value)}
                            className="h-8 w-28 text-sm"
                          />
                          <span className="text-muted-foreground text-xs">to</span>
                          <Input
                            type="time"
                            value={dayAvailability.end_time}
                            onChange={(e) => updateAvailability(index, 'end_time', e.target.value)}
                            className="h-8 w-28 text-sm"
                          />

                          <span className="text-muted-foreground text-xs ml-2">break</span>
                          <Input
                            type="time"
                            value={dayAvailability.break_start_time || ''}
                            onChange={(e) => updateAvailability(index, 'break_start_time', e.target.value || null)}
                            className="h-8 w-28 text-sm"
                            placeholder="--:--"
                          />
                          <span className="text-muted-foreground text-xs">to</span>
                          <Input
                            type="time"
                            value={dayAvailability.break_end_time || ''}
                            onChange={(e) => updateAvailability(index, 'break_end_time', e.target.value || null)}
                            className="h-8 w-28 text-sm"
                            placeholder="--:--"
                          />
                        </div>

                        <Select
                          value=""
                          onValueChange={(value) => {
                            if (value === 'weekdays') {
                              copyToAllWeekdays(index);
                            } else {
                              const targetIndex = DAYS_OF_WEEK.findIndex(d => d.value === parseInt(value));
                              if (targetIndex >= 0) {
                                copyAvailabilityToDay(index, targetIndex);
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="w-8 h-8 p-0 border-dashed shrink-0">
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekdays">Copy to all weekdays</SelectItem>
                            {DAYS_OF_WEEK.filter((_, i) => i !== index).map((targetDay) => (
                              <SelectItem key={targetDay.value} value={targetDay.value.toString()}>
                                Copy to {targetDay.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Time Off Tab */}
        <TabsContent value="vacation" className="space-y-4">
          {/* Summary */}
          {vacationDays.length > 0 && (() => {
            const summary = getTimeOffSummary();
            const totalDays = Object.values(summary).reduce((sum, s) => sum + s.total, 0);
            const typesWithDays = VACATION_TYPES.filter(vt => summary[vt.value]?.total > 0);

            return (
              <div className="rounded-lg border p-4">
                <h3 className="text-sm font-medium mb-3">{t.timeOffSummary}</h3>
                <div className="flex flex-wrap gap-3">
                  <div className="text-center px-3 py-1.5 rounded bg-muted">
                    <div className="text-lg font-bold">{totalDays}</div>
                    <div className="text-[11px] text-muted-foreground">{t.totalDaysTaken}</div>
                  </div>
                  {typesWithDays.map(vt => {
                    const s = summary[vt.value];
                    return (
                      <div key={vt.value} className="text-center px-3 py-1.5 rounded bg-muted/50">
                        <div className="text-lg font-bold">{s.total}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <span>{vt.icon}</span> {vt.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Add Time Off */}
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-medium">{t.addVacation}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label htmlFor="start-date" className="text-xs">{t.startDate}</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={newVacation.start_date}
                  onChange={(e) => setNewVacation(prev => ({ ...prev, start_date: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="text-xs">{t.endDate}</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={newVacation.end_date}
                  onChange={(e) => setNewVacation(prev => ({ ...prev, end_date: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">{t.vacationType}</Label>
                <Select
                  value={newVacation.vacation_type}
                  onValueChange={(value: string) =>
                    setNewVacation(prev => ({ ...prev, vacation_type: value }))
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VACATION_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-1.5">
                          <span>{type.icon}</span> {type.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={addVacationDay} className="w-full h-9" size="sm">
                  <Plus className="h-4 w-4 mr-1.5" />
                  {t.addButton}
                </Button>
              </div>
            </div>
            <Input
              placeholder={`${t.reason} (${t.optional})`}
              value={newVacation.reason || ''}
              onChange={(e) => setNewVacation(prev => ({ ...prev, reason: e.target.value }))}
              className="h-9"
            />
          </div>

          {/* List */}
          <div className="space-y-1.5">
            {vacationDays.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>{t.noVacationsScheduled}</p>
              </div>
            ) : (
              vacationDays.map((vacation) => {
                const typeConfig = getVacationTypeConfig(vacation.vacation_type);
                const startDate = new Date(vacation.start_date);
                const endDate = new Date(vacation.end_date);
                const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                return (
                  <div key={vacation.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig.color}`}>
                        {typeConfig.icon} {typeConfig.label}
                      </span>
                      <span className="text-sm">
                        {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {duration} {duration > 1 ? t.days : t.day}
                      </span>
                      {vacation.reason && (
                        <span className="text-xs text-muted-foreground truncate">{vacation.reason}</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => vacation.id && deleteVacationDay(vacation.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0 h-8 w-8 p-0"
                      aria-label={t.deleteVacation}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}