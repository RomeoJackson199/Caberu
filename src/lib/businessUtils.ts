import { supabase } from '@/integrations/supabase/client';

/**
 * Get the current business ID from the context
 * Throws an error if no business is selected
 */
export async function getCurrentBusinessId(): Promise<string> {
  // Try to get from session_business table
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('session_business')
    .select('business_id')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.business_id) {
    throw new Error('No business context set. Please select a business.');
  }

  return data.business_id;
}

/**
 * Safely get business ID, returns null if not set
 */
export async function getBusinessIdOrNull(): Promise<string | null> {
  try {
    return await getCurrentBusinessId();
  } catch {
    return null;
  }
}

/**
 * Check if user is a member of a specific business
 */
export async function isBusinessMember(businessId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('secure_profiles_view')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) return false;

  const { data } = await supabase
    .from('business_members')
    .select('id')
    .eq('profile_id', profile.id)
    .eq('business_id', businessId)
    .single();

  return !!data;
}

/**
 * Get user's role in a specific business
 */
export async function getBusinessRole(businessId: string): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('secure_profiles_view')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) return null;

  const { data } = await supabase
    .from('business_members')
    .select('role')
    .eq('profile_id', profile.id)
    .eq('business_id', businessId)
    .single();

  return data?.role || null;
}

/**
 * Check if user has specific role in current business
 */
export async function hasBusinessRole(role: string | string[]): Promise<boolean> {
  const businessId = await getBusinessIdOrNull();
  if (!businessId) return false;

  const userRole = await getBusinessRole(businessId);
  if (!userRole) return false;

  if (Array.isArray(role)) {
    return role.includes(userRole);
  }
  return userRole === role;
}
