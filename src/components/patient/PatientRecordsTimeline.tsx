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
import { PatientAppointmentDetail } from "@/components/patient/PatientAppointmentDetail";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  List,
  CalendarDays,
  Activity,
  Eye,
  Share2
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface PatientRecordsTimelineProps {
  patientId: string;
}

interface TimelineRecord {
  id: string;
  type: 'appointment' | 'document' | 'prescription' | 'invoice';
  title: string;
  description: string;
  date: string;
  clinicName: string;
  clinicId: string;
  dentistName?: string;
  linkedAppointmentId?: string;
  documentPath?: string;
  status?: string;
}

type CategoryFilter = 'visits' | 'treatments' | 'medications' | 'documents';
type StatusFilter = 'all' | 'upcoming' | 'completed' | 'cancelled';

export function PatientRecordsTimeline({ patientId }: PatientRecordsTimelineProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch all appointments with business info (for records view)
  const { data: appointments, isLoading: loadingAppointments } = useQuery({
    queryKey: ["patient-all-appointments", patientId],
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
          status,
          dentist_id,
          business_id,
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
        .order("appointment_date", { ascending: false });

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

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const visits = appointments?.length || 0;
    const treatments = appointments?.filter((apt: any) => 
      apt.status === 'completed' && (apt.consultation_notes || apt.ai_summary)
    ).length || 0;
    const medications = documents?.filter((doc: any) => 
      doc.document_type === 'prescription'
    ).length || 0;
    const docs = documents?.length || 0;

    return { visits, treatments, medications, documents: docs };
  }, [appointments, documents]);

  // Combine and sort all records into a unified timeline
  const timelineRecords = useMemo(() => {
    const records: TimelineRecord[] = [];

    // Add appointments
    if (appointments) {
      appointments.forEach((apt: any) => {
        const dentistName = apt.dentists 
          ? `Dr. ${apt.dentists.first_name || ''} ${apt.dentists.last_name || ''}`.trim()
          : undefined;
        
        records.push({
          id: apt.id,
          type: 'appointment',
          title: apt.reason || 'Visit',
          description: apt.consultation_notes || apt.ai_summary || apt.reason || 'Scheduled visit',
          date: apt.appointment_date,
          clinicName: apt.businesses?.name || 'Clinic',
          clinicId: apt.business_id,
          dentistName,
          linkedAppointmentId: apt.id,
          status: apt.status,
        });
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
          status: 'completed',
        });
      });
    }

    // Sort by date (newest first)
    return records.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [appointments, documents]);

  // Apply filters
  const filteredRecords = useMemo(() => {
    return timelineRecords.filter(record => {
      // Category filter
      if (activeCategory) {
        switch (activeCategory) {
          case 'visits':
            if (record.type !== 'appointment') return false;
            break;
          case 'treatments':
            if (record.type !== 'appointment' || record.status !== 'completed') return false;
            break;
          case 'medications':
            if (record.type !== 'prescription') return false;
            break;
          case 'documents':
            if (!['document', 'invoice', 'prescription'].includes(record.type)) return false;
            break;
        }
      }

      // Status filter
      if (statusFilter !== 'all') {
        const recordStatus = record.status || 'completed';
        if (statusFilter === 'upcoming' && !['scheduled', 'confirmed', 'pending'].includes(recordStatus)) {
          return false;
        }
        if (statusFilter === 'completed' && recordStatus !== 'completed') {
          return false;
        }
        if (statusFilter === 'cancelled' && recordStatus !== 'cancelled') {
          return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          record.title.toLowerCase().includes(query) ||
          record.description.toLowerCase().includes(query) ||
          record.clinicName.toLowerCase().includes(query) ||
          (record.dentistName?.toLowerCase().includes(query) ?? false) ||
          format(parseISO(record.date), "MMM d, yyyy").toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [timelineRecords, activeCategory, statusFilter, searchQuery]);

  const isLoading = loadingAppointments || loadingDocuments;

  const handleRecordClick = (record: TimelineRecord) => {
    if (record.linkedAppointmentId) {
      setSelectedAppointmentId(record.linkedAppointmentId);
      setDetailOpen(true);
    } else if (record.documentPath) {
      window.open(record.documentPath, '_blank', 'noopener,noreferrer');
    }
  };

  const getStatusBadge = (status?: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      scheduled: { 
        label: 'scheduled', 
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
      },
      confirmed: { 
        label: 'confirmed', 
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
      },
      pending: { 
        label: 'pending', 
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' 
      },
      completed: { 
        label: 'completed', 
        className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' 
      },
      cancelled: { 
        label: 'cancelled', 
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
      },
    };
    return statusConfig[status || 'scheduled'] || statusConfig.scheduled;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  const categories: { key: CategoryFilter; icon: React.ElementType; label: string; count: number }[] = [
    { key: 'visits', icon: Calendar, label: 'Visits', count: categoryCounts.visits },
    { key: 'treatments', icon: Activity, label: 'Treatments', count: categoryCounts.treatments },
    { key: 'medications', icon: Pill, label: 'Medications', count: categoryCounts.medications },
    { key: 'documents', icon: FolderOpen, label: 'Documents', count: categoryCounts.documents },
  ];

  const statusFilters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search by treatment, medication, or date"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 rounded-xl border-border bg-background"
        />
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === 'list' ? 'default' : 'outline'}
          className={cn(
            "flex-1 h-12 rounded-xl gap-2",
            viewMode === 'list' && "bg-primary text-primary-foreground"
          )}
          onClick={() => setViewMode('list')}
        >
          <List className="h-5 w-5" />
        </Button>
        <Button
          variant={viewMode === 'calendar' ? 'default' : 'outline'}
          className={cn(
            "flex-1 h-12 rounded-xl gap-2",
            viewMode === 'calendar' && "bg-primary text-primary-foreground"
          )}
          onClick={() => setViewMode('calendar')}
        >
          <CalendarDays className="h-5 w-5" />
        </Button>
      </div>

      {/* Category Tiles */}
      <Card className="rounded-xl border-border">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.key;
              
              return (
                <button
                  key={category.key}
                  onClick={() => setActiveCategory(isActive ? null : category.key)}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200",
                    isActive 
                      ? "border-primary bg-primary/5" 
                      : "border-transparent bg-muted/50 hover:bg-muted"
                  )}
                >
                  <Icon className={cn(
                    "h-6 w-6 mb-1",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    isActive ? "text-primary" : "text-foreground"
                  )}>
                    {category.label}
                  </span>
                  {category.count > 0 && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "mt-1 h-5 min-w-5 text-xs",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {category.count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Status Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {statusFilters.map((filter) => (
          <Button
            key={filter.key}
            variant={statusFilter === filter.key ? 'default' : 'outline'}
            size="sm"
            className={cn(
              "rounded-full px-4 whitespace-nowrap",
              statusFilter === filter.key 
                ? "bg-primary text-primary-foreground" 
                : "bg-background"
            )}
            onClick={() => setStatusFilter(filter.key)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Timeline Records */}
      {filteredRecords.length === 0 ? (
        <Card className="border-dashed rounded-xl">
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
        <div className="space-y-3">
          {filteredRecords.map((record) => {
            const statusBadge = getStatusBadge(record.status);
            const isClickable = record.linkedAppointmentId || record.documentPath;

            return (
              <Card 
                key={`${record.type}-${record.id}`}
                className={cn(
                  "rounded-xl transition-all duration-200 overflow-hidden",
                  isClickable && "cursor-pointer hover:shadow-md hover:border-primary/30"
                )}
                onClick={() => isClickable && handleRecordClick(record)}
              >
                {/* Left accent bar */}
                <div className="flex">
                  <div className={cn(
                    "w-1 flex-shrink-0",
                    record.status === 'completed' && "bg-emerald-500",
                    record.status === 'scheduled' && "bg-blue-500",
                    record.status === 'confirmed' && "bg-green-500",
                    record.status === 'pending' && "bg-yellow-500",
                    record.status === 'cancelled' && "bg-red-500",
                    !record.status && "bg-primary"
                  )} />
                  
                  <CardContent className="flex-1 p-4">
                    <div className="flex gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate">
                          {record.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {record.status}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge 
                            variant="secondary" 
                            className={cn("text-xs rounded-full", statusBadge.className)}
                          >
                            {statusBadge.label}
                          </Badge>
                          
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{format(parseISO(record.date), "MMM d, yyyy")}</span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <Share2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Chevron */}
                      {isClickable && (
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 self-center" />
                      )}
                    </div>
                  </CardContent>
                </div>
              </Card>
            );
          })}
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
    </div>
  );
}
