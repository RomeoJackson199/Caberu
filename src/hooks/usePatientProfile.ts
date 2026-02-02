/**
 * Shared data fetching hook for patient profiles
 * Replaces inline supabase fetch patterns across components
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PatientProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  profile_picture_url: string | null;
  preferred_language: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch patient profile by user_id
 */
export function usePatientProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['patient-profile', userId],
    queryFn: async (): Promise<PatientProfile | null> => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

/**
 * Fetch patient profile by profile_id
 */
export function usePatientProfileById(profileId: string | null | undefined) {
  return useQuery({
    queryKey: ['patient-profile-by-id', profileId],
    queryFn: async (): Promise<PatientProfile | null> => {
      if (!profileId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();
        
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Get formatted patient name
 */
export function getPatientDisplayName(profile: PatientProfile | null | undefined): string {
  if (!profile) return 'Unknown';
  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  return fullName || profile.email || 'Unknown';
}

/**
 * Get patient initials
 */
export function getPatientInitials(profile: PatientProfile | null | undefined): string {
  if (!profile) return '?';
  const first = profile.first_name?.[0]?.toUpperCase() || '';
  const last = profile.last_name?.[0]?.toUpperCase() || '';
  return (first + last) || profile.email?.[0]?.toUpperCase() || '?';
}
