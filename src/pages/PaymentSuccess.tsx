import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const type = searchParams.get('type');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [planName, setPlanName] = useState('');
  const [billingCycle, setBillingCycle] = useState('');

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      if (type === 'business') {
        // Business creation: complete-business-subscription creates the business
        // from Stripe session metadata. Calling it twice is safe (idempotent).
        if (!sessionId) {
          setError('No session ID found. Please contact support.');
          return;
        }

        setProcessing(true);
        try {
          const { data, error: fnError } = await supabase.functions.invoke(
            'complete-business-subscription',
            { body: { sessionId } }
          );

          if (fnError) throw fnError;
          if (data?.error) throw new Error(data.error);

          // Show plan info returned from the edge function
          if (data.planName) setPlanName(data.planName);
          if (data.billingCycle) setBillingCycle(data.billingCycle);

          // Clean up any leftover onboarding state
          sessionStorage.removeItem('pending_business_data');
          sessionStorage.removeItem('pending_checkout_meta');
          localStorage.removeItem('tour_completed_dentist');
          localStorage.removeItem('dentist-tour-completed');

          // Flag the dashboard to auto-start the onboarding tour
          localStorage.setItem('should-start-tour', 'true');

          const businessSlug: string | undefined = data.businessSlug;
          const businessUrl = businessSlug
            ? `${window.location.origin}/${businessSlug}`
            : null;

          toast.success(
            businessUrl
              ? `Practice created! Your URL: ${businessUrl}`
              : 'Practice created successfully!'
          );

          if (businessUrl && navigator.clipboard) {
            navigator.clipboard.writeText(businessUrl).catch(() => {});
            setTimeout(() => {
              toast.success('URL copied to clipboard! Share it with your patients.');
            }, 500);
          }

          setDone(true);
          setProcessing(false);

          setTimeout(() => {
            navigate('/auth-redirect');
          }, 4000);
        } catch (err: unknown) {
          logger.error('Error setting up business after payment:', err);
          setProcessing(false);
          setError(
            err instanceof Error
              ? err.message
              : 'Something went wrong while setting up your practice.'
          );
        }
      } else {
        // Regular payment (non-business): update payment record
        if (sessionId) {
          try {
            const { error: fnError } = await supabase.functions.invoke(
              'update-payment-status',
              { body: { session_id: sessionId } }
            );

            if (fnError) {
              logger.error('Error updating payment status:', fnError);
            }
          } catch (err) {
            logger.error('Failed to update payment status:', err);
          }
        }
      }
    };

    handlePaymentSuccess();
  }, [sessionId, type, navigate]);

  const handleCloseWindow = () => {
    window.close();
    if (!window.closed) {
      navigate('/');
    }
  };

  // ── Error state ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4">
              <AlertCircle className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-destructive">
              Setup Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {error}
            </p>
            <p className="text-sm text-muted-foreground">
              Your payment was received. If the issue persists, our team can
              complete the setup for you.
            </p>
            <Button asChild className="w-full">
              <a href="mailto:support@caberu.com">Contact Support</a>
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/')}
            >
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Success / processing state ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4">
            {processing ? (
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
            ) : (
              <CheckCircle className="h-16 w-16 text-green-500" />
            )}
          </div>
          <CardTitle className="text-2xl text-green-600">
            {processing
              ? 'Setting up your practice…'
              : done
              ? 'Practice Created!'
              : 'Payment Successful!'}
          </CardTitle>
          {planName && (
            <div className="flex justify-center gap-2 mt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                {planName}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm font-medium capitalize">
                {billingCycle}
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {processing ? (
            <p className="text-muted-foreground">
              Please wait while we create your business account…
            </p>
          ) : (
            <>
              <p className="text-muted-foreground">
                Your payment has been processed successfully.
                {type === 'business' && done && ' Your practice is now active!'}
              </p>

              {sessionId && (
                <p className="text-sm text-muted-foreground">
                  Transaction ID: {sessionId.slice(0, 20)}…
                </p>
              )}

              {type !== 'business' && (
                <Button onClick={handleCloseWindow} className="w-full">
                  Close Window
                </Button>
              )}

              {type === 'business' && done && (
                <p className="text-sm text-muted-foreground">
                  Redirecting you to your dashboard…
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
