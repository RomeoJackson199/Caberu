-- Fix the audit_logs action check constraint to allow additional action types
-- The current constraint is too restrictive for PHI audit logging and push notifications

-- First drop the existing constraint
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;

-- Add a more flexible constraint that allows common action types
-- Including PHI operations and notification-related actions
ALTER TABLE public.audit_logs 
ADD CONSTRAINT audit_logs_action_check 
CHECK (action IN (
  'create', 'read', 'update', 'delete', 'export', 'login', 'logout',
  'INSERT', 'UPDATE', 'DELETE', 'SELECT',
  'phi_access', 'phi_update', 'phi_delete', 'phi_export',
  'notification_sent', 'push_notification', 'email_sent',
  'appointment_create', 'appointment_update', 'appointment_cancel',
  'payment_create', 'payment_update'
));