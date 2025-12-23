import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PatientAllergy {
  id: string;
  patient_id: string;
  business_id: string;
  allergy_name: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  notes?: string;
  created_at: string;
}

interface UsePatientAllergiesOptions {
  patientId?: string;
  businessId?: string;
}

export function usePatientAllergies({ patientId, businessId }: UsePatientAllergiesOptions) {
  const [allergies, setAllergies] = useState<PatientAllergy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchAllergies = useCallback(async () => {
    if (!patientId || !businessId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('patient_allergies')
        .select('*')
        .eq('patient_id', patientId)
        .eq('business_id', businessId)
        .order('severity', { ascending: false });

      if (error) throw error;
      setAllergies((data || []) as PatientAllergy[]);
    } catch (err: any) {
      console.error('Error fetching allergies:', err);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, businessId]);

  const addAllergy = async (allergy: Omit<PatientAllergy, 'id' | 'created_at'>) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('patient_allergies')
        .insert({
          ...allergy,
          created_by: user?.user?.id,
        });

      if (error) throw error;
      toast({ title: 'Allergy added' });
      fetchAllergies();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const updateAllergy = async (id: string, updates: Partial<PatientAllergy>) => {
    try {
      const { error } = await supabase
        .from('patient_allergies')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Allergy updated' });
      fetchAllergies();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const deleteAllergy = async (id: string) => {
    try {
      const { error } = await supabase
        .from('patient_allergies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Allergy removed' });
      fetchAllergies();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchAllergies();
  }, [fetchAllergies]);

  const hasSevereAllergies = allergies.some(a => a.severity === 'severe' || a.severity === 'life-threatening');

  return {
    allergies,
    isLoading,
    addAllergy,
    updateAllergy,
    deleteAllergy,
    refresh: fetchAllergies,
    hasSevereAllergies,
  };
}
