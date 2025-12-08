import { supabase } from '../integrations/supabase/client';
import { Notification, NotificationPreferences, NotificationTemplate } from '../types/common';
import { logger } from '@/lib/logger';

export class NotificationService {
  // Get all notifications for a user
  static async getNotifications(userId: string, limit = 50, offset = 0): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching notifications:', error);
      throw new Error('Failed to fetch notifications');
    }

    const rows = (data ?? []) as any[];
    // Ensure metadata is an object to satisfy Notification type
    return rows.map((row) => ({ ...row, metadata: (row.metadata && typeof row.metadata === 'object') ? row.metadata : {} })) as unknown as Notification[];
  }

  // Get unread notifications count
  static async getUnreadCount(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      logger.error('Error fetching unread count:', error);
      throw new Error('Failed to fetch unread count');
    }

    return data?.length || 0;
  }

// Mark notification as read
static async markAsRead(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    logger.error('Error marking notification as read:', error);
    throw new Error('Failed to mark notification as read');
  }

  return true;
}

// Mark all notifications as read
static async markAllAsRead(): Promise<number> {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .select('id');

  if (error) {
    logger.error('Error marking all notifications as read:', error);
    throw new Error('Failed to mark all notifications as read');
  }

  return data?.length || 0;
}

  // Create a new notification with email sending only
  static async createNotification(
    userId: string,
    title: string,
    message: string,
    type: Notification['type'] = 'system',
    category: Notification['category'] = 'info',
    actionUrl?: string,
    metadata?: Record<string, unknown>,
    expiresAt?: string,
    sendEmail = true
  ): Promise<string> {
const { data, error } = await supabase
  .from('notifications')
  .insert({
    user_id: userId,
    type,
    category,
    title,
    message,
    action_url: actionUrl,
    metadata: (metadata as any) || null,
    expires_at: expiresAt || null,
    is_read: false,
    created_at: new Date().toISOString(),
  })
  .select('id')
  .single();

if (error) {
  logger.error('Error creating notification:', error);
  throw new Error('Failed to create notification');
}

// Send email notification if enabled
await this.sendEmailNotification(userId, title, message, type, sendEmail, metadata);

return data.id;
  }

  // Send email notification only
  static async sendEmailNotification(
    userId: string,
    title: string,
    message: string,
    type: Notification['type'],
    sendEmail = true,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!sendEmail) {
      return;
    }

    try {
      // Get user profile for contact info
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, first_name, last_name, id')
        .eq('user_id', userId)
        .single();

      if (profileError || !profile) {
        logger.error('❌ Profile not found for user:', userId, profileError);
        throw new Error('User profile not found');
      }

      const recipientEmail = (metadata?.email as string) || profile.email;
      if (!recipientEmail) {
        logger.error('❌ No email address available');
        throw new Error('No email address found');
      }

      // Invoke the edge function with simplified parameters
      const { data, error } = await supabase.functions.invoke('send-email-notification', {
        body: {
          to: recipientEmail,
          subject: title,
          message: message,
          messageType: this.mapNotificationTypeToEmail(type),
          patientId: profile.id,
          dentistId: metadata?.dentistId || null,
          isSystemNotification: !metadata?.dentistId // Flag for system notifications
        }
      });

      if (error) {
        logger.error('❌ Edge function error:', error);
        throw new Error(`Email service error: ${error.message}`);
      }

    } catch (error) {
      logger.error('❌ Email notification failed:', error);
      throw error;
    }
  }

  // Map notification type to email message type
  private static mapNotificationTypeToEmail(type: Notification['type']): string {
    switch (type) {
      case 'appointment': return 'appointment_confirmation';
      case 'prescription': return 'prescription';
      case 'system': return 'system';
      default: return 'system';
    }
  }


  // Create appointment reminder notification
  static async createAppointmentReminder(
    appointmentId: string,
    reminderType: '24h' | '2h' | '1h' = '24h'
  ): Promise<string> {
    // First, fetch the appointment to get the patient_id (user_id)
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('patient_id')
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      logger.error('Error fetching appointment for reminder:', appointmentError);
      throw new Error('Failed to fetch appointment for reminder');
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: appointment.patient_id,
        type: 'appointment',
        category: 'info',
        title: `Appointment Reminder (${reminderType})`,
        message: `Reminder for appointment ${appointmentId}`,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Error creating appointment reminder:', error);
      throw new Error('Failed to create appointment reminder');
    }

    return data.id;
  }

  // Create prescription notification
  static async createPrescriptionNotification(prescriptionId: string): Promise<string> {
    // First, fetch the prescription to get the patient_id (user_id)
    const { data: prescription, error: prescriptionError } = await supabase
      .from('prescriptions')
      .select('patient_id')
      .eq('id', prescriptionId)
      .single();

    if (prescriptionError || !prescription) {
      logger.error('Error fetching prescription for notification:', prescriptionError);
      throw new Error('Failed to fetch prescription for notification');
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: prescription.patient_id,
        type: 'prescription',
        category: 'info',
        title: 'New Prescription',
        message: `Prescription created (${prescriptionId})`,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Error creating prescription notification:', error);
      throw new Error('Failed to create prescription notification');
    }

    return data.id;
  }

  // Create treatment plan notification
  static async createTreatmentPlanNotification(
    treatmentPlanId: string,
    notificationType: 'created' | 'updated' | 'completed' = 'created'
  ): Promise<string> {
    // First, fetch the treatment plan to get the patient_id (user_id)
    const { data: treatmentPlan, error: treatmentPlanError } = await supabase
      .from('treatment_plans')
      .select('patient_id')
      .eq('id', treatmentPlanId)
      .single();

    if (treatmentPlanError || !treatmentPlan) {
      logger.error('Error fetching treatment plan for notification:', treatmentPlanError);
      throw new Error('Failed to fetch treatment plan for notification');
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: treatmentPlan.patient_id,
        type: 'treatment_plan',
        category: 'info',
        title: `Treatment Plan ${notificationType}`,
        message: `Treatment plan update (${treatmentPlanId})`,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Error creating treatment plan notification:', error);
      throw new Error('Failed to create treatment plan notification');
    }

    return data.id;
  }

  // Get notification preferences
  static async getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        // Return default preferences if none exist
        return {
          id: `default-${userId}`,
          user_id: userId,
          email_enabled: true,
          sms_enabled: false, // Disabled for now
          push_enabled: true,
          in_app_enabled: true,
          appointment_reminders: true,
          prescription_updates: true,
          treatment_plan_updates: true,
          emergency_alerts: true,
          system_notifications: true,
          quiet_hours_start: '22:00',
          quiet_hours_end: '07:00',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      return data as any;
    } catch (error) {
      logger.error('Error fetching notification preferences:', error);
      // Return default preferences on error
      return {
        id: `default-${userId}`,
        user_id: userId,
        email_enabled: true,
        sms_enabled: false,
        push_enabled: true,
        in_app_enabled: true,
        appointment_reminders: true,
        prescription_updates: true,
        treatment_plan_updates: true,
        emergency_alerts: true,
        system_notifications: true,
        quiet_hours_start: '22:00',
        quiet_hours_end: '07:00',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  }

// Update notification preferences
static async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        logger.error('Error updating notification preferences:', error);
        throw new Error('Failed to update notification preferences');
      }

      return data as any;
    } catch (error) {
      logger.error('Error updating notification preferences:', error);
      // Return merged default preferences on error
      const defaultPrefs: NotificationPreferences = {
        id: `default-${userId}`,
        user_id: userId,
        email_enabled: true,
        sms_enabled: false,
        push_enabled: true,
        in_app_enabled: true,
        appointment_reminders: true,
        prescription_updates: true,
        treatment_plan_updates: true,
        emergency_alerts: true,
        system_notifications: true,
        quiet_hours_start: '22:00',
        quiet_hours_end: '07:00',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      return { ...defaultPrefs, ...preferences, updated_at: new Date().toISOString() } as NotificationPreferences;
    }
  }

  // Get notification templates
