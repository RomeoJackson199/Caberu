import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

const SESSION_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const WARNING_BEFORE_TIMEOUT_MS = 60 * 60 * 1000; // Warn 1 hour before

export function SessionTimeoutWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isExtending, setIsExtending] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Only set up warning timers if user is authenticated
    if (!isAuthenticated) {
      return;
    }

    let warningTimeout: ReturnType<typeof setTimeout>;
    let countdownInterval: ReturnType<typeof setInterval>;

    const setupWarning = () => {
      // Clear any existing timers
      if (warningTimeout) clearTimeout(warningTimeout);
      if (countdownInterval) clearInterval(countdownInterval);
      setShowWarning(false);

      // Set warning to show 2 minutes before timeout
      warningTimeout = setTimeout(() => {
        setShowWarning(true);
        setTimeRemaining(WARNING_BEFORE_TIMEOUT_MS);

        // Start countdown
        countdownInterval = setInterval(() => {
          setTimeRemaining(prev => {
            const newTime = prev - 1000;
            if (newTime <= 0) {
              clearInterval(countdownInterval);
              return 0;
            }
            return newTime;
          });
        }, 1000);
      }, SESSION_TIMEOUT_MS - WARNING_BEFORE_TIMEOUT_MS);
    };

    const resetWarning = () => {
      setupWarning();
    };

    // Setup initial warning
    setupWarning();

    // Listen for user activity to reset warning
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      document.addEventListener(event, resetWarning, { passive: true });
    });

    return () => {
      if (warningTimeout) clearTimeout(warningTimeout);
      if (countdownInterval) clearInterval(countdownInterval);
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetWarning);
      });
    };
  }, [isAuthenticated]);

  const handleExtendSession = async () => {
    setIsExtending(true);
    try {
      // Refresh the session by making a simple query
      await supabase.auth.getSession();

      // Reset the warning
      setShowWarning(false);
      setTimeRemaining(0);
    } catch (error) {
      logger.error('Failed to extend session:', error);
    } finally {
      setIsExtending(false);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {showWarning && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
        >
          <Alert className="bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-semibold text-amber-900 dark:text-amber-100">
                    Session Expiring Soon
                  </span>
                </div>
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  Your session will expire in{' '}
                  <span className="font-bold">{formatTime(timeRemaining)}</span>.
                  {' '}Click below to stay signed in.
                </AlertDescription>
                <Button
                  onClick={handleExtendSession}
                  disabled={isExtending}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  size="sm"
                >
                  {isExtending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Extending...
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Extend Session
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
