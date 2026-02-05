import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { logger } from '@/lib/logger';
interface ClinicBranding {
  logoUrl: string | null;
  clinicName: string | null;
  tagline: string | null;
  primaryColor: string;
  secondaryColor: string;
}

interface UseClinicBrandingOptions {
  disableBrandingFetch?: boolean;
}

export function useClinicBranding(options: UseClinicBrandingOptions = {}) {
  const [branding, setBranding] = useState<ClinicBranding>({
    logoUrl: null,
    clinicName: null,
    tagline: null,
    primaryColor: "#0F3D91",
    secondaryColor: "#66D2D6",
  });
  const [loading, setLoading] = useState(true);
  const { businessId } = useBusinessContext();
  const [resolvedBusinessId, setResolvedBusinessId] = useState<string | null>(null);
  const { disableBrandingFetch = false } = options;

  useEffect(() => {
    if (disableBrandingFetch) {
      setLoading(false);
      return;
    }

    const loadBranding = async () => {
      try {
        let targetBusinessId = businessId as string | null | undefined;

        if (!targetBusinessId) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // First, try session_business for current business context
            const { data: session } = await supabase
              .from('session_business')
              .select('business_id')
              .eq('user_id', user.id)
              .order('updated_at', { ascending: false })
              .maybeSingle();

            targetBusinessId = session?.business_id || null;

            // If still not found, fall back to most recent appointment's business
            if (!targetBusinessId) {
              const { data: profile } = await supabase
                .from('secure_profiles_view')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

              if (profile?.id) {
                const { data: appt } = await supabase
                  .from('secure_appointments_view')
                  .select('business_id, appointment_date, created_at')
                  .eq('patient_id', profile.id)
                  .order('appointment_date', { ascending: false })
                  .order('created_at', { ascending: false })
                  .maybeSingle();

                targetBusinessId = appt?.business_id || null;
              }
            }
          }
        }

        if (!targetBusinessId) {
          logger.warn('useClinicBranding: No business context found for branding');
          setLoading(false);
          return;
        }

        setResolvedBusinessId(targetBusinessId as string);

        const { data, error } = await supabase
          .from('businesses')
          .select('logo_url, name, tagline, primary_color, secondary_color')
          .eq('id', targetBusinessId)
          .single();

        if (error) throw error;

        if (data) {
          setBranding({
            logoUrl: data.logo_url,
            clinicName: data.name,
            tagline: data.tagline,
            primaryColor: data.primary_color || "#0F3D91",
            secondaryColor: data.secondary_color || "#66D2D6",
          });
        }
      } catch (error) {
        logger.error('Error loading branding:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBranding();

    const activeBusinessId = businessId || resolvedBusinessId;

    const channel = activeBusinessId
      ? supabase
          .channel(`businesses_changes_${activeBusinessId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'businesses',
              filter: `id=eq.${activeBusinessId}`,
            },
            (payload) => {
              if (payload.new) {
                const newData = payload.new as any;
                setBranding({
                  logoUrl: newData.logo_url,
                  clinicName: newData.name,
                  tagline: newData.tagline,
                  primaryColor: newData.primary_color || "#0F3D91",
                  secondaryColor: newData.secondary_color || "#66D2D6",
                });
              }
            }
          )
          .subscribe()
      : null;

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [businessId, resolvedBusinessId, disableBrandingFetch]);

  return { branding, loading };
}
