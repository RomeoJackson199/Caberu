import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Clock, Copy, AlertTriangle } from "lucide-react";
import { logger } from '@/lib/logger';
import { format, parseISO } from "date-fns";
import {
  validateAvailability,
  type DentistAvailability,
  type ValidationError,
  type AffectedAppointment,
} from '@/lib/availabilityValidation';

interface AvailabilityManagerProps {
  dentistId: string;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'monday' },
  { value: 2, label: 'tuesday' },
  { value: 3, label: 'wednesday' },
  { value: 4, label: 'thursday' },
  { value: 5, label: 'friday' },
  { value: 6, label: 'saturday' },
  { value: 0, label: 'sunday' },
];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return [
    { value: `${hour}:00`, label: `${hour}:00` },
    { value: `${hour}:30`, label: `${hour}:30` }
  ];
}).flat();

export function AvailabilityManager({ dentistId }: AvailabilityManagerProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [availability, setAvailability] = useState<DentistAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [affectedAppointments, setAffectedAppointments] = useState<AffectedAppointment[]>([]);
  const [showAffectedDialog, setShowAffectedDialog] = useState(false);

  // Get localized day name
  const getDayName = (dayOfWeek: number): string => {
    const day = DAYS_OF_WEEK.find(d => d.value === dayOfWeek);
    if (day) {
      return (t as unknown as Record<string, string>)[day.label] || day.label;
    }
    return `Day ${dayOfWeek}`;
  };

  useEffect(() => {
    fetchAvailability();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dentistId]);

  const fetchAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('dentist_availability')
        .select('*')
        .eq('dentist_id', dentistId)
        .order('day_of_week');

      if (error) throw error;

      // Initialize with default availability for all days if none exists
      if (!data || data.length === 0) {
        const defaultAvailability: DentistAvailability[] = DAYS_OF_WEEK.map(day => ({
          day_of_week: day.value,
          is_available: day.value >= 1 && day.value <= 5, // Mon-Fri by default
          start_time: '09:00',
          end_time: '17:00',
          break_start_time: '12:00',
          break_end_time: '13:00',
        }));
        setAvailability(defaultAvailability);
      } else {
        // Ensure all days are present
        const fullAvailability: DentistAvailability[] = DAYS_OF_WEEK.map(day => {
          const existing = data.find((a: DentistAvailability) => a.day_of_week === day.value);
          return existing || {
            day_of_week: day.value,
            is_available: false,
            start_time: '09:00',
            end_time: '17:00',
          };
        });
        setAvailability(fullAvailability);
      }
    } catch (error) {
      logger.error('Error fetching availability:', error);
      toast({
        title: t.error,
        description: t.failedToLoadAvailability,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDay = (dayOfWeek: number, isAvailable: boolean) => {
    setAvailability(prev =>
      prev.map(day =>
        day.day_of_week === dayOfWeek ? { ...day, is_available: isAvailable } : day
      )
    );
    setValidationErrors([]);
  };

  const handleTimeChange = (dayOfWeek: number, field: keyof DentistAvailability, value: string) => {
    setAvailability(prev =>
      prev.map(day =>
        day.day_of_week === dayOfWeek ? { ...day, [field]: value } : day
      )
    );
    setValidationErrors([]);
  };

  // Copy availability from one day to another
  const copyAvailabilityToDay = (fromIndex: number, toIndex: number) => {
    const sourceDay = availability[fromIndex];
    if (!sourceDay) return;

    setAvailability(prev =>
      prev.map((day, index) =>
        index === toIndex
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
    toast({
      title: t.success,
      description: `Copied schedule from ${getDayName(sourceDay.day_of_week)}`,
    });
  };

  // Copy to all weekdays
  const copyToAllWeekdays = (fromIndex: number) => {
    const sourceDay = availability[fromIndex];
    if (!sourceDay) return;

    setAvailability(prev =>
      prev.map((day, index) => {
        if (day.day_of_week >= 1 && day.day_of_week <= 5 && index !== fromIndex) {
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
    toast({
      title: t.success,
      description: `Copied schedule to all weekdays`,
    });
  };

  // Check for affected appointments
  const checkAffectedAppointments = async (): Promise<AffectedAppointment[]> => {
    try {
      const { data: dentistData } = await supabase
        .from('dentists')
        .select('profile_id')
        .eq('id', dentistId)
        .single();

      if (!dentistData?.profile_id) return [];

      const { data: membership } = await supabase
        .from('business_members')
        .select('business_id')
        .eq('profile_id', dentistData.profile_id)
        .limit(1)
        .maybeSingle();

      if (!membership?.business_id) return [];

      const { data: appointments, error } = await supabase
        .from('appointments_decrypted')
        .select(`
          id,
          appointment_date,
          reason,
          profiles!appointments_patient_id_fkey (
            first_name,
            last_name
          )
        `)
        .eq('dentist_id', dentistId)
        .eq('business_id', membership.business_id)
        .gte('appointment_date', new Date().toISOString())
        .in('status', ['pending', 'confirmed']);

      if (error || !appointments) return [];

      const affected: AffectedAppointment[] = [];

      for (const apt of appointments) {
        const aptDate = new Date(apt.appointment_date);
        const dayOfWeek = aptDate.getDay();
        const aptTime = format(aptDate, 'HH:mm');

        const dayAvail = availability.find(a => a.day_of_week === dayOfWeek);

        if (!dayAvail || !dayAvail.is_available) {
          const patient = apt.profiles as { first_name?: string; last_name?: string } | null;
          affected.push({
            id: apt.id,
            appointment_date: apt.appointment_date,
            patient_name: patient ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim() : 'Unknown',
            reason: apt.reason
          });
          continue;
        }

        // Check if outside hours or during break
        const isNormalShift = dayAvail.start_time < dayAvail.end_time;
        let isOutside = false;

        if (isNormalShift) {
          if (aptTime < dayAvail.start_time || aptTime >= dayAvail.end_time) {
            isOutside = true;
          }
        } else {
          if (aptTime < dayAvail.start_time && aptTime >= dayAvail.end_time) {
            isOutside = true;
          }
        }

        if (!isOutside && dayAvail.break_start_time && dayAvail.break_end_time) {
          if (aptTime >= dayAvail.break_start_time && aptTime < dayAvail.break_end_time) {
            isOutside = true;
          }
        }

        if (isOutside) {
          const patient = apt.profiles as { first_name?: string; last_name?: string } | null;
          affected.push({
            id: apt.id,
            appointment_date: apt.appointment_date,
            patient_name: patient ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim() : 'Unknown',
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

  const handleSave = async (forceOverride = false) => {
    // Validate
    const errors = validateAvailability(availability, getDayName);
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast({
        title: t.error,
        description: "Please fix validation errors before saving",
        variant: "destructive",
      });
      return;
    }

    // Check affected appointments
    if (!forceOverride) {
      setSaving(true);
      const affected = await checkAffectedAppointments();
      setSaving(false);

      if (affected.length > 0) {
        setAffectedAppointments(affected);
        setShowAffectedDialog(true);
        return;
      }
    }

    setSaving(true);
    try {
      // Get business_id for the dentist
      const { data: dentistData, error: dentistError } = await supabase
        .from('dentists')
        .select('profile_id')
        .eq('id', dentistId)
        .single();

      if (dentistError) {
        logger.error('Error fetching dentist:', dentistError);
        throw new Error('Could not fetch dentist data');
      }

      let businessId: string | null = null;
      if (dentistData?.profile_id) {
        const { data: membership } = await supabase
          .from('business_members')
          .select('business_id')
          .eq('profile_id', dentistData.profile_id)
          .limit(1)
          .maybeSingle();

        businessId = membership?.business_id || null;
      }

      if (!businessId) {
        throw new Error('Could not determine business');
      }

      // Delete existing availability
      await supabase
        .from('dentist_availability')
        .delete()
        .eq('dentist_id', dentistId)
        .eq('business_id', businessId);

      // Insert new availability
      const dataToInsert = availability.map(day => {
        const hasBreak = !!day.break_start_time && !!day.break_end_time;
        return {
          dentist_id: dentistId,
          business_id: businessId,
          day_of_week: day.day_of_week,
          is_available: day.is_available,
          start_time: day.start_time,
          end_time: day.end_time,
          break_start_time: hasBreak ? day.break_start_time : null,
          break_end_time: hasBreak ? day.break_end_time : null,
        };
      });

      const { error: insertError } = await supabase
        .from('dentist_availability')
        .upsert(dataToInsert, {
          onConflict: 'dentist_id,day_of_week,business_id'
        });

      if (insertError) throw insertError;

      // Clear stale slots
      await supabase
        .from('appointment_slots')
        .delete()
        .eq('dentist_id', dentistId)
        .is('appointment_id', null);

      // Clear states
      setValidationErrors([]);
      setAffectedAppointments([]);
      setShowAffectedDialog(false);

      toast({
        title: t.success,
        description: t.availabilityUpdated,
      });

      fetchAvailability();
    } catch (error) {
      logger.error('Error saving availability:', error);
      toast({
        title: t.error,
        description: t.failedToSaveAvailability,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Validation Errors</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {t.weeklyAvailability}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Presets */}
          <div className="flex flex-wrap gap-2 justify-end">
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
              <Clock className="h-4 w-4 mr-2" />
              Standard 9-17
            </Button>
          </div>

          {DAYS_OF_WEEK.map((day, index) => {
            const dayAvailability = availability.find(a => a.day_of_week === day.value) || {
              day_of_week: day.value,
              is_available: false,
              start_time: '09:00',
              end_time: '17:00',
            };

            const hasError = validationErrors.some(e => e.dayOfWeek === day.value);

            return (
              <div
                key={day.value}
                className={`border rounded-lg p-4 space-y-4 ${hasError ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    {(t as unknown as Record<string, string>)[day.label] || day.label}
                  </Label>
                  <div className="flex items-center gap-3">
                    {dayAvailability.is_available && (
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
                        <SelectTrigger className="w-10 h-9 p-0 border-dashed">
                          <Copy className="h-4 w-4 text-muted-foreground" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekdays">Copy to all weekdays</SelectItem>
                          {DAYS_OF_WEEK.filter((_, i) => i !== index).map((targetDay) => (
                            <SelectItem key={targetDay.value} value={targetDay.value.toString()}>
                              Copy to {(t as unknown as Record<string, string>)[targetDay.label] || targetDay.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Switch
                      checked={dayAvailability.is_available}
                      onCheckedChange={(checked) => handleToggleDay(day.value, checked)}
                    />
                  </div>
                </div>

                {dayAvailability.is_available && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-4">
                    <div className="space-y-2">
                      <Label className="text-sm">{t.workingHours}</Label>
                      <div className="flex gap-2 items-center">
                        <Select
                          value={dayAvailability.start_time}
                          onValueChange={(value) => handleTimeChange(day.value, 'start_time', value)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_SLOTS.map(slot => (
                              <SelectItem key={slot.value} value={slot.value}>
                                {slot.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground">-</span>
                        <Select
                          value={dayAvailability.end_time}
                          onValueChange={(value) => handleTimeChange(day.value, 'end_time', value)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_SLOTS.map(slot => (
                              <SelectItem key={slot.value} value={slot.value}>
                                {slot.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">{t.breakTime}</Label>
                      <div className="flex gap-2 items-center">
                        <Select
                          value={dayAvailability.break_start_time || ''}
                          onValueChange={(value) => handleTimeChange(day.value, 'break_start_time', value)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={t.optional} />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_SLOTS.map(slot => (
                              <SelectItem key={slot.value} value={slot.value}>
                                {slot.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground">-</span>
                        <Select
                          value={dayAvailability.break_end_time || ''}
                          onValueChange={(value) => handleTimeChange(day.value, 'break_end_time', value)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={t.optional} />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_SLOTS.map(slot => (
                              <SelectItem key={slot.value} value={slot.value}>
                                {slot.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex justify-end gap-4 pt-4">
            <Button onClick={fetchAvailability} variant="outline" disabled={saving}>
              {t.cancel}
            </Button>
            <Button onClick={() => handleSave(false)} disabled={saving}>
              {saving ? t.saving || 'Saving...' : t.saveAvailability}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Affected Appointments Dialog */}
      <Dialog open={showAffectedDialog} onOpenChange={setShowAffectedDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Appointments May Be Affected
            </DialogTitle>
            <DialogDescription>
              The following {affectedAppointments.length} appointment(s) fall outside the new availability.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {affectedAppointments.map((apt) => (
              <div key={apt.id} className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200">
                <div className="font-medium">{apt.patient_name}</div>
                <div className="text-sm text-muted-foreground">
                  {format(parseISO(apt.appointment_date), 'EEEE, MMM d, yyyy - h:mm a')}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAffectedDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleSave(true)}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Anyway'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
