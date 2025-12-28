/**
 * PatientAppointmentDetail - Patient-facing appointment detail view
 * 
 * Answers: What happened (or will happen)? What do I need to do? 
 * What documents or payments exist?
 * 
 * Structure: Header → Status sentence → Summary → Documents → Payment → Actions
 */

import React, { useEffect, useState, useMemo, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Calendar,
  Clock,
  User,
  Building2,
  MapPin,
  CheckCircle2,
  XCircle,
  CalendarX,
  RefreshCw,
  Download,
  CreditCard,
  FileText,
  Stethoscope,
  ClipboardList,
  Ban,
  Timer,
  AlertCircle,
  ChevronRight,
  Loader2,
  FolderOpen,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  deriveAppointmentState,
  getStateConfig,
  getStatePermissions,
  AppointmentState,
  AppointmentStateInput,
} from "@/lib/appointmentStateMachine";

interface PatientAppointmentDetailProps {
  appointmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReschedule?: (appointmentId: string) => void;
  onCancel?: (appointmentId: string) => void;
  /** Optional: auto-scroll to a specific section */
  scrollTo?: 'payment' | 'documents' | null;
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
  patient_id: string;
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

interface DocumentData {
  id: string;
  title: string;
  document_type: string;
  file_path: string;
  file_name: string;
  created_at: string;
}

interface AddendumNote {
  id: string;
  content: string;
  created_at: string;
  title: string | null;
}

export function PatientAppointmentDetail({
  appointmentId,
  open,
  onOpenChange,
  onReschedule,
  onCancel,
  scrollTo,
}: PatientAppointmentDetailProps) {
  const isMobile = useIsMobile();
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [addendumNotes, setAddendumNotes] = useState<AddendumNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);

