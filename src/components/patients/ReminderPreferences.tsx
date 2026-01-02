import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Bell, Mail, MessageSquare, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferences {
  email_reminders: boolean;
  sms_reminders: boolean;
  reminder_24h: boolean;
  reminder_2h: boolean;
  reminder_1h: boolean;
}

export function ReminderPreferences() {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_reminders: true,
    sms_reminders: false,
    reminder_24h: true,
    reminder_2h: true,
    reminder_1h: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences({
          email_reminders: data.email_reminders,
          sms_reminders: data.sms_reminders,
          reminder_24h: data.reminder_24h,
          reminder_2h: data.reminder_2h,
          reminder_1h: data.reminder_1h,
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          profile_id: profile.id,
          ...preferences,
        });

      if (error) throw error;

      toast({
        title: "Preferences Saved",
        description: "Your notification preferences have been updated",
      });
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Appointment Reminders
        </CardTitle>
        <CardDescription>
          Choose how and when you want to be reminded about your appointments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Communication Methods */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Communication Methods</h3>
          
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <Label htmlFor="email-reminders" className="cursor-pointer">
                <div className="font-medium">Email Reminders</div>
                <div className="text-sm text-muted-foreground">
                  Receive reminders via email
                </div>
              </Label>
            </div>
            <Switch
              id="email-reminders"
              checked={preferences.email_reminders}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, email_reminders: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <Label htmlFor="sms-reminders" className="cursor-pointer">
                <div className="font-medium">SMS Reminders</div>
                <div className="text-sm text-muted-foreground">
                  Receive text message reminders
                </div>
              </Label>
            </div>
            <Switch
              id="sms-reminders"
              checked={preferences.sms_reminders}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, sms_reminders: checked })
              }
            />
          </div>
        </div>

        {/* Reminder Timing */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Reminder Timing
          </h3>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="reminder-24h" className="cursor-pointer">
              <div className="font-medium">24 Hours Before</div>
              <div className="text-sm text-muted-foreground">
                Day before appointment
              </div>
            </Label>
            <Switch
              id="reminder-24h"
              checked={preferences.reminder_24h}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, reminder_24h: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="reminder-2h" className="cursor-pointer">
              <div className="font-medium">2 Hours Before</div>
              <div className="text-sm text-muted-foreground">
                Same-day reminder
              </div>
            </Label>
            <Switch
              id="reminder-2h"
              checked={preferences.reminder_2h}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, reminder_2h: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="reminder-1h" className="cursor-pointer">
              <div className="font-medium">1 Hour Before</div>
              <div className="text-sm text-muted-foreground">
                Last-minute reminder
              </div>
            </Label>
            <Switch
              id="reminder-1h"
              checked={preferences.reminder_1h}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, reminder_1h: checked })
              }
            />
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}
