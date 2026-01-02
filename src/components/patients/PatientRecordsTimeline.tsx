/**
 * PatientRecordsTimeline - Read-only chronological timeline of finalized patient records
 * 
 * Rules:
 * - Read-only (no edit, upload, delete, or payment actions)
 * - Only finalized data from completed appointments
 * - Every item shows which business/clinic it belongs to
 * - Final-state language only ("Completed", "Final invoice", "Issued prescription")
 */

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PatientAppointmentDetail } from "@/components/patients/PatientAppointmentDetail";
import { TreatmentPlanDetailSheet } from "@/components/treatment-plans/TreatmentPlanDetailSheet";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Search, 
  Calendar,
  Stethoscope,
  Building2,
  ChevronRight,
  FolderOpen,
  Pill,
  Receipt,
  ClipboardCheck,
  User,
  ClipboardList
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface PatientRecordsTimelineProps {
  patientId: string;
}

interface TimelineRecord {
  id: string;
  type: 'appointment' | 'document' | 'prescription' | 'invoice' | 'treatment_plan';
  title: string;
  description: string;
  date: string;
  clinicName: string;
  clinicId: string;
  dentistName?: string;
  linkedAppointmentId?: string;
  documentPath?: string;
  // Treatment plan specific
  planStatus?: string;
  planTotal?: number;
  planCurrency?: string;
  planItemsPreview?: string;
}

