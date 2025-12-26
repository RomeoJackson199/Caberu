/**
 * PatientAppointmentDetail - State-based appointment detail view
 * 
 * Core rule: Same structure, content/actions change based on state
 * 
 * States:
 * - Upcoming: prepare, not overwhelm
 * - Completed (no payment): explain outcome
 * - Completed (payment required): close the loop
 * - Fully closed (paid): reassurance
 * - Cancelled: clarity
 */

import React, { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isPast, isFuture } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Calendar,
  Clock,
  User,
  Building2,
  MapPin,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CalendarX,
  RefreshCw,
  Download,
  CreditCard,
  Receipt,
  ChevronRight,
  Stethoscope,
  ClipboardList,
  Ban,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PatientAppointmentDetailProps {
  appointmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReschedule?: (appointmentId: string) => void;
  onCancel?: (appointmentId: string) => void;
}

interface AppointmentData {
  id: string;
  appointment_date: string;
  status: string;
  urgency: string;
  reason: string;
  notes: string | null;
  consultation_notes: string | null;
  ai_summary: string | null;
  duration_minutes: number | null;
  payment_status: string | null;
  amount_paid_cents: number | null;
  completed_at: string | null;
  created_at: string;
  business: {
    id: string;
    name: string;
    address: string | null;
    logo_url: string | null;
  } | null;
  dentist: {
    first_name: string;
    last_name: string;
    specialization: string | null;
  } | null;
  service: {
    name: string;
    price_cents: number;
  } | null;
}

type AppointmentState = 
  | 'upcoming' 
  | 'action_required'
  | 'completed_no_payment' 
  | 'completed_payment_required' 
  | 'fully_closed' 
  | 'cancelled';

