import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import {
  ClipboardList as ClipboardListIcon,
  Pill,
  Calendar,
  FileText,
  Download,
  Search,
  AlertTriangle,
  Clock,
  ArrowRight,
  Eye,
  Share2,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  User as UserIcon,
  ChevronRight,
  FileDown,
  Stethoscope,
  Activity,
  FileImage,
  FolderOpen,
  CalendarClock,
  List,
  ArrowUpDown,
  FileX,
  Upload,
  Share,
  Folder
} from "lucide-react";

export type CareItemType = 'plan' | 'prescription' | 'visit' | 'record';

export interface CareItem {
  id: string;
  type: CareItemType;
  title: string;
  subtitle?: string;
  date?: string;
  status?: string;
  data?: any;
  dentist?: string;
  description?: string;
  linkedAppointmentId?: string;
  notes?: string;
  outcomes?: string;
}

export interface CareTabProps {
  plans: CareItem[];
  prescriptions: CareItem[];
  visits: CareItem[];
  records: CareItem[];
  user: User;
  patientId?: string | null;
  onReschedule?: (appointmentId?: string) => void;
}

// Updated sections with better organization and sub-filters
type SectionType = 'visits' | 'treatments' | 'medications' | 'documents';
type ViewMode = 'cards' | 'timeline';

const SECTIONS: Array<{ 
  id: SectionType; 
  label: string; 
  icon: React.ElementType; 
  color: string;
  subFilters: string[];
}> = [
  { 
    id: 'visits', 
    label: 'Visits', 
    icon: Calendar, 
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    subFilters: ['Upcoming', 'Completed', 'Cancelled']
  },
  { 
    id: 'treatments', 
    label: 'Treatments', 
    icon: Activity, 
    color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
    subFilters: ['Active', 'Completed']
  },
  { 
    id: 'medications', 
    label: 'Medications', 
    icon: Pill, 
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    subFilters: ['Active', 'Past']
  },
  { 
    id: 'documents', 
    label: 'Documents', 
    icon: Folder, 
    color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    subFilters: ['Uploaded', 'Shared', 'Draft']
  }
];

