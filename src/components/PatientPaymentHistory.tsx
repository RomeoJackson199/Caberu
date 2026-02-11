import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Clock, CheckCircle, XCircle, ExternalLink, Loader2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { useBusinessContext } from '@/hooks/useBusinessContext';

interface PaymentRequest {
  id: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
  stripe_session_id?: string;
}

interface PatientPaymentHistoryProps {
  patientId: string;
  viewMode?: 'patient' | 'dentist';
  dentistId?: string;
  refreshTrigger?: number;
}

export const PatientPaymentHistory: React.FC<PatientPaymentHistoryProps> = ({ patientId, viewMode = 'patient', dentistId, refreshTrigger }) => {
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const { toast } = useToast();
  const { businessId } = useBusinessContext();

  useEffect(() => {
    fetchPaymentHistory();
  }, [patientId, businessId, refreshTrigger]);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('payment_requests')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      
      // Filter by business if we have a business context
      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPaymentRequests(data || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPaymentTitle = (request: PaymentRequest) => {
    // If description looks like an ID (e.g., "appointment-b4143..."), format it better
    if (request.description.toLowerCase().includes('appointment') ||
      request.description.match(/^[a-f0-9-]{8,}$/i)) {
      const date = new Date(request.created_at);
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      return `Dental Service – ${formattedDate}`;
    }
    return request.description;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'overdue':
        return <Clock className="h-4 w-4 text-red-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = { pending: 'default', paid: 'secondary', cancelled: 'destructive', overdue: 'destructive', failed: 'destructive', sent: 'default', draft: 'outline' } as const;
    const colors = { pending: 'bg-yellow-100 text-yellow-800 border-yellow-200', paid: 'bg-green-100 text-green-800 border-green-200', cancelled: 'bg-red-100 text-red-800 border-red-200', overdue: 'bg-red-100 text-red-800 border-red-200', failed: 'bg-red-100 text-red-800 border-red-200', sent: 'bg-blue-100 text-blue-800 border-blue-200', draft: 'bg-gray-100 text-gray-800 border-gray-200' } as const;

    return (
      <Badge
        variant={variants[status as keyof typeof variants] || 'default'}
        className={`${colors[status as keyof typeof colors] || colors.pending} font-medium px-3 py-1`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatAmount = (amount: number) => {
    return `€${(amount / 100).toFixed(2)}`;
  };

  const handlePayNow = async (paymentRequestId: string) => {
    try {
      setProcessingPayment(paymentRequestId);

      // Call the edge function to create a new payment session for existing request
      const { data, error } = await supabase.functions.invoke('create-payment-request', {
        body: {
          payment_request_id: paymentRequestId
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.payment_url) {
        // Open payment URL in new tab
        window.open(data.payment_url, '_blank');
        toast({
          title: "Payment page opened",
          description: "Complete your payment in the new window",
        });
      } else {
        throw new Error('No payment URL received');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Payment error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleSendReminder = async (paymentRequestId: string) => {
    try {
      setSendingReminder(paymentRequestId);

      // Call edge function to send payment reminder notification
      const { data, error } = await supabase.functions.invoke('create-payment-request', {
        body: {
          payment_request_id: paymentRequestId,
          send_reminder: true
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      toast({
        title: "Reminder sent",
        description: "A payment reminder has been sent to the patient.",
      });
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        title: "Error",
        description: "Failed to send reminder. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingReminder(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">Loading payment history...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-dental-primary/5 to-dental-accent/5 border-dental-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center text-dental-primary">
          <DollarSign className="h-5 w-5 mr-2 text-dental-accent" />
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {paymentRequests.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 mx-auto text-dental-primary/30 mb-4" />
              <p className="text-dental-text/60 text-lg">No payment requests found</p>
              <p className="text-sm text-dental-text/40 mt-2">All your payment requests will appear here</p>
            </div>
          ) : (
            paymentRequests.map((request) => (
              <div
                key={request.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between p-4 md:p-6 border border-dental-primary/10 rounded-xl bg-white/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300 hover:border-dental-accent/30 gap-4"
              >
                <div className="flex items-start md:items-center gap-3 md:gap-4 flex-1 min-w-0">
                  <div className="p-2 rounded-full bg-dental-primary/10 flex-shrink-0">
                    {getStatusIcon(request.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-dental-primary mb-1 text-sm md:text-base break-words">{formatPaymentTitle(request)}</h4>
                    <p className="text-xs md:text-sm text-dental-text/70 mb-1">
                      Payment request from dentist
                    </p>
                    <p className="text-xs text-dental-text/50 flex items-center">
                      <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 md:flex-shrink-0">
                  <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-start gap-2">
                    <p className="font-bold text-lg md:text-xl text-dental-primary">{formatAmount(request.amount)}</p>
                    {getStatusBadge(request.status)}
                  </div>
                  {(request.status === 'pending' || request.status === 'failed' || request.status === 'cancelled') && viewMode === 'patient' && (
                    <Button
                      size="default"
                      onClick={() => handlePayNow(request.id)}
                      disabled={processingPayment === request.id}
                      className="w-full sm:w-auto bg-gradient-to-r from-dental-accent to-dental-accent/80 hover:from-dental-accent/90 hover:to-dental-accent/70 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {processingPayment === request.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          <span className="text-sm">Processing...</span>
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          <span className="text-sm">Pay Now</span>
                        </>
                      )}
                    </Button>
                  )}
                  {request.status === 'pending' && viewMode === 'dentist' && (
                    <Button
                      size="default"
                      onClick={() => handleSendReminder(request.id)}
                      disabled={sendingReminder === request.id}
                      className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {sendingReminder === request.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          <span className="text-sm">Sending...</span>
                        </>
                      ) : (
                        <>
                          <Bell className="h-4 w-4 mr-2" />
                          <span className="text-sm">Remind Now</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};