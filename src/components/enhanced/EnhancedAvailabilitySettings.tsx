import { useState, useEffect } from "react";
import { Clock, Save, Plus, Trash2, Calendar, Coffee } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { logger } from '@/lib/logger';
import { getCurrentBusinessId } from "@/lib/businessScopedSupabase";
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

interface EnhancedAvailabilitySettingsProps {
  dentistId: string;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday', short: 'M' },
  { value: 2, label: 'Tuesday', short: 'T' },
  { value: 3, label: 'Wednesday', short: 'W' },
  { value: 4, label: 'Thursday', short: 'T' },
  { value: 5, label: 'Friday', short: 'F' },
  { value: 6, label: 'Saturday', short: 'S' },
  { value: 0, label: 'Sunday', short: 'S' },
];

const VACATION_TYPES = [
  { value: 'vacation', label: 'Vacation', color: 'bg-blue-100 text-blue-800' },
  { value: 'sick', label: 'Sick Leave', color: 'bg-red-100 text-red-800' },
  { value: 'personal', label: 'Congé personnel', color: 'bg-green-100 text-green-800' },
];

export function EnhancedAvailabilitySettings({ dentistId }: EnhancedAvailabilitySettingsProps) {
  const [availability, setAvailability] = useState<DentistAvailability[]>([]);
  const [vacationDays, setVacationDays] = useState<VacationDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newVacation, setNewVacation] = useState<VacationDay>({
    start_date: '',
    end_date: '',
    vacation_type: 'vacation',
    reason: '',
    is_approved: true
  });
  const { toast } = useToast();
  const { t } = useLanguage();

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
    { value: 'vacation', label: t.vacationsTypeVacation, color: 'bg-blue-100 text-blue-800' },
    { value: 'sick', label: t.vacationsTypeSick, color: 'bg-red-100 text-red-800' },
    { value: 'personal', label: t.vacationsTypePersonal, color: 'bg-green-100 text-green-800' },
  ];
  useEffect(() => {
    Promise.all([fetchAvailability(), fetchVacationDays()]);
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
  };

  const saveAvailability = async () => {
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

  if (loading) {
    return <div className="flex justify-center p-8">{t.loadingSettings}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20 p-6 rounded-2xl border-2 border-blue-100 dark:border-blue-900 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              {t.availabilityManagement}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Manage your working hours and time off</p>
          </div>
        </div>
        <Button
          onClick={saveAvailability}
          disabled={saving}
          size="lg"
          className="h-12 px-8 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg font-semibold"
        >
          <Save className="h-5 w-5 mr-2" />
          {saving ? t.saving : t.saveAvailability}
        </Button>
      </div>

      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-14 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-950/50 dark:to-purple-950/50 p-1 rounded-xl shadow-inner">
          <TabsTrigger
            value="schedule"
            className="text-sm sm:text-base font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg"
          >
            <Calendar className="h-4 w-4 mr-2" />
            {t.weeklySchedule}
          </TabsTrigger>
          <TabsTrigger
            value="vacation"
            className="text-sm sm:text-base font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg"
          >
            <Coffee className="h-4 w-4 mr-2" />
            {t.vacationsAbsences}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <Card className="glass-card border-2 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 border-b">
              <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
                <Calendar className="h-6 w-6 mr-3 text-blue-600" />
                {t.weeklyPlanning}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Quick Preset Button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-6 rounded-xl border-2 border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-950/30 font-semibold"
                  onClick={() => {
                    setAvailability(prev => prev.map(day => ({
                      ...day,
                      is_available: day.day_of_week !== 1, // All except Monday
                      start_time: '10:00',
                      end_time: '18:00',
                      break_start_time: '',
                      break_end_time: ''
                    })));
                  }}
                >
                  <Clock className="h-5 w-5 mr-2 text-blue-600" />
                  Tue-Sun 10-18 (No breaks)
                </Button>
              </div>

              {/* Day Schedule Grid */}
              <div className="grid gap-4">
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
                    <Card key={day.value} className={`border-2 transition-all ${dayAvailability.is_available ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                      <CardContent className="p-5">
                        <div className="space-y-4">
                          {/* Day Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${dayAvailability.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {day.short}
                              </div>
                              <Label className="text-lg font-medium">{day.label}</Label>
                            </div>
                            <Switch
                              checked={dayAvailability.is_available}
                              onCheckedChange={(checked) =>
                                updateAvailability(index, 'is_available', checked)
                              }
                              className="scale-125"
                            />
                          </div>

                          {/* Time Settings - Improved responsive grid */}
                          {dayAvailability.is_available && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div>
                                <Label htmlFor={`start-${day.value}`} className="text-sm font-medium">{t.startTime}</Label>
                                <Input
                                  id={`start-${day.value}`}
                                  type="time"
                                  value={dayAvailability.start_time}
                                  onChange={(e) =>
                                    updateAvailability(index, 'start_time', e.target.value)
                                  }
                                  className="h-10 mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`end-${day.value}`} className="text-sm font-medium">{t.endTime}</Label>
                                <Input
                                  id={`end-${day.value}`}
                                  type="time"
                                  value={dayAvailability.end_time}
                                  onChange={(e) =>
                                    updateAvailability(index, 'end_time', e.target.value)
                                  }
                                  className="h-10 mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`break-start-${day.value}`} className="text-sm font-medium">
                                  <Coffee className="h-3 w-3 inline mr-1" />
                                  {t.breakStart} <span className="text-muted-foreground">(optional)</span>
                                </Label>
                                <Input
                                  id={`break-start-${day.value}`}
                                  type="time"
                                  value={dayAvailability.break_start_time || ''}
                                  onChange={(e) =>
                                    updateAvailability(index, 'break_start_time', e.target.value || null)
                                  }
                                  className="h-10 mt-1"
                                  placeholder="No break"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`break-end-${day.value}`} className="text-sm font-medium">
                                  <Coffee className="h-3 w-3 inline mr-1" />
                                  {t.breakEnd} <span className="text-muted-foreground">(optional)</span>
                                </Label>
                                <Input
                                  id={`break-end-${day.value}`}
                                  type="time"
                                  value={dayAvailability.break_end_time || ''}
                                  onChange={(e) =>
                                    updateAvailability(index, 'break_end_time', e.target.value || null)
                                  }
                                  className="h-10 mt-1"
                                  placeholder="No break"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vacation">
          <div className="space-y-6">
            {/* Add New Vacation */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="h-5 w-5 mr-2" />
                  {t.addVacation}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="start-date">{t.startDate}</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={newVacation.start_date}
                      onChange={(e) => setNewVacation(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">{t.endDate}</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={newVacation.end_date}
                      onChange={(e) => setNewVacation(prev => ({ ...prev, end_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>{t.vacationType}</Label>
                    <Select
                      value={newVacation.vacation_type}
                      onValueChange={(value: 'vacation' | 'sick' | 'personal') =>
                        setNewVacation(prev => ({ ...prev, vacation_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VACATION_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addVacationDay} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      {t.addButton}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="vacation-reason">{t.reason} ({t.optional})</Label>
                  <Textarea
                    id="vacation-reason"
                    placeholder={t.reason}
                    value={newVacation.reason || ''}
                    onChange={(e) => setNewVacation(prev => ({ ...prev, reason: e.target.value }))}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Vacation List */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>{t.scheduledVacations}</CardTitle>
              </CardHeader>
              <CardContent>
                {vacationDays.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t.noVacationsScheduled}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vacationDays.map((vacation) => {
                      const typeConfig = getVacationTypeConfig(vacation.vacation_type);
                      const startDate = new Date(vacation.start_date);
                      const endDate = new Date(vacation.end_date);
                      const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                      return (
                        <Card key={vacation.id} className="border">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center space-x-3">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeConfig.color}`}>
                                    {typeConfig.label}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {duration} {duration > 1 ? t.days : t.day}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm">
                                  <span>{startDate.toLocaleDateString()}</span>
                                  <span>-</span>
                                  <span>{endDate.toLocaleDateString()}</span>
                                </div>
                                {vacation.reason && (
                                  <p className="text-sm text-muted-foreground">{vacation.reason}</p>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => vacation.id && deleteVacationDay(vacation.id)}
                                className="text-red-600 hover:text-red-700"
                                aria-label={t.deleteVacation}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}