static async getNotificationTemplates(): Promise<NotificationTemplate[]> {
    return [];
  }

  // Create notification from template
static async createNotificationFromTemplate(
    userId: string,
    templateKey: string,
    variables: Record<string, string> = {},
    actionUrl?: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const title = templateKey;
    const message = Object.entries(variables).map(([k,v]) => `${k}: ${v}`).join(', ');
    return this.createNotification(userId, title, message, 'system', 'info' as any, actionUrl, metadata);
  }

  // Delete expired notifications
  static async deleteExpiredNotifications(): Promise<number> {
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .not('expires_at', 'is', null);

    if (error) {
      logger.error('Error deleting expired notifications:', error);
      throw new Error('Failed to delete expired notifications');
    }

    const rows = data ?? [];
    return rows.length;
  }

  // Subscribe to real-time notifications
  static subscribeToNotifications(
    userId: string,
    callback: (notification: Notification) => void
  ) {
    // In test environments or if realtime is not available, no-op
    const anySb: any = supabase as any;
    if (!anySb?.channel) {
      return { unsubscribe: () => {} } as any;
    }
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();
  }

  // Unsubscribe from real-time notifications
  static unsubscribeFromNotifications(userId: string) {
    const anySb: any = supabase as any;
    if (!anySb?.channel) return;
    return supabase.channel(`notifications:${userId}`).unsubscribe();
  }
}