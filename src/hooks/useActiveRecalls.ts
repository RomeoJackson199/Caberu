/**
 * Shared data fetching hook for patient recalls
 * Used in multiple patient views for recall notifications
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, parseISO } from 'date-fns';

interface Recall {
  id: string;
  patient_id: string;
  business_id: string;
  recall_type: string;
  due_date: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface RecallWithUrgency extends Recall {
  urgency: 'overdue' | 'due-soon' | 'upcoming';
  daysUntilDue: number;
}

/**
 * Fetch active recalls for a patient
 */
export function useActiveRecalls(patientId: string | null | undefined, businessId: string | null | undefined) {
  return useQuery({
    queryKey: ['active-recalls', patientId, businessId],
    queryFn: async (): Promise<RecallWithUrgency[]> => {
      if (!patientId) return [];
      
      let query = supabase
        .from('patient_recalls')
        .select('*')
        .eq('patient_id', patientId)
        .in('status', ['pending', 'scheduled']);
        
      if (businessId) {
        query = query.eq('business_id', businessId);
      }
      
      const { data, error } = await query.order('due_date');
        
      if (error) throw error;
      
      // Add urgency classification
      const today = new Date();
      return (data || []).map(recall => {
        const dueDate = parseISO(recall.due_date);
        const daysUntilDue = differenceInDays(dueDate, today);
        
        let urgency: 'overdue' | 'due-soon' | 'upcoming';
        if (daysUntilDue < 0) {
          urgency = 'overdue';
        } else if (daysUntilDue <= 14) {
          urgency = 'due-soon';
        } else {
          urgency = 'upcoming';
        }
        
        return {
          ...recall,
          urgency,
          daysUntilDue,
        };
      });
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get count of overdue and due-soon recalls
 */
export function useRecallCounts(patientId: string | null | undefined, businessId: string | null | undefined) {
  const { data: recalls, ...rest } = useActiveRecalls(patientId, businessId);
  
  const counts = {
    overdue: recalls?.filter(r => r.urgency === 'overdue').length || 0,
    dueSoon: recalls?.filter(r => r.urgency === 'due-soon').length || 0,
    upcoming: recalls?.filter(r => r.urgency === 'upcoming').length || 0,
    total: recalls?.length || 0,
  };
  
  return { counts, recalls, ...rest };
}

/**
 * Fetch all recalls for a business (dentist view)
 */
export function useBusinessRecalls(businessId: string | null | undefined, options?: {
  status?: string[];
  limit?: number;
}) {
  return useQuery({
    queryKey: ['business-recalls', businessId, options],
    queryFn: async () => {
      if (!businessId) return [];
      
      let query = supabase
        .from('patient_recalls')
        .select(`
          *,
          profiles:patient_id (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('business_id', businessId);
        
      if (options?.status) {
        query = query.in('status', options.status);
      }
      
      query = query.order('due_date');
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
    staleTime: 2 * 60 * 1000, // 2 minutes for dentist view
  });
}
