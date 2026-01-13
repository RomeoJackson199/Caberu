# Notification System Documentation

## Overview

Caberu includes a comprehensive notification system that supports:
- **In-app notifications** - Display notifications within the application
- **Web Push Notifications** - Browser notifications that work even when the app is closed
- **Email notifications** - Automated email delivery for important events
- **SMS notifications** - Text message delivery (Twilio integration)

## Features

### 1. In-App Notifications

- Real-time notification updates using Supabase real-time subscriptions
- Notification bell icon with unread count badge
- Dropdown notification center
- Categorized notifications (info, warning, success, error, urgent)
- Prioritized notification display
- Click-to-action navigation
- Mark as read functionality
- Notification preferences per user

### 2. Web Push Notifications

- Browser notifications that work offline
- Service Worker-based delivery
- Click-to-open and focus app
- Custom notification icons and badges
- Action buttons support
- VAPID key authentication

### 3. Email Notifications

- Template-based email system
- Rate limiting per business tier
- Appointment reminders
- Prescription notifications
- Treatment plan updates
- Emergency alerts

### 4. SMS Notifications

- Twilio integration for SMS delivery
- Appointment reminders
- Emergency notifications

## Setup Instructions

### 1. Database Setup

The notification tables are created automatically by the migration:
```bash
# Migration file: supabase/migrations/20250808000000_add_notifications_system.sql
# Push subscriptions: supabase/migrations/20260113150229_add_push_subscriptions.sql
```

Tables created:
- `notifications` - Stores all user notifications
- `notification_preferences` - User notification settings
- `notification_templates` - Reusable notification templates
- `push_subscriptions` - Web push subscription data

### 2. Configure VAPID Keys for Web Push

Generate VAPID keys for web push notifications:

```bash
# Using web-push CLI
npm install -g web-push
npx web-push generate-vapid-keys

# Or visit https://vapidkeys.com/
```

Add the public key to your `.env` file:
```env
VITE_VAPID_PUBLIC_KEY=your_public_key_here
```

Add the private key to your Supabase Edge Function secrets (NEVER in client code):
```bash
supabase secrets set VAPID_PRIVATE_KEY=your_private_key_here
```

### 3. Service Worker Registration

The service worker (`/public/sw.js`) is automatically registered on app load. It handles:
- Push notification events
- Notification click handling
- Background sync
- Offline caching

## Usage

### Creating Notifications (Backend)

Use the existing notification service and triggers:

```typescript
import { notificationService } from '@/lib/notificationService';

// Create a simple notification
await notificationService.createNotification(
  userId,
  'appointment',
  'Appointment Reminder',
  'Your appointment is tomorrow at 2 PM',
  {
    category: 'info',
    action_url: '/appointments/123',
    metadata: { appointmentId: '123' }
  }
);

// Create appointment reminder
await notificationService.createAppointmentReminder(
  appointmentId,
  '24h' // or '2h', '1h'
);

// Create prescription notification
await notificationService.createPrescriptionNotification(prescriptionId);

// Create treatment plan notification
await notificationService.createTreatmentPlanNotification(
  treatmentPlanId,
  'created' // or 'updated', 'completed'
);
```

### Using Notification Triggers

The system includes pre-built triggers for common events:

```typescript
import {
  onAppointmentConfirmed,
  onAppointmentCancelled,
  onPrescriptionCreated,
  onTreatmentPlanUpdated,
  onEmergencyTriageCompleted,
} from '@/lib/notificationTriggers';

// Automatically send notifications for events
onAppointmentConfirmed(appointmentId);
onPrescriptionCreated(prescriptionId);
onTreatmentPlanUpdated(treatmentPlanId, 'created');
```

### Displaying Notifications (Frontend)

Notifications are automatically displayed through:

1. **NotificationBell** - Icon with unread count in header
2. **SmartNotificationBanner** - Priority-based notification banners
3. **NotificationPermissionPrompt** - Request push notification permission

These components are already integrated in:
- DentistAppShell (dentist portal header)
- PatientAppShell (patient portal header)
- App.tsx (global notification displays)

### Using the Notification Hook

```typescript
import { useNotifications } from '@/hooks/useNotifications';

function MyComponent() {
  const {
    notifications,
    unreadCount,
    preferences,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    refreshNotifications
  } = useNotifications();

  return (
    <div>
      <p>Unread: {unreadCount}</p>
      {notifications.map(notification => (
        <div key={notification.id} onClick={() => markAsRead(notification.id)}>
          <h3>{notification.title}</h3>
          <p>{notification.message}</p>
        </div>
      ))}
    </div>
  );
}
```

### Managing Push Subscriptions

```typescript
import { pushNotificationService } from '@/lib/pushNotifications';

// Request permission and subscribe
const subscription = await pushNotificationService.subscribe();

// Check if already subscribed
const isSubscribed = await pushNotificationService.isSubscribed();

// Unsubscribe
await pushNotificationService.unsubscribe();

// Show a test notification
await pushNotificationService.showNotification(
  'Test Notification',
  {
    body: 'This is a test',
    icon: '/logo.png'
  }
);
```

## Notification Types

| Type | Description | Use Case |
|------|-------------|----------|
| `appointment` | Appointment-related notifications | Reminders, confirmations, cancellations |
| `prescription` | Prescription updates | New prescriptions, refills, expiring |
| `reminder` | General reminders | Follow-ups, tasks |
| `emergency` | Urgent medical alerts | Emergency triage results |
| `system` | System announcements | Maintenance, updates |
| `treatment_plan` | Treatment plan updates | Plan created, updated, completed |
| `follow_up` | Follow-up reminders | Post-treatment check-ins |

