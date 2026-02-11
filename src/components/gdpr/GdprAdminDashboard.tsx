/**
 * GDPR Admin Dashboard for Practice Staff
 * Provides tools to manage GDPR requests, audit logs, breach incidents, and consent records.
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import {
  Shield,
  Clock,
  AlertTriangle,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Search,
  Eye,
  Bell,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { usePendingGdprRequests, useUpdateGdprRequestStatus, useExportPatientData } from '@/hooks/useGdprRequests';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getNotificationDeadlineHours, markAuthorityNotified, markPatientsNotified, updateBreachStatus, type BreachIncident, type BreachStatus } from '@/lib/gdpr/breachDetection';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface GdprAdminDashboardProps {
  userId?: string;
}

const AUDIT_PAGE_SIZE = 20;

export function GdprAdminDashboard({ userId: userIdProp }: GdprAdminDashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = userIdProp ?? user?.id ?? '';
  const [auditFilter, setAuditFilter] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');
  const [auditPage, setAuditPage] = useState(0);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'export' | 'complete' | 'reject' | 'notify_authority' | 'notify_patients' | 'breach_status';
    requestId?: string;
    patientId?: string;
    incidentId?: string;
    breachStatus?: BreachStatus;
    label: string;
  } | null>(null);

  const { data: pendingRequests, isLoading: requestsLoading } = usePendingGdprRequests();
  const { data: auditLogs, isLoading: auditLoading } = useAuditLog({
    action: auditActionFilter !== 'all' ? auditActionFilter : undefined,
    limit: 100,
  });
  const updateStatusMutation = useUpdateGdprRequestStatus();
  const exportDataMutation = useExportPatientData();

  const { data: breachIncidents } = useQuery({
    queryKey: ['breach-incidents'],
    queryFn: async () => {
      const { data } = await supabase
        .from('breach_incidents')
        .select('*')
        .order('discovered_at', { ascending: false })
        .limit(50);
      return (data ?? []) as BreachIncident[];
    },
  });

  const { data: consentStats } = useQuery({
    queryKey: ['consent-stats'],
    queryFn: async () => {
      const { data: granted } = await supabase
        .from('consent_records')
        .select('id, scope', { count: 'exact' })
        .eq('status', 'granted');
      const { data: withdrawn } = await supabase
        .from('consent_records')
        .select('id, scope', { count: 'exact' })
        .eq('status', 'withdrawn');
      const { data: expired } = await supabase
        .from('consent_records')
        .select('id, scope', { count: 'exact' })
        .eq('status', 'expired');

      // Group by scope
      const scopeCounts: Record<string, { granted: number; withdrawn: number; expired: number }> = {};
      for (const record of granted ?? []) {
        const scope = (record as { scope: string }).scope;
        if (!scopeCounts[scope]) scopeCounts[scope] = { granted: 0, withdrawn: 0, expired: 0 };
        scopeCounts[scope].granted++;
      }
      for (const record of withdrawn ?? []) {
        const scope = (record as { scope: string }).scope;
        if (!scopeCounts[scope]) scopeCounts[scope] = { granted: 0, withdrawn: 0, expired: 0 };
        scopeCounts[scope].withdrawn++;
      }
      for (const record of expired ?? []) {
        const scope = (record as { scope: string }).scope;
        if (!scopeCounts[scope]) scopeCounts[scope] = { granted: 0, withdrawn: 0, expired: 0 };
        scopeCounts[scope].expired++;
      }

      return {
        granted: granted?.length ?? 0,
        withdrawn: withdrawn?.length ?? 0,
        expired: expired?.length ?? 0,
        byScope: scopeCounts,
      };
    },
  });

  // Breach management mutations
  const notifyAuthorityMutation = useMutation({
    mutationFn: (params: { incidentId: string; actorId: string }) =>
      markAuthorityNotified(params.incidentId, params.actorId),
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: 'Authority notified', description: 'DPA notification recorded.' });
        queryClient.invalidateQueries({ queryKey: ['breach-incidents'] });
      } else {
        toast({ title: 'Failed', description: result.error, variant: 'destructive' });
      }
    },
  });

  const notifyPatientsMutation = useMutation({
    mutationFn: (params: { incidentId: string; actorId: string }) =>
      markPatientsNotified(params.incidentId, params.actorId),
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: 'Patients notified', description: 'Patient notification recorded.' });
        queryClient.invalidateQueries({ queryKey: ['breach-incidents'] });
      } else {
        toast({ title: 'Failed', description: result.error, variant: 'destructive' });
      }
    },
  });

  const updateBreachMutation = useMutation({
    mutationFn: (params: { incidentId: string; status: BreachStatus; actorId: string }) =>
      updateBreachStatus(params.incidentId, params.status, params.actorId),
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: 'Breach status updated' });
        queryClient.invalidateQueries({ queryKey: ['breach-incidents'] });
      } else {
        toast({ title: 'Failed', description: result.error, variant: 'destructive' });
      }
    },
  });

  const overdue = pendingRequests?.filter(
    (r) => new Date(r.due_at) < new Date()
  ) ?? [];

  const urgentRequests = pendingRequests?.filter(
    (r) => {
      const daysLeft = (new Date(r.due_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysLeft <= 7 && daysLeft > 0;
    }
  ) ?? [];

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    switch (confirmAction.type) {
      case 'export':
        if (confirmAction.patientId && confirmAction.requestId) {
          exportDataMutation.mutate({ patientId: confirmAction.patientId, requestedBy: userId });
          updateStatusMutation.mutate({
            requestId: confirmAction.requestId,
            status: 'completed',
            actorId: userId,
            resolutionNotes: 'Data exported and provided to patient',
          });
        }
        break;
      case 'complete':
        if (confirmAction.requestId) {
          updateStatusMutation.mutate({
            requestId: confirmAction.requestId,
            status: 'completed',
            actorId: userId,
            resolutionNotes: 'Completed',
          });
        }
        break;
      case 'reject':
        if (confirmAction.requestId) {
          updateStatusMutation.mutate({
            requestId: confirmAction.requestId,
            status: 'rejected',
            actorId: userId,
            resolutionNotes: 'Rejected by admin',
          });
        }
        break;
      case 'notify_authority':
        if (confirmAction.incidentId) {
          notifyAuthorityMutation.mutate({ incidentId: confirmAction.incidentId, actorId: userId });
        }
        break;
      case 'notify_patients':
        if (confirmAction.incidentId) {
          notifyPatientsMutation.mutate({ incidentId: confirmAction.incidentId, actorId: userId });
        }
        break;
      case 'breach_status':
        if (confirmAction.incidentId && confirmAction.breachStatus) {
          updateBreachMutation.mutate({
            incidentId: confirmAction.incidentId,
            status: confirmAction.breachStatus,
            actorId: userId,
          });
        }
        break;
    }
    setConfirmAction(null);
  };

  const getRequestTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      access: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
      erasure: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
      rectification: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
      restriction: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
      portability: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
      objection: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    };
    return <Badge variant="outline" className={colors[type] ?? ''}>{type}</Badge>;
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-600 text-white',
      high: 'bg-orange-500 text-white',
      medium: 'bg-yellow-500 text-white',
      low: 'bg-gray-400 text-white',
    };
    return <Badge className={colors[severity] ?? ''}>{severity}</Badge>;
  };

  // Paginated audit logs
  const filteredLogs = (auditLogs ?? []).filter((log) =>
    !auditFilter ||
    log.entity_type?.toLowerCase().includes(auditFilter.toLowerCase()) ||
    log.patient_id?.includes(auditFilter)
  );
  const paginatedLogs = filteredLogs.slice(auditPage * AUDIT_PAGE_SIZE, (auditPage + 1) * AUDIT_PAGE_SIZE);
  const totalAuditPages = Math.ceil(filteredLogs.length / AUDIT_PAGE_SIZE);

  const SCOPE_LABELS: Record<string, string> = {
    health_data_processing: 'Health Data',
    ai_intake: 'AI Intake',
    notifications: 'Notifications',
    marketing: 'Marketing',
    analytics: 'Analytics',
  };

  return (
    <div className="space-y-6">
      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.label}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold">GDPR Compliance</h2>
            <p className="text-muted-foreground">Manage data requests, audit logs, and compliance</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-muted-foreground">Pending Requests</span>
            </div>
            <p className="text-2xl font-bold mt-1">{pendingRequests?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card className={overdue.length > 0 ? 'border-red-200' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-muted-foreground">Overdue</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{overdue.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Active Consents</span>
            </div>
            <p className="text-2xl font-bold mt-1">{consentStats?.granted ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-muted-foreground">Breach Incidents</span>
            </div>
            <p className="text-2xl font-bold mt-1">{breachIncidents?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Urgent Alerts */}
      {(overdue.length > 0 || urgentRequests.length > 0) && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span className="font-semibold text-orange-800 dark:text-orange-200">Attention Required</span>
            </div>
            {overdue.length > 0 && (
              <p className="text-sm text-orange-700 dark:text-orange-300">{overdue.length} request(s) are past the 30-day GDPR deadline</p>
            )}
            {urgentRequests.length > 0 && (
              <p className="text-sm text-orange-700 dark:text-orange-300">{urgentRequests.length} request(s) due within 7 days</p>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="requests">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="requests">
            <FileText className="h-4 w-4 mr-1" />Requests
          </TabsTrigger>
          <TabsTrigger value="audit">
            <Eye className="h-4 w-4 mr-1" />Audit Log
          </TabsTrigger>
          <TabsTrigger value="breaches">
            <AlertTriangle className="h-4 w-4 mr-1" />Breaches
          </TabsTrigger>
          <TabsTrigger value="consents">
            <Shield className="h-4 w-4 mr-1" />Consents
          </TabsTrigger>
        </TabsList>

        {/* GDPR Requests Tab */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Data Subject Requests</CardTitle>
              <CardDescription>Process patient data access, deletion, and correction requests within 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <p className="text-sm text-muted-foreground py-4">Loading...</p>
              ) : !pendingRequests?.length ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No pending requests</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((request) => {
                      const isOverdue = new Date(request.due_at) < new Date();
                      return (
                        <TableRow key={request.id} className={isOverdue ? 'bg-red-50 dark:bg-red-950/30' : ''}>
                          <TableCell>{getRequestTypeBadge(request.type)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-48 truncate">
                            {request.description || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDistanceToNow(new Date(request.submitted_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
                            {new Date(request.due_at).toLocaleDateString()}
                            {isOverdue && ' (OVERDUE)'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{request.status}</Badge>
                          </TableCell>
                          <TableCell className="space-x-1">
                            {(request.type === 'access' || request.type === 'portability') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setConfirmAction({
                                  type: 'export',
                                  requestId: request.id,
                                  patientId: request.patient_id,
                                  label: `Export and deliver patient data for ${request.type} request? This will mark the request as completed.`,
                                })}
                              >
                                <Download className="h-3 w-3 mr-1" />Export
                              </Button>
                            )}
                            {request.status === 'submitted' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStatusMutation.mutate({
                                  requestId: request.id,
                                  status: 'in_progress',
                                  actorId: userId,
                                })}
                              >
                                Start
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => setConfirmAction({
                                type: 'complete',
                                requestId: request.id,
                                label: `Mark this ${request.type} request as completed?`,
                              })}
                            >
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setConfirmAction({
                                type: 'reject',
                                requestId: request.id,
                                label: `Reject this ${request.type} request? You must provide justification per GDPR Article 12(4).`,
                              })}
                            >
                              Reject
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>GDPR Audit Trail</CardTitle>
              <CardDescription>Complete record of all data access and modifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter by entity or patient..."
                    className="pl-9"
                    value={auditFilter}
                    onChange={(e) => { setAuditFilter(e.target.value); setAuditPage(0); }}
                  />
                </div>
                <Select value={auditActionFilter} onValueChange={(v) => { setAuditActionFilter(v); setAuditPage(0); }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="view_phi">View PHI</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="export">Export</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                    <SelectItem value="consent_change">Consent Change</SelectItem>
                    <SelectItem value="gdpr_request">GDPR Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {auditLoading ? (
                <p className="text-sm text-muted-foreground py-4">Loading...</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Purpose</TableHead>
                        <TableHead>Actor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{log.action}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{log.entity_type ?? '-'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{log.purpose_code ?? '-'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {log.actor_id ? log.actor_id.substring(0, 8) + '...' : 'system'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {totalAuditPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                      <span className="text-xs text-muted-foreground">
                        Page {auditPage + 1} of {totalAuditPages} ({filteredLogs.length} entries)
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAuditPage(p => Math.max(0, p - 1))}
                          disabled={auditPage === 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAuditPage(p => Math.min(totalAuditPages - 1, p + 1))}
                          disabled={auditPage >= totalAuditPages - 1}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Breaches Tab */}
        <TabsContent value="breaches">
          <Card>
            <CardHeader>
              <CardTitle>Breach Incident Register</CardTitle>
              <CardDescription>Track and manage data breach incidents per GDPR Article 33</CardDescription>
            </CardHeader>
            <CardContent>
              {!breachIncidents?.length ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No breach incidents recorded</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {breachIncidents.map((incident) => {
                    const hoursLeft = getNotificationDeadlineHours(incident.discovered_at);
                    const isUrgent = hoursLeft < 12 && !incident.authority_notified_at;
                    return (
                      <Card key={incident.id} className={`${isUrgent ? 'border-red-300 bg-red-50/50 dark:bg-red-950/20' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-sm">{incident.title}</h4>
                                {getSeverityBadge(incident.severity)}
                                <Badge variant="outline">{incident.status}</Badge>
                              </div>
                              {incident.description && (
                                <p className="text-xs text-muted-foreground mb-2">{incident.description}</p>
                              )}
                              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                <span>Discovered {formatDistanceToNow(new Date(incident.discovered_at), { addSuffix: true })}</span>
                                <span>Records affected: {incident.affected_records_count}</span>
                                <span className={isUrgent ? 'text-red-600 font-bold' : ''}>
                                  72h deadline: {incident.authority_notified_at ? 'Met' : `${hoursLeft.toFixed(1)}h left`}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                            {/* Status progression */}
                            {incident.status === 'reported' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setConfirmAction({
                                  type: 'breach_status',
                                  incidentId: incident.id,
                                  breachStatus: 'investigating',
                                  label: 'Start investigating this breach incident?',
                                })}
                              >
                                Start Investigation
                              </Button>
                            )}
                            {incident.status === 'investigating' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setConfirmAction({
                                  type: 'breach_status',
                                  incidentId: incident.id,
                                  breachStatus: 'contained',
                                  label: 'Mark this breach as contained?',
                                })}
                              >
                                Mark Contained
                              </Button>
                            )}
                            {incident.status === 'contained' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setConfirmAction({
                                  type: 'breach_status',
                                  incidentId: incident.id,
                                  breachStatus: 'resolved',
                                  label: 'Mark this breach as resolved?',
                                })}
                              >
                                Mark Resolved
                              </Button>
                            )}

                            {/* DPA Notification */}
                            {!incident.authority_notified_at && (
                              <Button
                                size="sm"
                                variant={isUrgent ? 'destructive' : 'outline'}
                                onClick={() => setConfirmAction({
                                  type: 'notify_authority',
                                  incidentId: incident.id,
                                  label: 'Record that the Belgian Data Protection Authority (APD/GBA) has been notified about this breach?',
                                })}
                              >
                                <Bell className="h-3 w-3 mr-1" />
                                {isUrgent ? 'URGENT: Notify DPA' : 'Record DPA Notification'}
                              </Button>
                            )}
                            {incident.authority_notified_at && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                                <CheckCircle2 className="h-3 w-3 mr-1" />DPA Notified
                              </Badge>
                            )}

                            {/* Patient Notification */}
                            {!incident.patients_notified_at && incident.severity !== 'low' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setConfirmAction({
                                  type: 'notify_patients',
                                  incidentId: incident.id,
                                  label: 'Record that affected patients have been notified about this breach?',
                                })}
                              >
                                <Users className="h-3 w-3 mr-1" />Record Patient Notification
                              </Button>
                            )}
                            {incident.patients_notified_at && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                                <CheckCircle2 className="h-3 w-3 mr-1" />Patients Notified
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consents Tab */}
        <TabsContent value="consents">
          <Card>
            <CardHeader>
              <CardTitle>Consent Overview</CardTitle>
              <CardDescription>Summary of patient consent records across all scopes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{consentStats?.granted ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Active</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-orange-600">{consentStats?.withdrawn ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Withdrawn</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-gray-400">{consentStats?.expired ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Expired</p>
                  </CardContent>
                </Card>
              </div>

              {/* Per-scope breakdown */}
              {consentStats?.byScope && Object.keys(consentStats.byScope).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Breakdown by Scope</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Scope</TableHead>
                        <TableHead className="text-center">Active</TableHead>
                        <TableHead className="text-center">Withdrawn</TableHead>
                        <TableHead className="text-center">Expired</TableHead>
                        <TableHead className="text-center">Consent Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(consentStats.byScope).map(([scope, counts]) => {
                        const total = counts.granted + counts.withdrawn + counts.expired;
                        const rate = total > 0 ? Math.round((counts.granted / total) * 100) : 0;
                        return (
                          <TableRow key={scope}>
                            <TableCell className="font-medium text-sm">{SCOPE_LABELS[scope] ?? scope}</TableCell>
                            <TableCell className="text-center text-green-600">{counts.granted}</TableCell>
                            <TableCell className="text-center text-orange-600">{counts.withdrawn}</TableCell>
                            <TableCell className="text-center text-gray-400">{counts.expired}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={rate > 70 ? 'default' : rate > 40 ? 'secondary' : 'destructive'}>
                                {rate}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-4">
                View individual patient profiles to manage specific consent preferences. Consent records are immutable for audit purposes.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