export function PatientRecordsTimeline({ patientId }: PatientRecordsTimelineProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterClinic, setFilterClinic] = useState<string>("all");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [planDetailOpen, setPlanDetailOpen] = useState(false);

  // Fetch completed appointments with business info
  const { data: appointments, isLoading: loadingAppointments } = useQuery({
    queryKey: ["patient-completed-appointments", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          reason,
          consultation_notes,
          ai_summary,
          completed_at,
          duration_minutes,
          dentist_id,
          business_id,
          treatment_plan_id,
          businesses!inner (
            id,
            name
          ),
          dentists!inner (
            id,
            first_name,
            last_name
          )
        `)
        .eq("patient_id", patientId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch patient documents with business info
  const { data: documents, isLoading: loadingDocuments } = useQuery({
    queryKey: ["patient-documents", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_documents")
        .select(`
          id,
          title,
          document_type,
          file_path,
          created_at,
          business_id,
          businesses!inner (
            id,
            name
          )
        `)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch treatment plans (non-draft only - RLS enforces this)
  const { data: treatmentPlans, isLoading: loadingPlans, error: plansError } = useQuery({
    queryKey: ["patient-treatment-plans", patientId],
    queryFn: async () => {
      console.log("[PatientRecordsTimeline] Fetching treatment plans for patientId:", patientId);
      
      // Simple query first - no joins
      const { data, error } = await supabase
        .from("treatment_plans")
        .select(`
          id,
          title,
          status,
          version,
          currency,
          total_estimated_cents,
          notes,
          created_at,
          updated_at,
          business_id,
          dentist_id
        `)
        .eq("patient_id", patientId)
        .neq("status", "draft")
        .order("updated_at", { ascending: false });

      console.log("[PatientRecordsTimeline] Query result:", { data, error, patientId });
      
      if (error) {
        console.error("[PatientRecordsTimeline] Error fetching treatment plans:", error);
        throw error;
      }
      
      // Fetch business and dentist info separately if we have plans
      if (data && data.length > 0) {
        const businessIds = [...new Set(data.map(p => p.business_id).filter(Boolean))];
        const dentistIds = [...new Set(data.map(p => p.dentist_id).filter(Boolean))];
        
        const [businessesResult, dentistsResult] = await Promise.all([
          businessIds.length > 0 
            ? supabase.from("businesses").select("id, name").in("id", businessIds)
            : { data: [] },
          dentistIds.length > 0 
            ? supabase.from("dentists").select("id, first_name, last_name").in("id", dentistIds)
            : { data: [] }
        ]);
        
        const businessMap = new Map((businessesResult.data || []).map(b => [b.id, b]));
        const dentistMap = new Map((dentistsResult.data || []).map(d => [d.id, d]));
        
        return data.map(plan => ({
          ...plan,
          businesses: plan.business_id ? businessMap.get(plan.business_id) || null : null,
          dentists: plan.dentist_id ? dentistMap.get(plan.dentist_id) || null : null
        }));
      }
      
      console.log("[PatientRecordsTimeline] Returning treatment plans:", data);
      return data || [];
    }
  });
  
  // Log any query errors
  if (plansError) {
    console.error("[PatientRecordsTimeline] Query error:", plansError);
  }

  // Combine and sort all records into a unified timeline
  const timelineRecords = useMemo(() => {
    const records: TimelineRecord[] = [];

    // Add completed appointments - ONLY those not linked to a treatment plan
    // Appointments linked to plans appear as part of the plan card, not separately
    if (appointments) {
      appointments.forEach((apt: any) => {
        // Skip appointments that belong to a treatment plan
        if (apt.treatment_plan_id) {
          return;
        }
        
        const dentistName = apt.dentists 
          ? `Dr. ${apt.dentists.first_name || ''} ${apt.dentists.last_name || ''}`.trim()
          : undefined;
        
        // Only include if there's meaningful finalized content
        const hasContent = apt.consultation_notes || apt.ai_summary || apt.reason;
        if (hasContent) {
          records.push({
            id: apt.id,
            type: 'appointment',
            title: apt.reason || 'Completed visit',
            description: apt.consultation_notes || apt.ai_summary || 'Visit completed',
            date: apt.completed_at || apt.appointment_date,
            clinicName: apt.businesses?.name || 'Clinic',
            clinicId: apt.business_id,
            dentistName,
            linkedAppointmentId: apt.id,
          });
        }
      });
    }

    // Add documents (only finalized types)
    if (documents) {
      documents.forEach((doc: any) => {
        const docTypeMap: Record<string, { type: TimelineRecord['type'], label: string }> = {
          'invoice': { type: 'invoice', label: 'Final invoice' },
          'prescription': { type: 'prescription', label: 'Issued prescription' },
          'treatment_report': { type: 'document', label: 'Treatment summary' },
          'lab_result': { type: 'document', label: 'Lab results' },
          'imaging': { type: 'document', label: 'Imaging results' },
          'other': { type: 'document', label: 'Document' },
        };

        const typeInfo = docTypeMap[doc.document_type] || docTypeMap['other'];

        records.push({
          id: doc.id,
          type: typeInfo.type,
          title: doc.title || typeInfo.label,
          description: typeInfo.label,
          date: doc.created_at,
          clinicName: doc.businesses?.name || 'Clinic',
          clinicId: doc.business_id,
          documentPath: doc.file_path,
        });
      });
    }

    // Add treatment plans (non-draft)
    if (treatmentPlans) {
      treatmentPlans.forEach((plan: any) => {
        const dentistName = plan.dentists 
          ? `Dr. ${plan.dentists.first_name || ''} ${plan.dentists.last_name || ''}`.trim()
          : undefined;

        const statusLabel = plan.status === 'proposed' ? 'Proposed' 
          : plan.status === 'completed' ? 'Completed' 
          : plan.status === 'superseded' ? 'Superseded' 
          : plan.status;

        records.push({
          id: plan.id,
          type: 'treatment_plan',
          title: plan.title || 'Treatment Plan',
          description: `${statusLabel} treatment plan${plan.version > 1 ? ` (v${plan.version})` : ''}`,
          date: plan.updated_at || plan.created_at,
          clinicName: plan.businesses?.name || 'Clinic',
          clinicId: plan.business_id,
          dentistName,
          planStatus: plan.status,
          planTotal: plan.total_estimated_cents,
          planCurrency: plan.currency || 'USD',
        });
      });
    }

    // Sort by date (newest first)
    return records.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [appointments, documents, treatmentPlans]);

  // Get unique clinics for filter
  const clinics = useMemo(() => {
    const uniqueClinics = new Map<string, string>();
    timelineRecords.forEach(record => {
      if (!uniqueClinics.has(record.clinicId)) {
        uniqueClinics.set(record.clinicId, record.clinicName);
      }
    });
    return Array.from(uniqueClinics.entries()).map(([id, name]) => ({ id, name }));
  }, [timelineRecords]);

  // Apply filters
  const filteredRecords = useMemo(() => {
    return timelineRecords.filter(record => {
      // Type filter
      if (filterType !== "all" && record.type !== filterType) {
        return false;
      }

      // Clinic filter
      if (filterClinic !== "all" && record.clinicId !== filterClinic) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          record.title.toLowerCase().includes(query) ||
          record.description.toLowerCase().includes(query) ||
          record.clinicName.toLowerCase().includes(query) ||
          (record.dentistName?.toLowerCase().includes(query) ?? false)
        );
      }

      return true;
    });
  }, [timelineRecords, filterType, filterClinic, searchQuery]);

  const isLoading = loadingAppointments || loadingDocuments || loadingPlans;

  const handleRecordClick = (record: TimelineRecord) => {
    if (record.type === 'treatment_plan') {
      // Open treatment plan detail sheet
      setSelectedPlanId(record.id);
      setPlanDetailOpen(true);
    } else if (record.linkedAppointmentId) {
      // Open appointment detail dialog
      setSelectedAppointmentId(record.linkedAppointmentId);
      setDetailOpen(true);
    } else if (record.documentPath) {
      // Open document in new tab (read-only preview)
      window.open(record.documentPath, '_blank', 'noopener,noreferrer');
    }
  };

  const getRecordIcon = (type: TimelineRecord['type']) => {
    switch (type) {
      case 'appointment':
        return Stethoscope;
      case 'prescription':
        return Pill;
      case 'invoice':
        return Receipt;
      case 'treatment_plan':
        return ClipboardList;
      case 'document':
      default:
        return FileText;
    }
  };

  const getRecordBadge = (type: TimelineRecord['type'], record?: TimelineRecord) => {
    const configs: Record<string, { label: string; className: string }> = {
      appointment: { 
        label: 'Completed visit', 
        className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200' 
      },
      prescription: { 
        label: 'Issued prescription', 
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200' 
      },
      invoice: { 
        label: 'Final invoice', 
        className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200' 
      },
      document: { 
        label: 'Document', 
        className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200' 
      },
      treatment_plan: { 
        label: 'Treatment Plan', 
        className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200' 
      },
    };
    
    // For treatment plans, show status-based styling but simpler labels
    if (type === 'treatment_plan' && record?.planStatus) {
      const statusConfigs: Record<string, { label: string; className: string }> = {
        proposed: { 
          label: 'Treatment Plan', 
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200' 
        },
        completed: { 
          label: 'Completed', 
          className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200' 
        },
        superseded: { 
          label: 'Superseded', 
          className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200' 
        },
      };
      return statusConfigs[record.planStatus] || configs.treatment_plan;
    }
    
    return configs[type] || configs.document;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Type filter */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="appointment">Visits</SelectItem>
                <SelectItem value="treatment_plan">Treatment Plans</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="prescription">Prescriptions</SelectItem>
                <SelectItem value="invoice">Invoices</SelectItem>
              </SelectContent>
            </Select>

            {/* Clinic filter (only show if multiple clinics) */}
            {clinics.length > 1 && (
              <Select value={filterClinic} onValueChange={setFilterClinic}>
                <SelectTrigger className="sm:w-48">
                  <SelectValue placeholder="All clinics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All clinics</SelectItem>
                  {clinics.map((clinic) => (
                    <SelectItem key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {filteredRecords.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-muted">
                <FolderOpen className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  No records yet
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Your medical records will appear here after completed appointments.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border hidden sm:block" />

          <div className="space-y-3">
            {filteredRecords.map((record, index) => {
              const Icon = getRecordIcon(record.type);
              const badge = getRecordBadge(record.type, record);
              const isClickable = record.linkedAppointmentId || record.documentPath || record.type === 'treatment_plan';

              return (
                <Card 
                  key={`${record.type}-${record.id}`}
                  className={cn(
                    "relative transition-all duration-200",
                    isClickable && "cursor-pointer hover:shadow-md hover:border-primary/30"
                  )}
                  onClick={() => isClickable && handleRecordClick(record)}
                  role={isClickable ? "button" : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleRecordClick(record);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Icon */}
                      <div className="relative flex-shrink-0">
                        <div className={cn(
                          "h-12 w-12 rounded-full flex items-center justify-center",
                          record.type === 'appointment' && "bg-emerald-100 dark:bg-emerald-900/30",
                          record.type === 'prescription' && "bg-blue-100 dark:bg-blue-900/30",
                          record.type === 'invoice' && "bg-amber-100 dark:bg-amber-900/30",
                          record.type === 'document' && "bg-purple-100 dark:bg-purple-900/30"
                        )}>
                          <Icon className={cn(
                            "h-5 w-5",
                            record.type === 'appointment' && "text-emerald-600 dark:text-emerald-400",
                            record.type === 'prescription' && "text-blue-600 dark:text-blue-400",
                            record.type === 'invoice' && "text-amber-600 dark:text-amber-400",
                            record.type === 'document' && "text-purple-600 dark:text-purple-400"
                          )} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0">
                            <h4 className="font-medium text-foreground truncate">
                              {record.title}
                            </h4>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {record.description}
                            </p>
                          </div>
                          {isClickable && (
                            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <Badge variant="outline" className={badge.className}>
                            <ClipboardCheck className="h-3 w-3 mr-1" />
                            {badge.label}
                          </Badge>

                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            <span>{record.clinicName}</span>
                          </div>

                          {record.dentistName && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>{record.dentistName}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                            <Calendar className="h-3 w-3" />
                            <span>{format(parseISO(record.date), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Appointment Detail Dialog */}
      <PatientAppointmentDetail
        appointmentId={selectedAppointmentId}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelectedAppointmentId(null);
        }}
      />

      {/* Treatment Plan Detail Sheet */}
      <TreatmentPlanDetailSheet
        planId={selectedPlanId}
        open={planDetailOpen}
        onOpenChange={(open) => {
          setPlanDetailOpen(open);
          if (!open) setSelectedPlanId(null);
        }}
        onAppointmentClick={(appointmentId) => {
          // Close plan sheet and open appointment detail
          setPlanDetailOpen(false);
          setSelectedPlanId(null);
          setSelectedAppointmentId(appointmentId);
          setDetailOpen(true);
        }}
      />
    </div>
  );
}