## Notification Categories

| Category | Color | Priority | Use Case |
|----------|-------|----------|----------|
| `info` | Blue | Normal | General information |
| `warning` | Yellow | High | Warnings, cautions |
| `success` | Green | Normal | Success messages |
| `error` | Red | High | Errors, failures |
| `urgent` | Red | Urgent | Critical alerts |

## User Preferences

Users can manage their notification preferences through the settings page:

- **Email notifications** - Enable/disable email delivery
- **SMS notifications** - Enable/disable SMS delivery
- **Push notifications** - Enable/disable browser push
- **In-app notifications** - Enable/disable in-app display
- **Notification types** - Toggle specific notification types
  - Appointment reminders
  - Prescription updates
  - Treatment plan updates
  - Emergency alerts
  - System notifications
- **Quiet hours** - Set do-not-disturb time range

## Sending Push Notifications (Backend)

To send push notifications from Edge Functions, you'll need to create a function that:

1. Retrieves push subscriptions for the target user
2. Sends push payload using web-push library
3. Handles failures and updates subscription status

Example Edge Function:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import * as webpush from 'npm:web-push@3.6.6';

// Configure VAPID keys
webpush.setVapidDetails(
  'mailto:support@caberu.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
);

serve(async (req) => {
  const { userId, title, message, url } = await req.json();

  // Get user's push subscriptions from database
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  // Send to all active subscriptions
  const promises = subscriptions.map(sub => {
    return webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh_key,
          auth: sub.auth_key
        }
      },
      JSON.stringify({
        title,
        message,
        url,
        icon: '/logo.png'
      })
    );
  });

  await Promise.allSettled(promises);

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

## Troubleshooting

### Notifications not appearing

1. Check if user has notification permissions enabled
2. Verify RLS policies allow the user to read notifications
3. Check browser console for errors
4. Ensure notification preferences are enabled

### Push notifications not working

1. Verify VAPID keys are configured correctly
2. Check if service worker is registered (`chrome://serviceworker-internals`)
3. Ensure push subscription is saved in database
4. Check if notification permission is granted
5. Test on HTTPS (push notifications require secure context)

### Email notifications not sending

1. Check email limits for business tier
2. Verify edge function has service role key
3. Check edge function logs for errors
4. Ensure notification preferences allow email

## Testing

### Test In-App Notifications

```typescript
// Create a test notification
await notificationService.createNotification(
  userId,
  'system',
  'Test Notification',
  'This is a test notification',
  { category: 'info' }
);
```

### Test Push Notifications

1. Enable push notifications through the prompt
2. Send a test notification through the browser console:

```javascript
// Send test message to service worker
navigator.serviceWorker.ready.then(registration => {
  registration.active.postMessage({ type: 'TEST_NOTIFICATION' });
});
```

### Test Email Notifications

Use the DentistNotificationSender component or call directly:

```typescript
await notificationService.sendEmailNotification(
  userId,
  'test@example.com',
  'Test Email',
  'This is a test email notification'
);
```

## Best Practices

1. **Respect user preferences** - Always check notification preferences before sending
2. **Use appropriate categories** - Use `urgent` sparingly for critical alerts only
3. **Provide action URLs** - Include action_url for notifications that require user action
4. **Set expiration dates** - Use expires_at for time-sensitive notifications
5. **Test thoroughly** - Test notifications across different devices and browsers
6. **Handle failures gracefully** - Log errors and provide fallback options
7. **Batch notifications** - Avoid sending too many notifications at once
8. **Clear and concise** - Keep notification messages short and actionable

## API Reference

### NotificationService Methods

- `getNotifications(userId, limit, offset)` - Fetch user notifications
- `getUnreadCount(userId)` - Get unread notification count
- `markAsRead(notificationId)` - Mark single notification as read
- `markAllAsRead()` - Mark all notifications as read
- `createNotification(...)` - Create new notification
- `sendEmailNotification(...)` - Send email notification
- `getNotificationPreferences(userId)` - Get user preferences
- `updateNotificationPreferences(userId, updates)` - Update preferences
- `subscribeToNotifications(userId, callback)` - Real-time subscription
- `deleteExpiredNotifications()` - Cleanup old notifications

### PushNotificationService Methods

- `isSupported()` - Check if push notifications are supported
- `getPermission()` - Get current permission status
- `requestPermission()` - Request notification permission
- `subscribe()` - Subscribe to push notifications
- `unsubscribe()` - Unsubscribe from push notifications
- `isSubscribed()` - Check if currently subscribed
- `showNotification(title, options)` - Show local notification

## Support

For issues or questions about the notification system:
1. Check this documentation
2. Review the notification service code: `src/lib/notificationService.ts`
3. Check notification triggers: `src/lib/notificationTriggers.ts`
4. Review edge functions: `supabase/functions/send-email-notification/`
5. Create an issue on GitHub

## Future Enhancements

Planned features for future versions:
- [ ] WhatsApp notifications
- [ ] Slack/Teams integration
- [ ] Notification analytics and tracking
- [ ] Rich notification templates
- [ ] Notification scheduling
- [ ] Digest emails (daily/weekly summaries)
- [ ] Multi-language notification templates
- [ ] Notification webhooks for external systems
