import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CurrentDentistState = {
  userId: string | null;
  profileId: string | null;
  dentistId: string | null;
  loading: boolean;
  error: string | null;
};

/**
 * Hook to get the current dentist context.
 * If businessId is provided, it will find the dentist associated with that business.
 * Otherwise, it returns the first active dentist for the user.
 */
export function useCurrentDentist(businessId?: string | null): CurrentDentistState {
  const [state, setState] = useState<CurrentDentistState>({
    userId: null,
    profileId: null,
    dentistId: null,
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? null;
      if (!userId) {
        setState({ userId: null, profileId: null, dentistId: null, loading: false, error: null });
        return;
      }

      const { data: profileRow, error: profileErr } = await supabase
        .from('secure_profiles_view')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      if (profileErr) throw profileErr;

      const profileId = profileRow?.id ?? null;
      if (!profileId) {
        setState({ userId, profileId: null, dentistId: null, loading: false, error: null });
        return;
      }

      // If businessId is provided, find dentist through business_members
      let dentistId: string | null = null;

      if (businessId) {
        // Find dentist for the specific business via business_members
        const { data: memberData, error: memberError } = await supabase
          .from('business_members')
          .select('profile_id')
          .eq('business_id', businessId)
          .eq('profile_id', profileId)
          .maybeSingle();

        if (memberError) throw memberError;

        if (memberData) {
          // User is a member of this business, get their dentist record
          const { data: dentistRow, error: dentistErr } = await supabase
            .from('dentists')
            .select('id')
            .eq('profile_id', profileId)
            .eq('is_active', true)
            .maybeSingle();
          if (dentistErr) throw dentistErr;
          dentistId = dentistRow?.id ?? null;
        }

        // Fallback: if membership record isn't available yet, still resolve the dentist
        // by profile so dentists don't get incorrectly blocked from security/settings pages.
        if (!dentistId) {
          const { data: dentistRow, error: dentistErr } = await supabase
            .from('dentists')
            .select('id')
            .eq('profile_id', profileId)
            .eq('is_active', true)
            .maybeSingle();
          if (dentistErr) throw dentistErr;
          dentistId = dentistRow?.id ?? null;
        }
      } else {
        // No business context, just get the first active dentist
        const { data: dentistRow, error: dentistErr } = await supabase
          .from('dentists')
          .select('id')
          .eq('profile_id', profileId)
          .eq('is_active', true)
          .maybeSingle();
        if (dentistErr) throw dentistErr;
        dentistId = dentistRow?.id ?? null;
      }

      setState({
        userId,
        profileId,
        dentistId,
        loading: false,
        error: null,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load dentist context';
      setState(prev => ({ ...prev, loading: false, error: message }));
    }
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  return state;
}
