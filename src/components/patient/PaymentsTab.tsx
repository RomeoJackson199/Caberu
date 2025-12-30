import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DollarSign, CheckCircle, ChevronDown, ChevronUp, Loader2, ExternalLink, Calendar, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { PatientAppointmentDetail } from "@/components/patient/PatientAppointmentDetail";

interface PaymentWithDetails {
  id: string;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  appointment_id: string | null;
  appointment?: {
    id: string;
    appointment_date: string;
    reason: string;
  } | null;
  business?: {
    id: string;
    name: string;
  } | null;
}

export interface PaymentsTabProps {
  patientId: string;
  totalDueCents?: number;
}

export const PaymentsTab: React.FC<PaymentsTabProps> = ({ patientId }) => {
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [paidExpanded, setPaidExpanded] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [scrollToSection, setScrollToSection] = useState<'payment' | 'documents' | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
  }, [patientId]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      
      // Fetch payments globally (no business filter) with appointment and business details
      const { data, error } = await supabase
        .from('payment_requests')
        .select(`
          id,
          amount,
          status,
          paid_at,
          created_at,
          appointment_id,
          appointments:appointment_id (
            id,
            appointment_date,
            reason
          ),
          businesses:business_id (
            id,
            name
          )
        `)
        .eq('patient_id', patientId)
        .neq('status', 'draft')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to flatten nested objects
      const transformed = (data || []).map((p: any) => ({
        ...p,
        appointment: p.appointments,
        business: p.businesses,
      }));

      setPayments(transformed);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Error",
        description: "Failed to load payments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async (paymentId: string) => {
    try {
      setProcessingPayment(paymentId);

      const { data, error } = await supabase.functions.invoke('create-payment-request', {
        body: { payment_request_id: paymentId }
      });

      if (error) throw error;

      if (data?.payment_url) {
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

  const openAppointmentDetail = (appointmentId: string | null, scrollTo?: 'payment' | 'documents' | null) => {
    if (!appointmentId) return;
    setSelectedAppointmentId(appointmentId);
    setScrollToSection(scrollTo || null);
    setDetailDialogOpen(true);
  };

  const formatAmount = (amount: number) => `€${(amount / 100).toFixed(2)}`;

  const outstandingPayments = payments.filter(p => p.status !== 'paid' && p.status !== 'cancelled');
  const paidPayments = payments.filter(p => p.status === 'paid');

  if (loading) {
    return (
      <div className="px-4 md:px-6 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-6 space-y-8">
      {/* Outstanding Payments - Primary Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-orange-500" />
          Outstanding Payments
        </h2>

        {outstandingPayments.length === 0 ? (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">
                    All caught up!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-200">
                    You have no outstanding payments.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {outstandingPayments.map((payment) => (
              <Card 
                key={payment.id} 
                className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/10 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openAppointmentDetail(payment.appointment_id, 'payment')}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Payment Info */}
                    <div className="flex-1">
                      {/* Amount - Prominent */}
                      <p className="text-2xl font-bold text-foreground mb-1">
                        {formatAmount(payment.amount)}
                      </p>
                      
                      {/* Status */}
                      <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 mb-2">
                        Payment required
                      </Badge>
                      
                      {/* Appointment Date */}
                      {payment.appointment && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(payment.appointment.appointment_date), 'MMM d, yyyy')}
                        </p>
                      )}
                      
                      {/* Clinic Name - Very Visible */}
                      {payment.business && (
                        <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                          {payment.business.name}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 sm:items-end">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePayNow(payment.id);
                        }}
                        disabled={processingPayment === payment.id}
                        className="w-full sm:w-auto"
                      >
                        {processingPayment === payment.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Pay Now
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Paid Payments - Secondary Section (Collapsed by default) */}
      {paidPayments.length > 0 && (
        <section>
          <Collapsible open={paidExpanded} onOpenChange={setPaidExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Paid ({paidPayments.length})
                </h2>
                {paidExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-4">
              <div className="space-y-3">
                {paidPayments.map((payment) => (
                  <Card 
                    key={payment.id} 
                    className="bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => openAppointmentDetail(payment.appointment_id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Payment Info */}
                        <div className="flex-1">
                          {/* Amount */}
                          <p className="text-xl font-semibold text-foreground mb-1">
                            {formatAmount(payment.amount)}
                          </p>
                          
                          {/* Paid Date */}
                          {payment.paid_at && (
                            <p className="text-sm text-green-600 dark:text-green-400 mb-1">
                              Paid {format(new Date(payment.paid_at), 'MMM d, yyyy')}
                            </p>
                          )}
                          
                          {/* Appointment Date */}
                          {payment.appointment && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
                              <Calendar className="h-3.5 w-3.5" />
                              Appointment: {format(new Date(payment.appointment.appointment_date), 'MMM d, yyyy')}
                            </p>
                          )}
                          
                          {/* Clinic Name */}
                          {payment.business && (
                            <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-primary" />
                              {payment.business.name}
                            </p>
                          )}
                        </div>

                        {/* Status Badge */}
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 self-start sm:self-center">
                          Paid
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </section>
      )}

      {/* Empty State */}
      {/* Empty State */}
      {payments.length === 0 && (
        <div className="text-center py-12">
          <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No payments yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Payments for your appointments will appear here
          </p>
        </div>
      )}

      {/* Appointment Detail Dialog */}
      <PatientAppointmentDetail 
        appointmentId={selectedAppointmentId} 
        open={detailDialogOpen} 
        onOpenChange={(open) => {
          setDetailDialogOpen(open);
          if (!open) {
            setSelectedAppointmentId(null);
            setScrollToSection(null);
          }
        }}
        scrollTo={scrollToSection}
      />
    </div>
  );
};
