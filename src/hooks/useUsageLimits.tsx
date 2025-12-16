import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessContext } from "./useBusinessContext";

export const useUsageLimits = () => {
  const { businessId } = useBusinessContext();

  const { data: customerLimit, refetch: refetchCustomerLimit } = useQuery({
    queryKey: ['usage-limit', 'customer', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      
      const { data, error } = await supabase.rpc('check_business_usage_limit', {
        p_business_id: businessId,
        p_limit_type: 'customer',
      });

      if (error) throw error;
      return data as { allowed: boolean; reason?: string; current: number; limit: number };
    },
    enabled: !!businessId,
  });

  const { data: emailLimit, refetch: refetchEmailLimit } = useQuery({
    queryKey: ['usage-limit', 'email', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      
      const { data, error } = await supabase.rpc('check_business_usage_limit', {
        p_business_id: businessId,
        p_limit_type: 'email',
      });

      if (error) throw error;
      return data as { allowed: boolean; reason?: string; current: number; limit: number | null };
    },
    enabled: !!businessId,
  });

  const { data: phoneLimit, refetch: refetchPhoneLimit } = useQuery({
    queryKey: ['usage-limit', 'phone', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      
      const { data, error } = await supabase.rpc('check_phone_minutes_available', {
        p_business_id: businessId,
      });

      if (error) throw error;
      const result = data?.[0];
      if (!result) return null;
      
      return {
        allowed: result.can_make_call,
        current: Math.floor(result.used_seconds / 60),
        limit: Math.floor(result.daily_limit_seconds / 60),
        remaining: Math.floor(result.remaining_seconds / 60),
        planTier: result.plan_tier,
      };
    },
    enabled: !!businessId,
  });

  const checkCustomerLimit = () => {
    if (!customerLimit) return { allowed: true };
    return customerLimit;
  };

  const checkEmailLimit = () => {
    if (!emailLimit) return { allowed: true };
    return emailLimit;
  };

  const checkPhoneLimit = () => {
    if (!phoneLimit) return { allowed: true, current: 0, limit: 5, remaining: 5 };
    return phoneLimit;
  };

  return {
    customerLimit: checkCustomerLimit(),
    emailLimit: checkEmailLimit(),
    phoneLimit: checkPhoneLimit(),
    refetchCustomerLimit,
    refetchEmailLimit,
    refetchPhoneLimit,
  };
};