export function PatientAppointmentDetail({
  appointmentId,
  open,
  onOpenChange,
  onReschedule,
  onCancel,
}: PatientAppointmentDetailProps) {
  const isMobile = useIsMobile();
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && appointmentId) {
      fetchAppointmentDetails();
    }
  }, [open, appointmentId]);

  const fetchAppointmentDetails = async () => {
    if (!appointmentId) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          status,
          urgency,
          reason,
          notes,
          consultation_notes,
          ai_summary,
          duration_minutes,
          payment_status,
          amount_paid_cents,
          completed_at,
          created_at,
          businesses!inner (
            id,
            name,
            address,
            logo_url
          ),
          dentists!inner (
            first_name,
            last_name,
            specialization
          ),
          business_services (
            name,
            price_cents
          )
        `)
        .eq('id', appointmentId)
        .single();

      if (error) throw error;

      // Handle potential array responses from Supabase joins
      const businessData = Array.isArray(data.businesses) ? data.businesses[0] : data.businesses;
      const dentistData = Array.isArray(data.dentists) ? data.dentists[0] : data.dentists;
      const serviceData = Array.isArray(data.business_services) ? data.business_services[0] : data.business_services;

      setAppointment({
        id: data.id,
        appointment_date: data.appointment_date,
        status: data.status,
        urgency: data.urgency,
        reason: data.reason,
        notes: data.notes,
        consultation_notes: data.consultation_notes,
        ai_summary: data.ai_summary,
        duration_minutes: data.duration_minutes,
        payment_status: data.payment_status,
        amount_paid_cents: data.amount_paid_cents,
        completed_at: data.completed_at,
        created_at: data.created_at,
        business: businessData ? {
          id: businessData.id,
          name: businessData.name,
          address: businessData.address,
          logo_url: businessData.logo_url,
        } : null,
        dentist: dentistData ? {
          first_name: dentistData.first_name || '',
          last_name: dentistData.last_name || '',
          specialization: dentistData.specialization,
        } : null,
        service: serviceData ? {
          name: serviceData.name,
          price_cents: serviceData.price_cents,
        } : null,
      });
    } catch (error) {
      console.error('Error fetching appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  // Determine appointment state
  const appointmentState = useMemo((): AppointmentState => {
    if (!appointment) return 'upcoming';

    const { status, payment_status, appointment_date } = appointment;

    if (status === 'cancelled') return 'cancelled';
    
    if (status === 'pending') return 'action_required';

    if (status === 'completed') {
      if (payment_status === 'paid') return 'fully_closed';
      if (payment_status === 'pending' || payment_status === 'unpaid') {
        return 'completed_payment_required';
      }
      return 'completed_no_payment';
    }

    // Upcoming (confirmed or any future appointment)
    if (isFuture(parseISO(appointment_date))) {
      return 'upcoming';
    }

    return 'upcoming';
  }, [appointment]);

  const getStatusBadge = () => {
    const configs: Record<AppointmentState, { label: string; className: string; icon: React.ElementType }> = {
      upcoming: {
        label: 'Upcoming',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        icon: Calendar,
      },
      action_required: {
        label: 'Action required',
        className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
        icon: AlertTriangle,
      },
      completed_no_payment: {
        label: 'Completed',
        className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
        icon: CheckCircle2,
      },
      completed_payment_required: {
        label: 'Payment due',
        className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
        icon: CreditCard,
      },
      fully_closed: {
        label: 'Completed',
        className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
        icon: CheckCircle2,
      },
      cancelled: {
        label: 'Cancelled',
        className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        icon: XCircle,
      },
    };

    const config = configs[appointmentState];
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={cn("gap-1.5 font-medium", config.className)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const dentistName = appointment?.dentist
    ? `Dr. ${appointment.dentist.first_name} ${appointment.dentist.last_name}`.trim()
    : 'Your dentist';

  const content = (
    <div className="flex flex-col h-full">
      {loading ? (
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : appointment ? (
        <>
          {/* 1. HEADER - Always visible */}
          <div className="p-6 border-b bg-muted/30">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                {getStatusBadge()}
                <h2 className="text-lg font-semibold text-foreground">
                  {format(parseISO(appointment.appointment_date), 'EEEE, MMMM d, yyyy')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(appointment.appointment_date), 'h:mm a')}
                </p>
              </div>
              {appointment.business?.logo_url && (
                <img 
                  src={appointment.business.logo_url} 
                  alt="" 
                  className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                />
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                <span>{appointment.business?.name || 'Clinic'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                <span>{dentistName}</span>
              </div>
            </div>
          </div>

          {/* 2. APPOINTMENT SUMMARY - Compact */}
          <div className="p-6 border-b">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Stethoscope className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground">
                  {appointment.service?.name || appointment.reason || 'Appointment'}
                </h3>
                {appointment.notes && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {appointment.notes}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  {appointment.duration_minutes && (
                    <div className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      <span>{appointment.duration_minutes} min</span>
                    </div>
                  )}
                  {appointment.business?.address && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{appointment.business.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. STATE-SPECIFIC SECTIONS */}
          <div className="flex-1 overflow-auto p-6 space-y-6">
            
            {/* A. UPCOMING APPOINTMENT */}
            {appointmentState === 'upcoming' && (
              <>
                <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-foreground flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      Scheduled Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date</span>
                        <span className="font-medium">{format(parseISO(appointment.appointment_date), 'MMMM d, yyyy')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time</span>
                        <span className="font-medium">{format(parseISO(appointment.appointment_date), 'h:mm a')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dentist</span>
                        <span className="font-medium">{dentistName}</span>
                      </div>
                      {appointment.business?.address && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Location</span>
                          <span className="font-medium text-right max-w-[60%]">{appointment.business.address}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* B. COMPLETED (no payment yet) */}
            {appointmentState === 'completed_no_payment' && (
              <>
                {(appointment.consultation_notes || appointment.ai_summary) && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium text-foreground flex items-center gap-2 mb-3">
                        <ClipboardList className="h-4 w-4 text-emerald-600" />
                        Treatment Summary
                      </h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {appointment.consultation_notes || appointment.ai_summary}
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-muted">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground text-center">
                      Payment will become available shortly.
                    </p>
                  </CardContent>
                </Card>
              </>
            )}

            {/* C. COMPLETED (payment required) */}
            {appointmentState === 'completed_payment_required' && (
              <>
                {(appointment.consultation_notes || appointment.ai_summary) && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium text-foreground flex items-center gap-2 mb-3">
                        <ClipboardList className="h-4 w-4 text-emerald-600" />
                        Treatment Summary
                      </h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {appointment.consultation_notes || appointment.ai_summary}
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-foreground flex items-center gap-2 mb-3">
                      <Receipt className="h-4 w-4 text-orange-600" />
                      Payment Due
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant="outline" className="bg-orange-100 text-orange-800">Unpaid</Badge>
                      </div>
                      {appointment.amount_paid_cents !== null && appointment.amount_paid_cents > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Amount due</span>
                          <span className="font-semibold text-lg">€{(appointment.amount_paid_cents / 100).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* D. FULLY CLOSED (paid) */}
            {appointmentState === 'fully_closed' && (
              <>
                {(appointment.consultation_notes || appointment.ai_summary) && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium text-foreground flex items-center gap-2 mb-3">
                        <ClipboardList className="h-4 w-4 text-emerald-600" />
                        Treatment Summary
                      </h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {appointment.consultation_notes || appointment.ai_summary}
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Payment complete</p>
                        <p className="text-sm text-muted-foreground">
                          Paid on {appointment.completed_at 
                            ? format(parseISO(appointment.completed_at), 'MMM d, yyyy')
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* E. CANCELLED */}
            {appointmentState === 'cancelled' && (
              <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/50">
                      <Ban className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Appointment cancelled</p>
                      <p className="text-sm text-muted-foreground">
                        This appointment was cancelled.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action required (pending) */}
            {appointmentState === 'action_required' && (
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Awaiting confirmation</p>
                      <p className="text-sm text-muted-foreground">
                        This appointment is pending approval from the clinic.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 4. ACTIONS - Bottom */}
          <div className="p-6 border-t bg-muted/30">
            {/* A. Upcoming - Reschedule / Cancel */}
            {(appointmentState === 'upcoming' || appointmentState === 'action_required') && (
              <div className="flex gap-3">
                {onReschedule && (
                  <Button 
                    variant="outline" 
                    className="flex-1 gap-2"
                    onClick={() => onReschedule(appointment.id)}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reschedule
                  </Button>
                )}
                {onCancel && (
                  <Button 
                    variant="outline" 
                    className="flex-1 gap-2 text-destructive hover:text-destructive"
                    onClick={() => onCancel(appointment.id)}
                  >
                    <CalendarX className="h-4 w-4" />
                    Cancel
                  </Button>
                )}
              </div>
            )}

            {/* C. Payment required - Pay button */}
            {appointmentState === 'completed_payment_required' && (
              <div className="space-y-3">
                <Button className="w-full gap-2" size="lg">
                  <CreditCard className="h-4 w-4" />
                  Pay {appointment.amount_paid_cents 
                    ? `€${(appointment.amount_paid_cents / 100).toFixed(2)}`
                    : ''}
                </Button>
                <Button variant="outline" className="w-full gap-2">
                  <Download className="h-4 w-4" />
                  Download invoice
                </Button>
              </div>
            )}

            {/* D. Fully closed - Download only */}
            {appointmentState === 'fully_closed' && (
              <Button variant="outline" className="w-full gap-2">
                <Download className="h-4 w-4" />
                Download documents
              </Button>
            )}

            {/* E. Cancelled - Rebook shortcut */}
            {appointmentState === 'cancelled' && (
              <Button className="w-full gap-2" onClick={() => onOpenChange(false)}>
                Book new appointment
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Failed to load appointment details</p>
        </div>
      )}
    </div>
  );

  // Mobile: Sheet from bottom, Desktop: Dialog
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] p-0 rounded-t-2xl">
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 max-h-[90vh] overflow-hidden">
        {content}
      </DialogContent>
    </Dialog>
  );
}