export const CareTab: React.FC<CareTabProps> = ({ 
  plans, 
  prescriptions, 
  visits, 
  records, 
  user, 
  patientId, 
  onReschedule 
}) => {
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState<SectionType>('visits');
  const [viewerItem, setViewerItem] = useState<CareItem | null>(null);
  const [subFilter, setSubFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const { toast } = useToast();

  const formatDate = (d?: string) => {
    if (!d) return 'N/A';
    try { 
      return new Date(d).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }); 
    } catch { 
      return d; 
    }
  };

  const formatDateTime = (d?: string) => {
    if (!d) return 'N/A';
    try { 
      const date = new Date(d);
      return {
        date: date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        }),
        time: date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        })
      };
    } catch { 
      return { date: d, time: '' }; 
    }
  };

  const getStatusColor = (status?: string) => {
    switch ((status || '').toLowerCase()) {
      case 'active':
      case 'confirmed': 
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'pending':
      case 'scheduled':
      case 'upcoming': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'past': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch ((status || '').toLowerCase()) {
      case 'active':
      case 'confirmed':
      case 'completed': return CheckCircle;
      case 'cancelled': return XCircle;
      case 'pending':
      case 'scheduled': return Clock;
      case 'draft': return FileX;
      default: return AlertCircle;
    }
  };

  // Filter items based on search query and sub-filter
  const filterItems = (items: CareItem[], sectionType: SectionType) => {
    return items.filter(item => {
      const matchesQuery = !query || 
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.subtitle?.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase()) ||
        formatDate(item.date).toLowerCase().includes(query.toLowerCase());
      
      let matchesSubFilter = subFilter === 'all';
      
      if (!matchesSubFilter) {
        switch (sectionType) {
          case 'visits':
            if (subFilter === 'Upcoming') {
              matchesSubFilter = ['confirmed', 'scheduled', 'pending'].includes(item.status?.toLowerCase() || '');
            } else if (subFilter === 'Completed') {
              matchesSubFilter = item.status?.toLowerCase() === 'completed';
            } else if (subFilter === 'Cancelled') {
              matchesSubFilter = item.status?.toLowerCase() === 'cancelled';
            }
            break;
          case 'treatments':
            if (subFilter === 'Active') {
              matchesSubFilter = item.status?.toLowerCase() === 'active';
            } else if (subFilter === 'Completed') {
              matchesSubFilter = item.status?.toLowerCase() === 'completed';
            }
            break;
          case 'medications':
            if (subFilter === 'Active') {
              matchesSubFilter = item.status?.toLowerCase() === 'active';
            } else if (subFilter === 'Past') {
              matchesSubFilter = ['completed', 'expired', 'discontinued'].includes(item.status?.toLowerCase() || '');
            }
            break;
          case 'documents':
            if (subFilter === 'Uploaded') {
              matchesSubFilter = item.status?.toLowerCase() !== 'draft' && item.status?.toLowerCase() !== 'shared';
            } else if (subFilter === 'Shared') {
              matchesSubFilter = item.status?.toLowerCase() === 'shared';
            } else if (subFilter === 'Draft') {
              matchesSubFilter = item.status?.toLowerCase() === 'draft';
            }
            break;
        }
      }
      
      return matchesQuery && matchesSubFilter;
    });
  };

  // Group and filter items by section
  const sectionItems = useMemo(() => {
    switch (activeSection) {
      case 'visits':
        return filterItems(visits, 'visits');
      case 'treatments':
        return filterItems(plans, 'treatments');
      case 'medications':
        return filterItems(prescriptions, 'medications');
      case 'documents':
        return filterItems(records, 'documents');
      default:
        return [];
    }
  }, [activeSection, plans, prescriptions, visits, records, query, subFilter]);

  // Get all items for timeline view
  const allTimelineItems = useMemo(() => {
    if (viewMode !== 'timeline') return [];
    
    const all = [
      ...visits.map(v => ({ ...v, sectionType: 'visits' as const })),
      ...plans.map(p => ({ ...p, sectionType: 'treatments' as const })),
      ...prescriptions.map(p => ({ ...p, sectionType: 'medications' as const })),
      ...records.map(r => ({ ...r, sectionType: 'documents' as const }))
    ];
    
    // Filter by search query
    const filtered = all.filter(item => {
      const matchesQuery = !query || 
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.subtitle?.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase());
      return matchesQuery;
    });
    
    // Sort by date (newest first)
    return filtered.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  }, [visits, plans, prescriptions, records, query, viewMode]);

  const handleDownload = async (item: CareItem) => {
    toast({
      title: "Downloading...",
      description: `Preparing ${item.title} for download`,
    });
    // Implement actual download logic here
  };

  const handleShare = async (item: CareItem) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: `${item.title} - ${item.subtitle || ''}`,
        });
      } catch (error) {
        // Share failed or was cancelled
      }
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(`${item.title} - ${item.subtitle || ''}`);
      toast({
        title: "Copied to clipboard",
        description: "Information copied successfully",
      });
    }
  };

  const renderItemCard = (item: CareItem & { sectionType?: string }, index: number) => {
    const isVisit = item.type === 'visit' || item.sectionType === 'visits';
    const isTreatment = item.type === 'plan' || item.sectionType === 'treatments';
    const isMedication = item.type === 'prescription' || item.sectionType === 'medications';
    const isDocument = item.type === 'record' || item.sectionType === 'documents';
    
    const Icon = isVisit ? Calendar :
                 isTreatment ? Activity :
                 isMedication ? Pill :
                 isDocument ? (item.subtitle?.includes('xray') || item.subtitle?.includes('image') ? FileImage : FileText) :
                 FileText;
    
    const iconColor = isVisit ? 'text-blue-600' :
                      isTreatment ? 'text-orange-600' :
                      isMedication ? 'text-purple-600' :
                      'text-green-600';
    
    const iconBg = isVisit ? 'bg-blue-100 dark:bg-blue-900/30' :
                   isTreatment ? 'bg-orange-100 dark:bg-orange-900/30' :
                   isMedication ? 'bg-purple-100 dark:bg-purple-900/30' :
                   'bg-green-100 dark:bg-green-900/30';

    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Card className="hover:shadow-lg transition-all duration-200 border-l-4"
              style={{
                borderLeftColor: isVisit ? '#3b82f6' :
                                isTreatment ? '#f97316' :
                                isMedication ? '#a855f7' :
                                '#22c55e'
              }}>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={cn("p-2.5 rounded-lg flex-shrink-0", iconBg)}>
                  <Icon className={cn("h-5 w-5", iconColor)} />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-base break-words">{item.title}</h3>
                      {item.subtitle && (
                        <p className="text-sm text-muted-foreground mt-0.5 break-words">{item.subtitle}</p>
                      )}
                    </div>
                    <Badge className={cn(getStatusColor(item.status), "text-xs flex-shrink-0 self-start")}>
                      {item.status || 'Active'}
                    </Badge>
                  </div>
                  
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                      {item.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      {formatDate(item.date)}
                    </span>
                    {item.dentist && (
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <UserIcon className="h-3 w-3 flex-shrink-0" />
                        Dr. {item.dentist}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Action buttons with improved spacing and responsive design */}
              <div className="flex flex-col sm:flex-row items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-muted"
                  onClick={() => setViewerItem(item)}
                  title="View details"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {isDocument && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-muted"
                    onClick={() => handleDownload(item)}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-muted"
                  onClick={() => handleShare(item)}
                  title="Share"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="px-4 md:px-6 py-4 space-y-6 max-w-7xl mx-auto">
      {/* Header with Search */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <FolderOpen className="h-7 w-7 text-primary" />
            Treatment Records
          </h1>
          <p className="text-muted-foreground mt-1">View and manage your dental history</p>
        </div>
        
        {/* Improved responsive layout for search and view mode */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1 max-w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by treatment, medication, or date..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
            
            {/* View Mode Toggle - Now properly responsive */}
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1 w-full sm:w-auto justify-center">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="gap-1.5 flex-1 sm:flex-initial"
              >
                <List className="h-4 w-4" />
                <span className="hidden xs:inline">Cards</span>
              </Button>
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('timeline')}
                className="gap-1.5 flex-1 sm:flex-initial"
              >
                <CalendarClock className="h-4 w-4" />
                <span className="hidden xs:inline">Timeline</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Cards View */}
      {viewMode === 'cards' && (
        <Tabs value={activeSection} onValueChange={(v) => {
          setActiveSection(v as SectionType);
          setSubFilter('all'); // Reset sub-filter when changing sections
        }}>
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full gap-1 h-auto p-1">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const count = activeSection === section.id ? sectionItems.length : 
                           section.id === 'visits' ? visits.length :
                           section.id === 'treatments' ? plans.length :
                           section.id === 'medications' ? prescriptions.length :
                           records.length;
              return (
                <TabsTrigger 
                  key={section.id} 
                  value={section.id} 
                  className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-2 sm:px-3 h-auto"
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{section.label}</span>
                  {count > 0 && (
                    <Badge variant="secondary" className="ml-0 sm:ml-1 h-4 sm:h-5 px-1 sm:px-1.5 text-[10px] sm:text-xs">
                      {count}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Sub-filters for current section - Improved responsive layout */}
          <div className="mt-4 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-fit pb-2">
              <Button
                variant={subFilter === 'all' ? "default" : "outline"}
                size="sm"
                onClick={() => setSubFilter('all')}
                className="h-8 whitespace-nowrap"
              >
                All
              </Button>
              <Separator orientation="vertical" className="h-6 mx-1" />
              {SECTIONS.find(s => s.id === activeSection)?.subFilters.map((filter) => (
                <Button
                  key={filter}
                  variant={subFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSubFilter(filter)}
                  className="h-8 whitespace-nowrap"
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>

          {/* Content for each section */}
          <TabsContent value={activeSection} className="mt-6 space-y-4">
            {sectionItems.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <div className="flex flex-col items-center">
                    {(() => {
                      const section = SECTIONS.find(s => s.id === activeSection);
                      const Icon = section?.icon || FileText;
                      return (
                        <>
                          <div className={cn("p-4 rounded-full mb-4", section?.color.replace('text-', 'bg-').replace('-600', '-100'))}>
                            <Icon className={cn("h-8 w-8", section?.color.split(' ')[0])} />
                          </div>
                        </>
                      );
                    })()}
                    <h3 className="text-lg font-medium mb-2">No {activeSection} found</h3>
                    <p className="text-muted-foreground max-w-sm">
                      {query ? 'Try adjusting your search or filters' : `You don't have any ${activeSection} records yet`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {sectionItems.map((item, index) => renderItemCard(item, index))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Complete History Timeline</h2>
            <Badge variant="secondary">{allTimelineItems.length} items</Badge>
          </div>
          
          {allTimelineItems.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <CalendarClock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No history yet</h3>
                <p className="text-muted-foreground">
                  Your treatment timeline will appear here once you have records
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
              
              {/* Timeline items */}
              <div className="space-y-6">
                {allTimelineItems.map((item, index) => {
                  const dateTime = formatDateTime(item.date);
                  const section = SECTIONS.find(s => s.id === item.sectionType);
                  const Icon = section?.icon || FileText;
                  
                  return (
                    <motion.div
                      key={`${item.id}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative flex gap-4"
                    >
                      {/* Timeline dot */}
                      <div className={cn(
                        "relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-4 border-background",
                        section?.color.replace('text-', 'bg-').replace('-600', '-100')
                      )}>
                        <Icon className={cn("h-6 w-6", section?.color.split(' ')[0])} />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 pb-8">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              {typeof dateTime === 'object' ? `${dateTime.date} • ${dateTime.time}` : dateTime}
                            </p>
                            <h3 className="font-semibold text-base">{item.title}</h3>
                            {item.subtitle && (
                              <p className="text-sm text-muted-foreground mt-1">{item.subtitle}</p>
                            )}
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {item.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <Badge className={cn(getStatusColor(item.status), "text-xs")}>
                                {item.status || 'Active'}
                              </Badge>
                              {item.dentist && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <UserIcon className="h-3 w-3" />
                                  Dr. {item.dentist}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Action button with better spacing */}
                          <div className="flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-muted"
                              onClick={() => setViewerItem(item)}
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Detail Modal */}
      <Dialog open={!!viewerItem} onOpenChange={() => setViewerItem(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {viewerItem && (() => {
                const isVisit = viewerItem.type === 'visit';
                const isTreatment = viewerItem.type === 'plan';
                const isMedication = viewerItem.type === 'prescription';
                const isDocument = viewerItem.type === 'record';
                
                const Icon = isVisit ? Calendar :
                           isTreatment ? Activity :
                           isMedication ? Pill :
                           isDocument ? FileText :
                           FileText;
                
                const iconColor = isVisit ? 'text-blue-600' :
                                isTreatment ? 'text-orange-600' :
                                isMedication ? 'text-purple-600' :
                                'text-green-600';
                
                const iconBg = isVisit ? 'bg-blue-100' :
                             isTreatment ? 'bg-orange-100' :
                             isMedication ? 'bg-purple-100' :
                             'bg-green-100';
                
                return (
                  <>
                    <div className={cn("p-2 rounded-lg", iconBg)}>
                      <Icon className={cn("h-5 w-5", iconColor)} />
                    </div>
                    <span>{viewerItem.title}</span>
                  </>
                );
              })()}
            </DialogTitle>
            {viewerItem?.subtitle && (
              <DialogDescription className="mt-2">
                {viewerItem.subtitle}
              </DialogDescription>
            )}
          </DialogHeader>
          
          <div className="space-y-4 mt-6">
            {viewerItem && (
              <>
                {/* Status and Date */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(viewerItem.status)}>
                      {viewerItem.status || 'Active'}
                    </Badge>
                    <Separator orientation="vertical" className="h-5" />
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(viewerItem.date)}
                    </span>
                  </div>
                  {viewerItem.dentist && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <UserIcon className="h-3.5 w-3.5" />
                      Dr. {viewerItem.dentist}
                    </span>
                  )}
                </div>
                
                {/* Description */}
                {(viewerItem.description || viewerItem.data?.description) && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Description</h4>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                      {viewerItem.description || viewerItem.data?.description}
                    </p>
                  </div>
                )}
                
                {/* Linked Appointment */}
                {viewerItem.linkedAppointmentId && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Linked Appointment</h4>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        // Navigate to appointment
                        setViewerItem(null);
                      }}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      View Appointment Details
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                
                {/* Notes/Outcomes */}
                {(viewerItem.notes || viewerItem.outcomes) && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Notes & Outcomes</h4>
                    <div className="bg-muted/30 p-3 rounded-lg space-y-2">
                      {viewerItem.notes && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Clinical Notes:</p>
                          <p className="text-sm">{viewerItem.notes}</p>
                        </div>
                      )}
                      {viewerItem.outcomes && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Outcomes:</p>
                          <p className="text-sm">{viewerItem.outcomes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Additional Data */}
                {viewerItem.data && (
                  <>
                    {viewerItem.data.dosage && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Dosage</p>
                          <p className="text-sm font-medium">{viewerItem.data.dosage}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Frequency</p>
                          <p className="text-sm font-medium">{viewerItem.data.frequency}</p>
                        </div>
                      </div>
                    )}
                    
                    {viewerItem.data.estimated_cost && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Estimated Cost</p>
                        <p className="text-sm font-medium">${viewerItem.data.estimated_cost}</p>
                      </div>
                    )}
                  </>
                )}
                
                {/* Actions - Improved responsive layout */}
                <Separator />
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  {viewerItem.type === 'record' && (
                    <Button 
                      onClick={() => handleDownload(viewerItem)} 
                      className="gap-2 w-full sm:w-auto"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={() => handleShare(viewerItem)} 
                    className="gap-2 w-full sm:w-auto"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                  {viewerItem.type === 'visit' && viewerItem.status === 'confirmed' && onReschedule && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        onReschedule(viewerItem.id);
                        setViewerItem(null);
                      }}
                      className="gap-2 w-full sm:w-auto"
                    >
                      <Calendar className="h-4 w-4" />
                      Reschedule
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};