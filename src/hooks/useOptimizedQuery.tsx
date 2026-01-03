import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface QueryOptions {
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
  cacheTime?: number;
}

interface QueryResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<void>;
  isStale: boolean;
}

// Simple cache implementation with max size limit
const MAX_CACHE_SIZE = 100;
const queryCache = new Map<string, {
  data: any;
  timestamp: number;
  staleTime: number;
  cacheTime: number;
}>();

// Cleanup expired cache entries
let cleanupInterval: NodeJS.Timeout | null = null;

const startCacheCleanup = () => {
  if (cleanupInterval) return; // Already running

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of queryCache.entries()) {
      if (now - entry.timestamp > entry.cacheTime) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => queryCache.delete(key));

    // Enforce max cache size by removing oldest entries
    if (queryCache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(queryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, queryCache.size - MAX_CACHE_SIZE);
      toRemove.forEach(([key]) => queryCache.delete(key));
    }

    if (queryCache.size === 0 && cleanupInterval) {
      // Stop interval if cache is empty to save resources
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
  }, 5 * 60 * 1000); // Clean every 5 minutes
};

// Cleanup function for manual cleanup (e.g., on app unmount)
export const cleanupQueryCache = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  queryCache.clear();
};

// Start cleanup on module load
if (typeof window !== 'undefined') {
  startCacheCleanup();

  // Clean up on page unload
  window.addEventListener('beforeunload', cleanupQueryCache);
}

export function useOptimizedQuery<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  options: QueryOptions = {}
): QueryResult<T> {
  const {
    enabled = true,
    refetchInterval,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000 // 10 minutes
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStale, setIsStale] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const executeQuery = useCallback(async (useCache = true) => {
    if (!enabled) return;

    // Check cache first
    if (useCache) {
      const cached = queryCache.get(queryKey);
      if (cached && Date.now() - cached.timestamp < cached.staleTime) {
        setData(cached.data);
        setIsStale(false);
        return;
      }
      if (cached && Date.now() - cached.timestamp < cached.cacheTime) {
        setData(cached.data);
        setIsStale(true);
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      const result = await queryFn();
      
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      setData(result);
      setError(null);
      setIsStale(false);

      // Update cache
      queryCache.set(queryKey, {
        data: result,
        timestamp: Date.now(),
        staleTime,
        cacheTime
      });

      // Ensure cleanup is running when cache has entries
      startCacheCleanup();
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      
      const error = err instanceof Error ? err : new Error('Query failed');
      setError(error);
      logger.error(`Query failed for key: ${queryKey}`, error);
    } finally {
      setIsLoading(false);
    }
  }, [queryKey, queryFn, enabled, staleTime, cacheTime]);

  const refetch = useCallback(async () => {
    await executeQuery(false);
  }, [executeQuery]);

  useEffect(() => {
    executeQuery();
  }, [executeQuery]);

  useEffect(() => {
    if (refetchInterval && enabled) {
      intervalRef.current = setInterval(() => {
        executeQuery();
      }, refetchInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refetchInterval, enabled, executeQuery]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    error,
    isLoading,
    isError: !!error,
    refetch,
    isStale
  };
}

// Specialized hooks for common queries
export function useOptimizedUserProfile(userId: string) {
  return useOptimizedQuery(
    `user-profile-${userId}`,
    async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, email, phone, date_of_birth, role, created_at, updated_at')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    {
      staleTime: 15 * 60 * 1000,  // 15 minutes - profiles change less frequently
      cacheTime: 30 * 60 * 1000   // 30 minutes - keep in cache longer
    }
  );
}

export function useOptimizedAppointments(patientId: string) {
  return useOptimizedQuery(
    `appointments-${patientId}`,
    async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          patient_id,
          dentist_id,
          appointment_date,
          reason,
          notes,
          status,
          urgency,
          duration_minutes,
          created_at,
          dentist:dentist_id(
            specialization,
            profile:profile_id(first_name, last_name)
          )
        `)
        .eq('patient_id', patientId)
        .order('appointment_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    { staleTime: 2 * 60 * 1000 } // Appointments change more frequently
  );
}