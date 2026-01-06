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
    } catch {
      // Error handled silently - tags are not critical
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
      
      // Handle the joined data which returns an array for patient_tags
      const assignments = (data || []).map((d: { id: string; patient_id: string; tag_id: string; patient_tags: { id: string; name: string; color: string; description: string | null }[] | { id: string; name: string; color: string; description: string | null } | null }) => {
        // Handle both array and object responses from Supabase join
        const tagData = Array.isArray(d.patient_tags) ? d.patient_tags[0] : d.patient_tags;
        return {
          id: d.id,
          patient_id: d.patient_id,
          tag_id: d.tag_id,
          tag: tagData ? {
            id: tagData.id,
            business_id: '', // Not returned from join but not needed for display
            name: tagData.name,
            color: tagData.color,
            description: tagData.description || undefined,
          } as PatientTag : undefined,
        };
      });

      setPatientTags(assignments);
    } catch {
      // Error handled silently
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create tag';
      toast({ title: 'Error', description: message, variant: 'destructive' });
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
    } catch (err) {
      const pgError = err as { code?: string; message?: string };
      if (pgError.code === '23505') {
        toast({ title: 'Tag already assigned', variant: 'destructive' });
      } else {
        const message = err instanceof Error ? err.message : 'Failed to assign tag';
        toast({ title: 'Error', description: message, variant: 'destructive' });
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove tag';
      toast({ title: 'Error', description: message, variant: 'destructive' });
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete tag';
      toast({ title: 'Error', description: message, variant: 'destructive' });
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
