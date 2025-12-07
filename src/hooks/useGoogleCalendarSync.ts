import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

export function useGoogleCalendarSync() {
  const { toast } = useToast();

  const syncAppointmentToGoogleCalendar = async (
    appointmentId: string,
    action: 'create' | 'update' | 'delete'
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-create-event', {
        body: { appointmentId, action }
      });

      if (error) {
        logger.error('Failed to sync to Google Calendar:', error);
        return { success: false };
      }

      if (data?.success) {
        logger.info(`Successfully ${action}d appointment in Google Calendar`);
        return { success: true };
      }

      return { success: false };
    } catch (error) {
      logger.error('Error syncing to Google Calendar:', error);
      return { success: false };
    }
  };

  return { syncAppointmentToGoogleCalendar };
}
