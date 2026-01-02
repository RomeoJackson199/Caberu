import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { NotificationService } from '@/lib/notificationService';
import { NotificationPreferences } from '@/types/common';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Mail, Phone, Clock } from 'lucide-react';
import { logger } from '@/lib/logger';

export const NotificationSettings: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingSMS, setTestingSMS] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const prefs = await NotificationService.getNotificationPreferences(user.id);
        setPreferences(prefs);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load notification preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!preferences) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await NotificationService.updateNotificationPreferences(user.id, preferences);
        toast({
          title: "Success",
          description: "Notification preferences saved successfully",
        });
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save notification preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const testEmailNotification = async () => {
    setTestingEmail(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await NotificationService.createNotification(
          user.id,
          'Test Email Notification',
          'This is a test email notification to verify your email settings are working correctly.',
          'system',
          'info',
          undefined,
          undefined,
          undefined,
          true // sendEmail
        );
        toast({
          title: "Test Email Sent",
          description: "Check your email inbox for the test notification",
        });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: "Error",
        description: "Failed to send test email",
        variant: "destructive",
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const testSMSNotification = async () => {
    setTestingSMS(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await NotificationService.createNotification(
          user.id,
          'Test SMS Notification (Disabled)',
          'SMS testing is currently disabled.',
          'system',
          'info',
          undefined,
          undefined,
          undefined,
          false // sendEmail only for now
        );
        toast({
          title: "Test SMS Sent",
          description: "Check your phone for the test SMS",
        });
      }
    } catch (error) {
      console.error('Error sending test SMS:', error);
      toast({
        title: "Error", 
        description: "Failed to send test SMS",
        variant: "destructive",
      });
    } finally {
      setTestingSMS(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean | string) => {
    if (preferences) {
      setPreferences({
        ...preferences,
        [key]: value,
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Failed to load notification preferences.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <Label htmlFor="email-enabled" className="text-sm font-medium">
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="email-enabled"
                checked={preferences.email_enabled}
                onCheckedChange={(checked) => updatePreference('email_enabled', checked)}
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={testEmailNotification}
                disabled={!preferences.email_enabled || testingEmail}
              >
                {testingEmail ? 'Sending...' : 'Test'}
              </Button>
            </div>
          </div>

          {/* SMS Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-primary" />
              <div>
                <Label htmlFor="sms-enabled" className="text-sm font-medium">
                  SMS Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via text message
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="sms-enabled"
                checked={preferences.sms_enabled}
                onCheckedChange={(checked) => updatePreference('sms_enabled', checked)}
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={testSMSNotification}
                disabled={!preferences.sms_enabled || testingSMS}
              >
                {testingSMS ? 'Sending...' : 'Test'}
              </Button>
            </div>
          </div>

          {/* In-App Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <Label htmlFor="in-app-enabled" className="text-sm font-medium">
                  In-App Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Show notifications in the app
                </p>
              </div>
            </div>
            <Switch
              id="in-app-enabled"
              checked={preferences.in_app_enabled}
              onCheckedChange={(checked) => updatePreference('in_app_enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Select which types of notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="appointment-reminders" className="text-sm font-medium">
              Appointment Reminders
            </Label>
            <Switch
              id="appointment-reminders"
              checked={preferences.appointment_reminders}
              onCheckedChange={(checked) => updatePreference('appointment_reminders', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="prescription-updates" className="text-sm font-medium">
              Prescription Updates
            </Label>
            <Switch
              id="prescription-updates"
              checked={preferences.prescription_updates}
              onCheckedChange={(checked) => updatePreference('prescription_updates', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="treatment-plan-updates" className="text-sm font-medium">
              Treatment Plan Updates
            </Label>
            <Switch
              id="treatment-plan-updates"
              checked={preferences.treatment_plan_updates}
              onCheckedChange={(checked) => updatePreference('treatment_plan_updates', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="emergency-alerts" className="text-sm font-medium">
              Emergency Alerts
            </Label>
            <Switch
              id="emergency-alerts"
              checked={preferences.emergency_alerts}
              onCheckedChange={(checked) => updatePreference('emergency_alerts', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="system-notifications" className="text-sm font-medium">
              System Notifications
            </Label>
            <Switch
              id="system-notifications"
              checked={preferences.system_notifications}
              onCheckedChange={(checked) => updatePreference('system_notifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Set when you don't want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quiet-start" className="text-sm font-medium">
                Start Time
              </Label>
              <Input
                id="quiet-start"
                type="time"
                value={preferences.quiet_hours_start}
                onChange={(e) => updatePreference('quiet_hours_start', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="quiet-end" className="text-sm font-medium">
                End Time
              </Label>
              <Input
                id="quiet-end"
                type="time"
                value={preferences.quiet_hours_end}
                onChange={(e) => updatePreference('quiet_hours_end', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={savePreferences} 
          disabled={saving}
          className="min-w-[120px]"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};