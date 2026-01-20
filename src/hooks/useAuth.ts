/**
 * Consolidated Auth Hook
 * Single source of truth for authentication state
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
}

interface ProfileData {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string | null;
}

interface UseAuthResult extends AuthState {
  profile: ProfileData | null;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  checkSession: () => Promise<Session | null>;
}

// Singleton to prevent multiple auth listeners across components
let globalAuthListener: ReturnType<typeof supabase.auth.onAuthStateChange> | null = null;
let listenerCount = 0;
const authStateCallbacks = new Set<(event: AuthChangeEvent, session: Session | null) => void>();

/**
 * Consolidated auth hook - manages all auth state in one place
 * Prevents scattered auth listeners across components
 */
export function useAuth(): UseAuthResult {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const mounted = useRef(true);
  const profileFetchedFor = useRef<string | null>(null);

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    // Skip if already fetched for this user
    if (profileFetchedFor.current === userId) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, email, role')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (mounted.current && data) {
        setProfile(data as ProfileData);
        profileFetchedFor.current = userId;
      }
    } catch (err) {
      logger.error('Error fetching profile:', err);
    }
  }, []);

  // Handle auth state changes
  const handleAuthChange = useCallback(
    async (event: AuthChangeEvent, session: Session | null) => {
      if (!mounted.current) return;

      const user = session?.user ?? null;
      
      setState({
        user,
        session,
        isLoading: false,
        isAuthenticated: !!user,
        error: null,
      });

      if (user) {
        fetchProfile(user.id);
      } else {
        setProfile(null);
        profileFetchedFor.current = null;
      }

      // Log auth events for debugging
      if (event === 'SIGNED_IN') {
        logger.info('User signed in');
      } else if (event === 'SIGNED_OUT') {
        logger.info('User signed out');
      } else if (event === 'TOKEN_REFRESHED') {
        logger.debug('Token refreshed');
      }
    },
    [fetchProfile]
  );

  // Initialize auth state
  useEffect(() => {
    mounted.current = true;

    // Register callback for global listener
    authStateCallbacks.add(handleAuthChange);
    listenerCount++;

    // Set up global listener if not already set
    if (!globalAuthListener) {
      globalAuthListener = supabase.auth.onAuthStateChange((event, session) => {
        authStateCallbacks.forEach((callback) => callback(event, session));
      });
    }

    // Check initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        logger.error('Error getting session:', error);
        if (mounted.current) {
          setState((prev) => ({ ...prev, isLoading: false, error }));
        }
        return;
      }
      
      handleAuthChange('INITIAL_SESSION' as AuthChangeEvent, session);
    });

    return () => {
      mounted.current = false;
      authStateCallbacks.delete(handleAuthChange);
      listenerCount--;

      // Clean up global listener when no components are using it
      if (listenerCount === 0 && globalAuthListener) {
        globalAuthListener.data.subscription.unsubscribe();
        globalAuthListener = null;
      }
    };
  }, [handleAuthChange]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      logger.error('Error signing out:', err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err : new Error('Sign out failed'),
      }));
    }
  }, []);

  // Refresh session manually
  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      if (mounted.current && data.session) {
        handleAuthChange('TOKEN_REFRESHED', data.session);
      }
    } catch (err) {
      logger.error('Error refreshing session:', err);
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err : new Error('Session refresh failed'),
      }));
    }
  }, [handleAuthChange]);

  // Check current session
  const checkSession = useCallback(async (): Promise<Session | null> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (err) {
      logger.error('Error checking session:', err);
      return null;
    }
  }, []);

  return {
    ...state,
    profile,
    signOut,
    refreshSession,
    checkSession,
  };
}

/**
 * Hook to check if user has specific role
 */
export function useHasRole(role: string): boolean {
  const { profile } = useAuth();
  return profile?.role === role;
}

/**
 * Hook for auth-protected operations
 */
export function useRequireAuth(): UseAuthResult & { requireAuth: <T>(fn: () => Promise<T>) => Promise<T | null> } {
  const auth = useAuth();
  
  const requireAuth = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | null> => {
      if (!auth.isAuthenticated) {
        logger.warn('Operation requires authentication');
        return null;
      }
      return fn();
    },
    [auth.isAuthenticated]
  );

  return { ...auth, requireAuth };
}
