import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const type = searchParams.get('type');

  // Business creation polling state
  const [timedOut, setTimedOut] = useState(false);

  // Regular subscription state
  const [subscriptionDone, setSubscriptionDone] = useState(false);

  const stoppedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (type !== 'business') {
      // Regular subscription update: fire-and-forget, then show success
      const updateStatus = async () => {
        if (sessionId) {
          try {
            await supabase.functions.invoke('update-payment-status', {
              body: { session_id: sessionId },
            });
          } catch (err) {
            logger.error('Failed to update payment status:', err);
          }
        }
        setSubscriptionDone(true);
      };
      updateStatus();
      return;
    }

    // Business creation: poll business_members until the webhook has created the business.
    // The stripe-subscription-webhook edge function is responsible for creating the business —
    // this page is a waiting room only and must never create a business itself.
    stoppedRef.current = false;

    const startPolling = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || stoppedRef.current) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!profile?.id || stoppedRef.current) return;

      const profileId = profile.id;

      const poll = async () => {
        if (stoppedRef.current) return;
        try {
          const { data } = await supabase
            .from('business_members')
            .select('business_id')
            .eq('profile_id', profileId)
            .maybeSingle();

          if (data?.business_id) {
            stoppedRef.current = true;
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            navigate('/auth-redirect', { replace: true });
          }
        } catch (err) {
          logger.error('Error polling business_members:', err);
        }
      };

      // Poll immediately, then on each interval
      await poll();

      if (!stoppedRef.current) {
        intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
      }

      // Stop polling and show a friendly timeout message after 30 seconds
      timeoutRef.current = setTimeout(() => {
        if (!stoppedRef.current) {
          stoppedRef.current = true;
          if (intervalRef.current) clearInterval(intervalRef.current);
          setTimedOut(true);
        }
      }, POLL_TIMEOUT_MS);
    };

    startPolling();

    return () => {
      stoppedRef.current = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [sessionId, type, navigate]);

  const handleCloseWindow = () => {
    window.close();
    if (!window.closed) {
      navigate('/');
    }
  };

  // ── Business creation: timeout state ─────────────────────────────────────────
  if (type === 'business' && timedOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4">
              <AlertCircle className="h-16 w-16 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">Taking a moment longer…</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              This is taking longer than expected. If you completed payment, your account will be
              ready shortly — check your email or contact support.
            </p>
            <Button asChild className="w-full">
              <a href="mailto:support@caberu.com">Contact Support</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Business creation: waiting room ──────────────────────────────────────────
  if (type === 'business') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4">
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
            </div>
            <CardTitle className="text-2xl">Setting up your practice…</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This usually takes a few seconds. Please don't close this tab.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Regular subscription payment success ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4">
            {subscriptionDone ? (
              <CheckCircle className="h-16 w-16 text-green-500" />
            ) : (
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
            )}
          </div>
          <CardTitle className="text-2xl text-green-600">
            {subscriptionDone ? 'Payment Successful!' : 'Processing…'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {subscriptionDone
              ? 'Your payment has been processed successfully.'
              : 'Please wait a moment.'}
          </p>
          {sessionId && (
            <p className="text-sm text-muted-foreground">
              Transaction ID: {sessionId.slice(0, 20)}…
            </p>
          )}
          {subscriptionDone && (
            <Button onClick={handleCloseWindow} className="w-full">
              Close Window
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
