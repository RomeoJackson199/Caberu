import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  BusinessMetrics,
  UserWithBusinesses,
  SystemStats,
  SystemError,
  AuditLog,
  CreateBusinessRequest,
} from '@/types/super-admin';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

// Check if current user is super admin
export function useIsSuperAdmin() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Listen for auth state changes to get current user
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
      setAuthReady(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id ?? null);
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const query = useQuery({
    // Include userId in query key to prevent cache pollution between users
    queryKey: ['isSuperAdmin', userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data, error } = await supabase.rpc('is_super_admin');
      if (error) throw error;
      return data as boolean;
    },
    // Only run query when auth is ready and we have a user
    enabled: authReady && !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    // Refetch when user changes
    refetchOnMount: true,
  });

  // Return combined loading state that includes auth waiting
  // isLoading is true if:
  // 1. Auth is not ready yet, OR
  // 2. Auth is ready with a user, but query is still loading
  const isLoading = !authReady || (!!userId && query.isLoading);

  return {
    ...query,
    isLoading,
    // If not authenticated, return false (not undefined)
    data: authReady && !userId ? false : query.data,
  };
}

// Get all businesses with metrics
export function useAllBusinesses() {
  return useQuery({
    queryKey: ['allBusinesses'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_businesses_admin');
      if (error) throw error;
      return data as BusinessMetrics[];
    },
  });
}

// Get all users across businesses
export function useAllUsers(searchQuery?: string) {
  return useQuery({
    queryKey: ['allUsers', searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_users_admin', {
        search_query: searchQuery || null,
      });
      if (error) throw error;
      return data as UserWithBusinesses[];
    },
  });
}

// Get system statistics
export function useSystemStats() {
  return useQuery({
    queryKey: ['systemStats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_system_stats');
      if (error) throw error;
      return data as SystemStats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// Get system errors
export function useSystemErrors(resolved?: boolean) {
  return useQuery({
    queryKey: ['systemErrors', resolved],
    queryFn: async () => {
      let query = supabase
        .from('system_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (resolved !== undefined) {
        query = query.eq('resolved', resolved);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SystemError[];
    },
  });
}

// Get audit logs
export function useAuditLogs(limit = 50) {
  return useQuery({
    queryKey: ['auditLogs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('super_admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as AuditLog[];
    },
  });
}

// Log super admin action
export function useLogAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      action: string;
      resource_type?: string;
      resource_id?: string;
      details?: Record<string, unknown>;
    }) => {
      const { error } = await supabase.rpc('log_super_admin_action', {
        p_action: params.action,
        p_resource_type: params.resource_type || null,
        p_resource_id: params.resource_id || null,
        p_details: params.details || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });
}

// Create business on behalf of user
export function useCreateBusinessForUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (request: CreateBusinessRequest) => {
      // Call the edge function to create healthcare business
      const { data, error } = await supabase.functions.invoke(
        'create-healthcare-business',
        {
          body: {
            businessName: request.business_name,
            ownerEmail: request.owner_email,
            ownerFirstName: request.owner_first_name,
            ownerLastName: request.owner_last_name,
            businessType: request.business_type || 'dental',
            templateType: request.template_type || 'default',
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'Success',
        description: `Business created successfully for ${variables.owner_email}`,
      });

      logAction.mutate({
        action: 'CREATE_BUSINESS_FOR_USER',
        resource_type: 'business',
        resource_id: data?.business_id,
        details: {
          business_name: variables.business_name,
          owner_email: variables.owner_email,
        },
      });

      queryClient.invalidateQueries({ queryKey: ['allBusinesses'] });
      queryClient.invalidateQueries({ queryKey: ['systemStats'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create business',
        variant: 'destructive',
      });
    },
  });
}

// Resolve system error
export function useResolveError() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (errorId: string) => {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('system_errors')
        .update({
          resolved: true,
          resolved_by: userData?.user?.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', errorId);

      if (error) throw error;
    },
    onSuccess: (_, errorId) => {
      toast({
        title: 'Success',
        description: 'Error marked as resolved',
      });

      logAction.mutate({
        action: 'RESOLVE_ERROR',
        resource_type: 'system_error',
        resource_id: errorId,
      });

      queryClient.invalidateQueries({ queryKey: ['systemErrors'] });
      queryClient.invalidateQueries({ queryKey: ['systemStats'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to resolve error',
        variant: 'destructive',
      });
    },
  });
}

// Report system error (for use throughout the app)
export function useReportError() {
  return useMutation({
    mutationFn: async (params: {
      error_type: string;
      error_message: string;
      stack_trace?: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      metadata?: Record<string, unknown>;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: businessData } = await supabase
        .from('session_business')
        .select('business_id')
        .eq('user_id', userData?.user?.id || '')
        .single();

      const { error } = await supabase.from('system_errors').insert({
        error_type: params.error_type,
        error_message: params.error_message,
        stack_trace: params.stack_trace || null,
        severity: params.severity,
        user_id: userData?.user?.id || null,
        business_id: businessData?.business_id || null,
        url: window.location.href,
        user_agent: navigator.userAgent,
        metadata: params.metadata || null,
      });

      if (error) throw error;
    },
  });
}
