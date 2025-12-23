import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PatientTag {
  id: string;
  business_id: string;
  name: string;
  color: string;
  description?: string;
}

export interface PatientTagAssignment {
  id: string;
  patient_id: string;
  tag_id: string;
  tag?: PatientTag;
}

interface UsePatientTagsOptions {
  businessId?: string;
  patientId?: string;
}

export function usePatientTags({ businessId, patientId }: UsePatientTagsOptions) {
  const [tags, setTags] = useState<PatientTag[]>([]);
  const [patientTags, setPatientTags] = useState<PatientTagAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch all available tags for business
  const fetchTags = useCallback(async () => {
    if (!businessId) return;
    
    try {
      const { data, error } = await supabase
        .from('patient_tags')
        .select('*')
        .eq('business_id', businessId)
        .order('name');

      if (error) throw error;
      setTags((data || []) as PatientTag[]);
    } catch (err: any) {
      console.error('Error fetching tags:', err);
    }
  }, [businessId]);

  // Fetch tags assigned to a specific patient
  const fetchPatientTags = useCallback(async () => {
    if (!patientId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('patient_tag_assignments')
        .select(`
          id,
          patient_id,
          tag_id,
          patient_tags (id, name, color, description)
        `)
        .eq('patient_id', patientId);

      if (error) throw error;
      
      const assignments = (data || []).map((d: any) => ({
        id: d.id,
        patient_id: d.patient_id,
        tag_id: d.tag_id,
        tag: d.patient_tags,
      }));
      
      setPatientTags(assignments);
    } catch (err: any) {
      console.error('Error fetching patient tags:', err);
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  // Create a new tag for the business
  const createTag = async (tag: Omit<PatientTag, 'id'>) => {
    try {
      const { error } = await supabase
        .from('patient_tags')
        .insert(tag);

      if (error) throw error;
      toast({ title: 'Tag created' });
      fetchTags();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Assign a tag to a patient
  const assignTag = async (tagId: string) => {
    if (!patientId) return;
    
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('patient_tag_assignments')
        .insert({
          patient_id: patientId,
          tag_id: tagId,
          assigned_by: user?.user?.id,
        });

      if (error) throw error;
      toast({ title: 'Tag assigned' });
      fetchPatientTags();
    } catch (err: any) {
      if (err.code === '23505') {
        toast({ title: 'Tag already assigned', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    }
  };

  // Remove a tag from a patient
  const unassignTag = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('patient_tag_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
      toast({ title: 'Tag removed' });
      fetchPatientTags();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Delete a tag from the business
  const deleteTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('patient_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;
      toast({ title: 'Tag deleted' });
      fetchTags();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    fetchPatientTags();
  }, [fetchPatientTags]);

  return {
    tags,
    patientTags,
    isLoading,
    createTag,
    assignTag,
    unassignTag,
    deleteTag,
    refresh: () => {
      fetchTags();
      fetchPatientTags();
    },
  };
}
