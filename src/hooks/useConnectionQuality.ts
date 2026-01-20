/**
 * Connection Quality Hook
 * Monitors network status and provides reconnection logic
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'slow';

interface ConnectionQuality {
  status: ConnectionStatus;
  isOnline: boolean;
  latency: number | null;
  lastConnected: Date | null;
  reconnectAttempts: number;
}

interface UseConnectionQualityResult extends ConnectionQuality {
  checkConnection: () => Promise<boolean>;
  forceReconnect: () => void;
}

const PING_INTERVAL = 30000; // 30 seconds
const SLOW_THRESHOLD = 1000; // 1 second is considered slow
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 1000;

/**
 * Hook for monitoring connection quality and network status
 */
export function useConnectionQuality(): UseConnectionQualityResult {
  const [quality, setQuality] = useState<ConnectionQuality>({
    status: navigator.onLine ? 'connecting' : 'disconnected',
    isOnline: navigator.onLine,
    latency: null,
    lastConnected: null,
    reconnectAttempts: 0,
  });

  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mounted = useRef(true);

  // Measure connection latency
  const measureLatency = useCallback(async (): Promise<number | null> => {
    try {
      const start = performance.now();
      
      // Use a lightweight health check - just ping the Supabase REST API
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });
      
      if (!response.ok) return null;
      
      const latency = performance.now() - start;
      return Math.round(latency);
    } catch {
      return null;
    }
  }, []);

  // Check connection status
  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      if (mounted.current) {
        setQuality((prev) => ({
          ...prev,
          status: 'disconnected',
          isOnline: false,
        }));
      }
      return false;
    }

    const latency = await measureLatency();
    
    if (!mounted.current) return false;

    if (latency === null) {
      setQuality((prev) => ({
        ...prev,
        status: 'disconnected',
        latency: null,
      }));
      return false;
    }

    const status: ConnectionStatus = latency > SLOW_THRESHOLD ? 'slow' : 'connected';
    
    setQuality((prev) => ({
      ...prev,
      status,
      isOnline: true,
      latency,
      lastConnected: new Date(),
      reconnectAttempts: 0,
    }));

    return true;
  }, [measureLatency]);

  // Exponential backoff reconnection
  const attemptReconnect = useCallback(async () => {
    if (!mounted.current) return;

    setQuality((prev) => {
      if (prev.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        logger.warn('Max reconnection attempts reached');
        return prev;
      }

      const newAttempts = prev.reconnectAttempts + 1;
      const delay = RECONNECT_BASE_DELAY * Math.pow(2, newAttempts - 1);

      // Schedule next reconnect attempt
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      reconnectTimeoutRef.current = setTimeout(async () => {
        const connected = await checkConnection();
        if (!connected && mounted.current) {
          attemptReconnect();
        }
      }, delay);

      return {
        ...prev,
        status: 'connecting',
        reconnectAttempts: newAttempts,
      };
    });
  }, [checkConnection]);

  // Force reconnection
  const forceReconnect = useCallback(() => {
    setQuality((prev) => ({
      ...prev,
      status: 'connecting',
      reconnectAttempts: 0,
    }));
    checkConnection();
  }, [checkConnection]);

  // Set up listeners and polling
  useEffect(() => {
    mounted.current = true;

    // Initial connection check
    checkConnection();

    // Online/offline event listeners
    const handleOnline = () => {
      logger.info('Network online');
      setQuality((prev) => ({ ...prev, isOnline: true, status: 'connecting' }));
      checkConnection();
    };

    const handleOffline = () => {
      logger.info('Network offline');
      setQuality((prev) => ({
        ...prev,
        isOnline: false,
        status: 'disconnected',
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic ping for connection health
    pingIntervalRef.current = setInterval(() => {
      if (navigator.onLine) {
        checkConnection();
      }
    }, PING_INTERVAL);

    // Subscribe to Supabase realtime status
    const channel = supabase
      .channel('connection-status')
      .subscribe((status) => {
        if (!mounted.current) return;
        
        if (status === 'SUBSCRIBED') {
          setQuality((prev) => ({
            ...prev,
            status: 'connected',
            lastConnected: new Date(),
          }));
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          setQuality((prev) => ({
            ...prev,
            status: 'disconnected',
          }));
          attemptReconnect();
        }
      });

    return () => {
      mounted.current = false;
      
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      channel.unsubscribe();
    };
  }, [checkConnection, attemptReconnect]);

  return {
    ...quality,
    checkConnection,
    forceReconnect,
  };
}

/**
 * Hook for queueing mutations when offline
 */
interface QueuedMutation {
  id: string;
  type: string;
  data: unknown;
  timestamp: number;
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedMutation[]>([]);
  const { isOnline } = useConnectionQuality();

  // Add mutation to queue
  const queueMutation = useCallback((type: string, data: unknown) => {
    const mutation: QueuedMutation = {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: Date.now(),
    };
    
    setQueue((prev) => [...prev, mutation]);
    
    // Persist to localStorage
    try {
      const stored = localStorage.getItem('offline_mutation_queue');
      const existing: QueuedMutation[] = stored ? JSON.parse(stored) : [];
      localStorage.setItem('offline_mutation_queue', JSON.stringify([...existing, mutation]));
    } catch (err) {
      logger.error('Failed to persist offline mutation:', err);
    }
    
    return mutation.id;
  }, []);

  // Process queue when online
  const processQueue = useCallback(async (processor: (mutation: QueuedMutation) => Promise<boolean>) => {
    const toProcess = [...queue];
    const processed: string[] = [];
    
    for (const mutation of toProcess) {
      try {
        const success = await processor(mutation);
        if (success) {
          processed.push(mutation.id);
        }
      } catch (err) {
        logger.error('Failed to process queued mutation:', err);
      }
    }
    
    // Remove processed mutations
    setQueue((prev) => prev.filter((m) => !processed.includes(m.id)));
    
    // Update localStorage
    try {
      const remaining = queue.filter((m) => !processed.includes(m.id));
      localStorage.setItem('offline_mutation_queue', JSON.stringify(remaining));
    } catch (err) {
      logger.error('Failed to update offline queue:', err);
    }
  }, [queue]);

  // Load queue from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('offline_mutation_queue');
      if (stored) {
        setQueue(JSON.parse(stored));
      }
    } catch (err) {
      logger.error('Failed to load offline queue:', err);
    }
  }, []);

  return {
    queue,
    queueMutation,
    processQueue,
    hasPendingMutations: queue.length > 0,
    isOnline,
  };
}
