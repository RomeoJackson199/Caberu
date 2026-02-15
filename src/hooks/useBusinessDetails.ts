/**
 * Shared data fetching hook for business details
 * Replaces inline supabase fetch patterns across components
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Business {
  id: string;
  name: string;
  slug: string;
  owner_profile_id: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  address: string | null;
  phone: string | null;
  bio: string | null;
  tagline: string | null;
  welcome_message: string | null;
  business_hours: Record<string, any>;
  currency: string;
  email: string | null;
  website: string | null;
  specialty_type: string;
  template_type: string;
  subscription_plan: string | null;
  subscription_status: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch business details by ID
 */
export function useBusinessDetails(businessId: string | null | undefined) {
  return useQuery({
    queryKey: ['business-details', businessId],
    queryFn: async (): Promise<Business | null> => {
      if (!businessId) return null;
      
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .maybeSingle();
        
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
    staleTime: 10 * 60 * 1000, // 10 minutes - business details change rarely
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Fetch business by slug
 */
export function useBusinessBySlug(slug: string | null | undefined) {
  return useQuery({
    queryKey: ['business-by-slug', slug],
    queryFn: async (): Promise<Business | null> => {
      if (!slug) return null;
      
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
        
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Fetch business services
 */
export function useBusinessServices(businessId: string | null | undefined) {
  return useQuery({
    queryKey: ['business-services', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      
      const { data, error } = await supabase
        .from('business_services')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name');
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch business members
 */
export function useBusinessMembers(businessId: string | null | undefined) {
  return useQuery({
    queryKey: ['business-members', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      
      const { data, error } = await supabase
        .from('business_members')
        .select(`
          *,
          profiles:profile_id (
            id,
            first_name,
            last_name,
            email,
            profile_picture_url
          )
        `)
        .eq('business_id', businessId);
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get business display name with fallback
 */
export function getBusinessDisplayName(business: Business | null | undefined): string {
  return business?.name || 'Unknown Business';
}
