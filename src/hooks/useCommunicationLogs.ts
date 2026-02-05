import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CommunicationLog {
  id: string;
  patient_id: string;
  business_id: string;
  channel: 'email' | 'sms' | 'phone' | 'in-app';
  direction: 'outbound' | 'inbound';
  subject?: string;
  content?: string;
  status: string;
  sent_by?: string;
  created_at: string;
}

interface UseCommunicationLogsOptions {
  patientId?: string;
  businessId?: string;
  limit?: number;
}

export function useCommunicationLogs({ patientId, businessId, limit = 20 }: UseCommunicationLogsOptions) {
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchLogs = useCallback(async () => {
    if (!patientId || !businessId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('secure_communication_logs_view')
        .select('*')
        .eq('patient_id', patientId)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setLogs((data || []) as CommunicationLog[]);
    } catch {
      // Error handled silently
    } finally {
      setIsLoading(false);
    }
  }, [patientId, businessId, limit]);

  const addLog = async (log: Omit<CommunicationLog, 'id' | 'created_at'>) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('communication_logs')
        .insert({
          ...log,
          sent_by: user?.user?.id,
        });

      if (error) throw error;
      fetchLogs();
      
      // Update last contact on patient profile
      await supabase
        .from('profiles')
        .update({ last_contact_at: new Date().toISOString() })
        .eq('id', log.patient_id);
        
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to log communication';
      toast({ title: 'Error logging communication', description: message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    isLoading,
    addLog,
    refresh: fetchLogs,
  };
}
