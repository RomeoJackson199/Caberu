import { useState, useEffect } from "react";
import { Clock, Save, Calendar, X, Check, Plus, Minus, AlertCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

interface AvailabilitySettingsProps {
  dentistId: string;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday', short: 'Mon', color: 'bg-blue-100 text-blue-800' },
  { value: 2, label: 'Tuesday', short: 'Tue', color: 'bg-green-100 text-green-800' },
  { value: 3, label: 'Wednesday', short: 'Wed', color: 'bg-purple-100 text-purple-800' },
  { value: 4, label: 'Thursday', short: 'Thu', color: 'bg-orange-100 text-orange-800' },
  { value: 5, label: 'Friday', short: 'Fri', color: 'bg-red-100 text-red-800' },
  { value: 6, label: 'Saturday', short: 'Sat', color: 'bg-indigo-100 text-indigo-800' },
  { value: 0, label: 'Sunday', short: 'Sun', color: 'bg-gray-100 text-gray-800' },
];

const QUICK_PRESETS = [
  {
    name: "Standard Week",
    description: "Monday to Friday, 9 AM - 5 PM",
    schedule: [
      { day: 1, start: "09:00", end: "17:00", available: true },
      { day: 2, start: "09:00", end: "17:00", available: true },
      { day: 3, start: "09:00", end: "17:00", available: true },
      { day: 4, start: "09:00", end: "17:00", available: true },
      { day: 5, start: "09:00", end: "17:00", available: true },
      { day: 6, start: "09:00", end: "17:00", available: false },
      { day: 0, start: "09:00", end: "17:00", available: false },
    ]
  },
  {
    name: "Extended Hours",
    description: "Monday to Saturday, 8 AM - 6 PM",
    schedule: [
      { day: 1, start: "08:00", end: "18:00", available: true },
      { day: 2, start: "08:00", end: "18:00", available: true },
      { day: 3, start: "08:00", end: "18:00", available: true },
      { day: 4, start: "08:00", end: "18:00", available: true },
      { day: 5, start: "08:00", end: "18:00", available: true },
      { day: 6, start: "08:00", end: "18:00", available: true },
      { day: 0, start: "08:00", end: "18:00", available: false },
    ]
  },
  {
    name: "Part-Time",
    description: "Tuesday, Thursday, Saturday only",
    schedule: [
      { day: 1, start: "09:00", end: "17:00", available: false },
      { day: 2, start: "09:00", end: "17:00", available: true },
      { day: 3, start: "09:00", end: "17:00", available: false },
      { day: 4, start: "09:00", end: "17:00", available: true },
      { day: 5, start: "09:00", end: "17:00", available: false },
      { day: 6, start: "09:00", end: "17:00", available: true },
      { day: 0, start: "09:00", end: "17:00", available: false },
    ]
  }
];

export function AvailabilitySettings({ dentistId }: AvailabilitySettingsProps) {
  const [availability, setAvailability] = useState<DentistAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [activeTab, setActiveTab] = useState("weekly");
  const { toast } = useToast();

  useEffect(() => {
    fetchAvailability();
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
      toast({
        title: "Error",
        description: "Failed to fetch availability settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAvailability = (dayIndex: number, field: keyof DentistAvailability, value: any) => {
    setAvailability(prev => 
      prev.map((day, index) => 
        index === dayIndex ? { ...day, [field]: value } : day
      )
    );
  };

  const applyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    const newAvailability = availability.map(day => {
      const presetDay = preset.schedule.find(p => p.day === day.day_of_week);
      if (presetDay) {
        return {
          ...day,
          start_time: presetDay.start,
          end_time: presetDay.end,
          is_available: presetDay.available,
        };
      }
      return day;
    });
    setAvailability(newAvailability);
    setShowPresets(false);
    toast({
      title: "Preset Applied",
      description: `${preset.name} schedule has been applied`,
    });
  };

  const quickToggleDay = (dayIndex: number) => {
    const day = availability[dayIndex];
    updateAvailability(dayIndex, 'is_available', !day.is_available);
  };

  const quickSetHours = (dayIndex: number, hours: string) => {
    const [start, end] = hours.split('-');
    updateAvailability(dayIndex, 'start_time', start);
    updateAvailability(dayIndex, 'end_time', end);
  };

  const saveAvailability = async () => {
    setSaving(true);
    try {
      // Get current business context
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Get business_id from business_members (use current session business or first available)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!profileData) throw new Error('Profile not found');

      // Try to get business from session_business first, fallback to first business_member
      const { data: sessionBusiness } = await supabase
        .from('session_business')
        .select('business_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      let businessId = sessionBusiness?.business_id;

      if (!businessId) {
        // Fallback to first business membership
        const { data: memberData, error: memberError } = await supabase
          .from('business_members')
          .select('business_id')
          .eq('profile_id', profileData.id)
          .limit(1)
          .maybeSingle();

        if (memberError) throw memberError;
        if (!memberData) throw new Error('No business membership found');
        businessId = memberData.business_id;
      }

      // Delete existing availability for this dentist and business
      await supabase
        .from('dentist_availability')
        .delete()
        .eq('dentist_id', dentistId)
        .eq('business_id', businessId);

      // Insert new availability settings with business_id (store all days)
      const availabilityData = availability.map(day => {
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
        const { error } = await supabase
          .from('dentist_availability')
          .insert(availabilityData);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Availability settings saved successfully",
      });
    } catch (error) {
      console.error('Failed to save availability:', error);
      toast({
        title: "Error",
        description: "Failed to save availability settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getWorkingDaysCount = () => {
    return availability.filter(day => day.is_available).length;
  };

  const getTotalHours = () => {
    return availability
      .filter(day => day.is_available)
      .reduce((total, day) => {
        const start = parseInt(day.start_time.split(':')[0]);
        const end = parseInt(day.end_time.split(':')[0]);
        return total + (end - start);
      }, 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dental-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading availability settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-dental-primary/10">
            <Clock className="h-6 w-6 text-dental-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Availability Settings</h2>
            <p className="text-muted-foreground">Manage your working hours and schedule</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={showPresets} onOpenChange={setShowPresets}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Quick Presets
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Quick Schedule Presets</DialogTitle>
                <DialogDescription>Choose a preset to quickly configure your availability.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {QUICK_PRESETS.map((preset, index) => (
                  <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{preset.name}</h4>
                          <p className="text-sm text-muted-foreground">{preset.description}</p>
                        </div>
                        <Button size="sm" onClick={() => applyPreset(preset)}>
                          Apply
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={saveAvailability} disabled={saving} className="bg-dental-primary">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-dental-primary">{getWorkingDaysCount()}</div>
            <div className="text-sm text-muted-foreground">Working Days</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{getTotalHours()}</div>
            <div className="text-sm text-muted-foreground">Total Hours/Week</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {availability.filter(day => day.is_available).length > 0 ? "Available" : "Unavailable"}
            </div>
            <div className="text-sm text-muted-foreground">Current Status</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="weekly">Weekly Schedule</TabsTrigger>
          <TabsTrigger value="quick">Quick Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="space-y-4">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="space-y-4">
                {DAYS_OF_WEEK.map((day, index) => {
                  const dayAvailability = availability[index];
                  const isAvailable = dayAvailability.is_available;
                  
                  return (
                    <div key={day.value} className={`border rounded-xl p-4 transition-all duration-300 ${
                      isAvailable ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-gray-50/50'
                    }`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <Badge className={day.color}>
                            {day.short}
                          </Badge>
                          <Label className="text-lg font-medium">{day.label}</Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Switch
                            checked={isAvailable}
                            onCheckedChange={(checked) => 
                              updateAvailability(index, 'is_available', checked)
                            }
                          />
                          {isAvailable && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <Check className="h-3 w-3 mr-1" />
                              Available
                            </Badge>
                          )}
                        </div>
                      </div>

                      {isAvailable && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <Label htmlFor={`start-${day.value}`} className="text-sm font-medium">Start Time</Label>
                              <Input
                                id={`start-${day.value}`}
                                type="time"
                                value={dayAvailability.start_time}
                                onChange={(e) => 
                                  updateAvailability(index, 'start_time', e.target.value)
                                }
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`end-${day.value}`} className="text-sm font-medium">End Time</Label>
                              <Input
                                id={`end-${day.value}`}
                                type="time"
                                value={dayAvailability.end_time}
                                onChange={(e) => 
                                  updateAvailability(index, 'end_time', e.target.value)
                                }
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`break-start-${day.value}`} className="text-sm font-medium">Break Start</Label>
                              <Input
                                id={`break-start-${day.value}`}
                                type="time"
                                value={dayAvailability.break_start_time || ''}
                                onChange={(e) => 
                                  updateAvailability(index, 'break_start_time', e.target.value || null)
                                }
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`break-end-${day.value}`} className="text-sm font-medium">Break End</Label>
                              <Input
                                id={`break-end-${day.value}`}
                                type="time"
                                value={dayAvailability.break_end_time || ''}
                                onChange={(e) => 
                                  updateAvailability(index, 'break_end_time', e.target.value || null)
                                }
                                className="mt-1"
                              />
                            </div>
                          </div>
                          
                          {/* Quick Hour Presets */}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => quickSetHours(index, "09:00-17:00")}
                              className="text-xs"
                            >
                              9 AM - 5 PM
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => quickSetHours(index, "08:00-18:00")}
                              className="text-xs"
                            >
                              8 AM - 6 PM
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => quickSetHours(index, "10:00-16:00")}
                              className="text-xs"
                            >
                              10 AM - 4 PM
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quick" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    availability.forEach((_, index) => {
                      updateAvailability(index, 'is_available', true);
                    });
                  }}
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <Check className="h-6 w-6 text-green-600" />
                  <span>Make All Days Available</span>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    availability.forEach((_, index) => {
                      updateAvailability(index, 'is_available', false);
                    });
                  }}
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <X className="h-6 w-6 text-red-600" />
                  <span>Make All Days Unavailable</span>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    availability.forEach((day, index) => {
                      updateAvailability(index, 'is_available', day.day_of_week >= 1 && day.day_of_week <= 5);
                    });
                  }}
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <Calendar className="h-6 w-6 text-blue-600" />
                  <span>Weekdays Only (Mon-Fri)</span>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    availability.forEach((day, index) => {
                      updateAvailability(index, 'is_available', day.day_of_week >= 6 || day.day_of_week === 0);
                    });
                  }}
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <Calendar className="h-6 w-6 text-purple-600" />
                  <span>Weekends Only (Sat-Sun)</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}