  const paymentRef = useRef<HTMLDivElement>(null);
  const documentsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && appointmentId) {
      fetchAppointmentDetails();
    }
  }, [open, appointmentId]);

  // Fetch documents and addendum notes when we have the patient_id
  useEffect(() => {
    if (appointment?.patient_id && appointment?.business?.id) {
      fetchDocuments();
      fetchAddendumNotes();
    }
  }, [appointment?.patient_id, appointment?.business?.id, appointmentId]);

  // Auto-scroll to section when navigation context provided
  useEffect(() => {
    if (!loading && appointment && scrollTo) {
      setTimeout(() => {
        if (scrollTo === 'payment' && paymentRef.current) {
          paymentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (scrollTo === 'documents' && documentsRef.current) {
          documentsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [loading, appointment, scrollTo]);

  const fetchDocuments = async () => {
    if (!appointment?.patient_id) return;
    
    try {
      const { data, error } = await supabase
        .from('patient_documents')
        .select('id, title, document_type, file_path, file_name, created_at')
        .eq('patient_id', appointment.patient_id)
        .eq('business_id', appointment.business?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        return;
      }
      
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchAddendumNotes = async () => {
    if (!appointmentId) return;
    
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('id, content, created_at, title')
        .eq('appointment_id', appointmentId)
        .eq('note_type', 'addendum')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching addendum notes:', error);
        return;
      }
      
      setAddendumNotes(data || []);
    } catch (error) {
      console.error('Error fetching addendum notes:', error);
    }
  };

  const handleDownloadDocument = async (doc: DocumentData) => {
    setDownloadingDoc(doc.id);
    try {
      if (doc.file_path.startsWith('http')) {
        window.open(doc.file_path, '_blank', 'noopener,noreferrer');
        return;
      }

      const { data, error } = await supabase.storage
        .from('patient-documents')
        .createSignedUrl(doc.file_path, 3600);

      if (error) {
        const { data: fallbackData, error: fallbackError } = await supabase.storage
          .from('documents')
          .createSignedUrl(doc.file_path, 3600);
        
        if (fallbackError) {
          console.error('Fallback error:', fallbackError);
          return;
        }
        
        if (fallbackData?.signedUrl) {
          window.open(fallbackData.signedUrl, '_blank', 'noopener,noreferrer');
        }
        return;
      }

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
    } finally {
      setDownloadingDoc(null);
    }
  };

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
          patient_id,
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
        patient_id: data.patient_id,
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

  // Derive state using the state machine
  const appointmentState = useMemo((): AppointmentState => {
    if (!appointment) return 'UPCOMING';

    const stateInput: AppointmentStateInput = {
      status: appointment.status,
      payment_status: appointment.payment_status,
      appointment_date: appointment.appointment_date,
      completed_at: appointment.completed_at,
      is_finalized: !!(appointment.consultation_notes || appointment.ai_summary),
      amount_due_cents: appointment.amount_paid_cents,
    };

    return deriveAppointmentState(stateInput);
  }, [appointment]);

  // Get permissions from state machine
  const permissions = useMemo(() => getStatePermissions(appointmentState), [appointmentState]);
  const stateConfig = useMemo(() => getStateConfig(appointmentState), [appointmentState]);

  const dentistName = appointment?.dentist
    ? `Dr. ${appointment.dentist.first_name} ${appointment.dentist.last_name}`.trim()
    : 'Your dentist';

  // Generate patient-friendly status sentence
  const getStatusSentence = (): string => {
    if (!appointment) return '';
    
    const dateStr = format(parseISO(appointment.appointment_date), 'MMMM d');
    const timeStr = format(parseISO(appointment.appointment_date), 'h:mm a');
    
    switch (appointmentState) {
      case 'UPCOMING':
        return `This appointment is scheduled for ${dateStr} at ${timeStr}.`;
      case 'COMPLETED_DRAFT':
        return 'Your dentist has completed the visit and is finalizing the details.';
      case 'COMPLETED_FINAL_UNPAID':
        return 'This appointment is completed. Payment is required.';
      case 'COMPLETED_FINAL_PAID':
        return 'This appointment is completed and closed.';
      case 'CANCELLED':
        return 'This appointment was cancelled and did not take place.';
      default:
        return '';
    }
  };

  // Status badge with icon
  const StatusBadge = () => {
    const iconMap: Record<AppointmentState, React.ElementType> = {
      UPCOMING: Calendar,
      COMPLETED_DRAFT: Clock,
      COMPLETED_FINAL_UNPAID: AlertCircle,
      COMPLETED_FINAL_PAID: CheckCircle2,
      CANCELLED: XCircle,
    };
    const Icon = iconMap[appointmentState];

    return (
      <Badge 
        variant="outline" 
        className={cn("gap-1.5 font-medium text-sm px-3 py-1", stateConfig.badgeClassName)}
      >
        <Icon className="h-3.5 w-3.5" />
        {stateConfig.label}
      </Badge>
    );
  };

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="p-6 space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Separator />
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full" />
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );

  // Document type to icon mapping
  const getDocumentIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('invoice') || lowerType.includes('receipt')) {
      return <CreditCard className="h-4 w-4 text-muted-foreground" />;
    }
    if (lowerType.includes('xray') || lowerType.includes('x-ray') || lowerType.includes('scan')) {
      return <Stethoscope className="h-4 w-4 text-muted-foreground" />;
    }
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  const content = (
    <div className="flex flex-col h-full overflow-hidden">
      {loading ? (
        <LoadingSkeleton />
      ) : appointment ? (
        <>
          {/* ============================================ */}
          {/* 1. HEADER - Orientation (always visible) */}
          {/* ============================================ */}
          <div className="p-6 border-b bg-muted/30 flex-shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                {/* State badge - visually dominant */}
                <StatusBadge />
                
                {/* Date & time */}
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {format(parseISO(appointment.appointment_date), 'EEEE, MMMM d, yyyy')}
                  </h2>
                  <p className="text-base text-muted-foreground mt-0.5">
                    {format(parseISO(appointment.appointment_date), 'h:mm a')}
                    {appointment.duration_minutes && ` · ${appointment.duration_minutes} min`}
                  </p>
                </div>
              </div>

              {/* Clinic logo */}
              {appointment.business?.logo_url && (
                <img 
                  src={appointment.business.logo_url} 
                  alt={appointment.business.name}
                  className="h-14 w-14 rounded-xl object-cover flex-shrink-0 border"
                />
              )}
            </div>

            {/* Clinic, Dentist & Appointment type info */}
            <div className="mt-4 space-y-1.5 text-sm">
              <div className="flex items-center gap-1.5 text-foreground font-medium">
                <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <span>{appointment.business?.name || 'Clinic'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="h-4 w-4 flex-shrink-0" />
                <span>{dentistName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Stethoscope className="h-4 w-4 flex-shrink-0" />
                <span>{appointment.service?.name || appointment.reason || 'Appointment'}</span>
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* 2. "WHAT'S HAPPENING NOW?" - Status sentence */}
          {/* ============================================ */}
          <div className="px-6 py-4 border-b bg-background flex-shrink-0">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0 mt-0.5">
                <Info className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {getStatusSentence()}
              </p>
            </div>
          </div>

          {/* ============================================ */}
          {/* 3. STATE-DRIVEN CONTENT (scrollable) */}
          {/* ============================================ */}
          <div className="flex-1 overflow-auto">
            <div className="p-6 space-y-5">
              
              {/* -------- UPCOMING -------- */}
              {appointmentState === 'UPCOMING' && (
                <>
                  {appointment.business?.address && (
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium text-foreground flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          Location
                        </h4>
                        <p className="text-sm text-muted-foreground">{appointment.business.address}</p>
                      </CardContent>
                    </Card>
                  )}

                  {appointment.notes && (
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium text-foreground flex items-center gap-2 mb-2">
                          <ClipboardList className="h-4 w-4 text-muted-foreground" />
                          Notes
                        </h4>
                        <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* -------- COMPLETED_DRAFT -------- */}
              {appointmentState === 'COMPLETED_DRAFT' && (
                <Card className="border-slate-200 dark:border-slate-700">
                  <CardContent className="p-6 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                      <Clock className="h-6 w-6 text-slate-500" />
                    </div>
                    <p className="text-foreground font-medium">Visit completed</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Details and documents will appear here once finalized.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* -------- COMPLETED_FINAL (UNPAID & PAID) -------- */}
              {(appointmentState === 'COMPLETED_FINAL_UNPAID' || appointmentState === 'COMPLETED_FINAL_PAID') && (
                <>
                  {/* 3. Appointment Summary (read-only) */}
                  {permissions.treatmentSummaryVisible && (appointment.consultation_notes || appointment.ai_summary) && (
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium text-foreground flex items-center gap-2 mb-3">
                          <ClipboardList className="h-4 w-4 text-emerald-600" />
                          Treatment Summary
                        </h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {appointment.consultation_notes || appointment.ai_summary}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Follow-up notes */}
                  {addendumNotes.length > 0 && (
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium text-foreground flex items-center gap-2 mb-3">
                          <ClipboardList className="h-4 w-4 text-muted-foreground" />
                          Follow-up Notes
                        </h4>
                        <div className="space-y-3">
                          {addendumNotes.map((note) => (
                            <div 
                              key={note.id}
                              className="p-3 bg-muted/50 rounded-md"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-muted-foreground">
                                  {format(parseISO(note.created_at), 'MMM d, yyyy')}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 4. Documents (read-only, after finalization) */}
                  {permissions.canDownloadDocuments && (
                    <div ref={documentsRef}>
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-medium text-foreground flex items-center gap-2 mb-3">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            Documents
                          </h4>
                          {documents.length === 0 ? (
                            <div className="text-center py-4">
                              <FolderOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">
                                Documents will appear here once available.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {documents.map((doc) => (
                                <button 
                                  key={doc.id}
                                  onClick={() => handleDownloadDocument(doc)}
                                  disabled={downloadingDoc === doc.id}
                                  className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                                >
                                  <div className="flex items-center gap-3">
                                    {getDocumentIcon(doc.document_type)}
                                    <div>
                                      <p className="text-sm font-medium">{doc.title}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {appointment.business?.name} · {format(parseISO(doc.created_at), 'MMM d, yyyy')}
                                      </p>
                                    </div>
                                  </div>
                                  {downloadingDoc === doc.id ? (
                                    <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* 5. Payment Section (conditional) */}
                  <div ref={paymentRef}>
                    {appointmentState === 'COMPLETED_FINAL_UNPAID' ? (
                      <Card className="border-orange-200 dark:border-orange-800/50 bg-orange-50/50 dark:bg-orange-950/20">
                        <CardContent className="p-4">
                          <h4 className="font-medium text-foreground flex items-center gap-2 mb-3">
                            <CreditCard className="h-4 w-4 text-orange-600" />
                            Payment Required
                          </h4>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                              Payment for this appointment
                            </p>
                            {appointment.amount_paid_cents !== null && appointment.amount_paid_cents > 0 && (
                              <span className="text-xl font-semibold text-foreground">
                                €{(appointment.amount_paid_cents / 100).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">Payment complete</p>
                              {appointment.amount_paid_cents !== null && appointment.amount_paid_cents > 0 && (
                                <p className="text-sm text-muted-foreground">
                                  €{(appointment.amount_paid_cents / 100).toFixed(2)} paid
                                  {appointment.completed_at && ` on ${format(parseISO(appointment.completed_at), 'MMM d, yyyy')}`}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </>
              )}

              {/* -------- CANCELLED -------- */}
              {appointmentState === 'CANCELLED' && (
                <Card className="border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-950/20">
                  <CardContent className="p-6 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mb-4">
                      <Ban className="h-6 w-6 text-red-600" />
                    </div>
                    <p className="text-foreground font-medium">Appointment cancelled</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This appointment did not take place.
                    </p>
                  </CardContent>
                </Card>
              )}

            </div>
          </div>

          {/* ============================================ */}
          {/* 6. ACTIONS - Limited by state */}
          {/* ============================================ */}
          <div className="p-6 border-t bg-muted/30 flex-shrink-0">
            {/* UPCOMING: Reschedule / Cancel */}
            {appointmentState === 'UPCOMING' && (permissions.canReschedule || permissions.canCancel) && (
              <div className="flex gap-3">
                {permissions.canReschedule && onReschedule && (
                  <Button 
                    variant="outline" 
                    className="flex-1 gap-2"
                    onClick={() => onReschedule(appointment.id)}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reschedule
                  </Button>
                )}
                {permissions.canCancel && onCancel && (
                  <Button 
                    variant="outline" 
                    className="flex-1 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onCancel(appointment.id)}
                  >
                    <CalendarX className="h-4 w-4" />
                    Cancel
                  </Button>
                )}
              </div>
            )}

            {/* COMPLETED_DRAFT: No actions */}
            {appointmentState === 'COMPLETED_DRAFT' && (
              <p className="text-sm text-muted-foreground text-center">
                No actions available at this time.
              </p>
            )}

            {/* COMPLETED_FINAL_UNPAID: Pay button */}
            {appointmentState === 'COMPLETED_FINAL_UNPAID' && permissions.canPay && (
              <Button className="w-full gap-2" size="lg">
                <CreditCard className="h-4 w-4" />
                Pay now
                {appointment.amount_paid_cents 
                  ? ` · €${(appointment.amount_paid_cents / 100).toFixed(2)}`
                  : ''}
              </Button>
            )}

            {/* COMPLETED_FINAL_PAID: Download documents */}
            {appointmentState === 'COMPLETED_FINAL_PAID' && permissions.canDownloadDocuments && documents.length > 0 && (
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => documentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              >
                <Download className="h-4 w-4" />
                View documents
              </Button>
            )}

            {/* CANCELLED: Rebook option */}
            {appointmentState === 'CANCELLED' && (
              <Button className="w-full gap-2" onClick={() => onOpenChange(false)}>
                Book new appointment
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-64 p-6">
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
