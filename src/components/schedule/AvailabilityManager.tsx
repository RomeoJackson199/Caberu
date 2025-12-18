import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, Plus, Trash2 } from "lucide-react";
import { logger } from '@/lib/logger';

interface DayAvailability {
  id?: string;
  day_of_week: number;
  is_available: boolean;
  start_time: string;
  end_time: string;
  break_start_time?: string;
  break_end_time?: string;
}

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
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailability();
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
        const defaultAvailability = DAYS_OF_WEEK.map(day => ({
          day_of_week: day.value,
          is_available: day.value >= 1 && day.value <= 5, // Mon-Fri by default
          start_time: '09:00',
          end_time: '17:00',
          break_start_time: '12:00',
          break_end_time: '13:00',
        }));
        setAvailability(defaultAvailability);
      } else {
        setAvailability(data);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast({
        title: t.error,
        description: t.failedToLoadAvailability,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDay = async (dayOfWeek: number, isAvailable: boolean) => {
    const updatedAvailability = availability.map(day =>
      day.day_of_week === dayOfWeek ? { ...day, is_available: isAvailable } : day
    );
    setAvailability(updatedAvailability);
  };

  const handleTimeChange = (dayOfWeek: number, field: keyof DayAvailability, value: string) => {
    const updatedAvailability = availability.map(day =>
      day.day_of_week === dayOfWeek ? { ...day, [field]: value } : day
    );
    setAvailability(updatedAvailability);
  };

  const handleSave = async () => {
    try {
      // Get business_id for the dentist
      const { data: dentistData, error: dentistError } = await supabase
        .from('dentists')
        .select('profile_id')
        .eq('id', dentistId)
        .single();

      if (dentistError) {
        console.error('Error fetching dentist:', dentistError);
        throw new Error('Could not fetch dentist data');
      }

      let businessId: string | null = null;
      if (dentistData?.profile_id) {
        const { data: membership, error: membershipError } = await supabase
          .from('business_members')
          .select('business_id')
          .eq('profile_id', dentistData.profile_id)
          .limit(1)
          .maybeSingle();
        
        if (membershipError) {
          console.error('Error fetching membership:', membershipError);
        }
        businessId = membership?.business_id || null;
      }

      if (!businessId) {
        throw new Error('Could not determine business');
      }

      console.log('Saving availability for dentist:', dentistId, 'business:', businessId);

      // Delete existing availability - include business_id for RLS
      const { error: deleteError } = await supabase
        .from('dentist_availability')
        .delete()
        .eq('dentist_id', dentistId)
        .eq('business_id', businessId);

      if (deleteError) {
        console.error('Error deleting old availability:', deleteError);
        // Continue anyway - might be first time setting availability
      }

      // Insert ALL days (including unavailable ones for tracking)
      const dataToInsert = availability.map(day => ({
        dentist_id: dentistId,
        business_id: businessId,
        day_of_week: day.day_of_week,
        is_available: day.is_available,
        start_time: day.start_time,
        end_time: day.end_time,
        break_start_time: day.break_start_time || null,
        break_end_time: day.break_end_time || null,
      }));

      console.log('Inserting availability:', dataToInsert);

      const { error: insertError } = await supabase
        .from('dentist_availability')
        .upsert(dataToInsert, { 
          onConflict: 'dentist_id,day_of_week,business_id'
        });

      if (insertError) {
        console.error('Error inserting availability:', insertError);
        throw insertError;
      }

      // Clear stale appointment slots so they regenerate with new times
      const { error: slotsError } = await supabase
        .from('appointment_slots')
        .delete()
        .eq('dentist_id', dentistId)
        .is('appointment_id', null);

      if (slotsError) {
        console.error('Error clearing slots (non-fatal):', slotsError);
      }

      toast({
        title: t.success,
        description: t.availabilityUpdated,
      });

      fetchAvailability();
    } catch (error) {
      console.error('Error saving availability:', error);
      toast({
        title: t.error,
        description: t.failedToSaveAvailability,
        variant: "destructive",
      });
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {t.weeklyAvailability}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS_OF_WEEK.map((day) => {
            const dayAvailability = availability.find(a => a.day_of_week === day.value) || {
              day_of_week: day.value,
              is_available: false,
              start_time: '09:00',
              end_time: '17:00',
            };

            return (
              <div key={day.value} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    {(t as unknown as Record<string, string>)[day.label] || day.label}
                  </Label>
                  <Switch
                    checked={dayAvailability.is_available}
                    onCheckedChange={(checked) => handleToggleDay(day.value, checked)}
                  />
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
            <Button onClick={fetchAvailability} variant="outline">
              {t.cancel}
            </Button>
            <Button onClick={handleSave}>
              {t.saveAvailability}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
