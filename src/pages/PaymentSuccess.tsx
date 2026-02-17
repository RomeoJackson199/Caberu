import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const type = searchParams.get('type');
  const isPromo = searchParams.get('promo') === 'true';
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      if (type === 'business') {
        // Handle business creation after payment (or with promo code)
        setProcessing(true);
        try {
          const pendingData = sessionStorage.getItem('pending_business_data');
          if (!pendingData) {
            // For business flow, we expect pending data. If missing, maybe it wasn't a business creation flow?
            // But if type arg says business, we should fail or redirect.
            throw new Error('Business data not found');
          }

          let businessData;
          try {
            businessData = JSON.parse(pendingData);
          } catch (error) {
            logger.error('Failed to parse business data:', error);
            throw new Error('Invalid business data format');
          }

          // Get promo code if used
          const promoCodeData = sessionStorage.getItem('promo_code_used');
          let promoCode = null;
          if (promoCodeData) {
            try {
              promoCode = JSON.parse(promoCodeData);
            } catch (error) {
              logger.error('Failed to parse promo code data:', error);
            }
          }

          // Call Secure Edge Function
          const { data, error } = await supabase.functions.invoke('complete-business-setup', {
            body: {
              session_id: sessionId,
              business_data: businessData,
              promo_code_id: promoCode?.id
            }
          });

          if (error) throw error;
          if (data?.error) throw new Error(data.error);

          // Clear pending data
          sessionStorage.removeItem('pending_business_data');
          sessionStorage.removeItem('promo_code_used');
          localStorage.removeItem('tour_completed_dentist');
          localStorage.removeItem('dentist-tour-completed');

          // Set flag to auto-start the dashboard tour for new business owners
          localStorage.setItem('should-start-tour', 'true');

          // Business Created Successfully
          const businessUrl = `${window.location.origin}/${data.slug}`;
          const successMessage = isPromo
            ? `Business created for FREE with promo code!`
            : `Business created! Your URL: ${businessUrl}`;

          toast.success(successMessage);

          // Copy URL
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(businessUrl);
            setTimeout(() => {
              toast.success('URL copied to clipboard! Share it with your patients.');
            }, 500);
          }

          // Redirect
          setTimeout(() => {
            navigate('/dentist-portal');
          }, 4000);

        } catch (error: any) {
          logger.error('Error creating business:', error);
          toast.error(error.message || 'Failed to create business');
          setProcessing(false);
        }
      } else {
        // Handle regular payment success
        if (sessionId) {
          try {
            const { data, error } = await supabase.functions.invoke('update-payment-status', {
              body: { session_id: sessionId }
            });

            if (error) {
              logger.error('Error updating payment status:', error);
            }
          } catch (error) {
            logger.error('Failed to update payment status:', error);
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
            {processing ? 'Setting up your business...' : (isPromo ? 'Business Created!' : 'Payment Successful!')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {processing ? (
            <p className="text-muted-foreground">
              Please wait while we create your business account...
            </p>
          ) : (
            <>
              <p className="text-muted-foreground">
                Your payment has been processed successfully.
                {type === 'business' && ' Your business account is now active!'}
              </p>

              {sessionId && (
                <p className="text-sm text-muted-foreground">
                  Transaction ID: {sessionId.slice(0, 20)}...
                </p>
              )}

              {type !== 'business' && (
                <Button
                  onClick={handleCloseWindow}
                  className="w-full"
                >
                  Close Window
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
