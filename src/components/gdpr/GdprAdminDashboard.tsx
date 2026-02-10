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
} from 'lucide-react';
import { usePendingGdprRequests, useUpdateGdprRequestStatus, useExportPatientData } from '@/hooks/useGdprRequests';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getNotificationDeadlineHours, type BreachIncident } from '@/lib/gdpr/breachDetection';
import { formatDistanceToNow } from 'date-fns';

interface GdprAdminDashboardProps {
  userId: string;
}

export function GdprAdminDashboard({ userId }: GdprAdminDashboardProps) {
  const [auditFilter, setAuditFilter] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');

  const { data: pendingRequests, isLoading: requestsLoading } = usePendingGdprRequests();
  const { data: auditLogs, isLoading: auditLoading } = useAuditLog({
    action: auditActionFilter !== 'all' ? auditActionFilter : undefined,
    limit: 50,
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
        .limit(20);
      return (data ?? []) as BreachIncident[];
    },
  });

  const { data: consentStats } = useQuery({
    queryKey: ['consent-stats'],
    queryFn: async () => {
      const { data: granted } = await supabase
        .from('consent_records')
        .select('id', { count: 'exact' })
        .eq('status', 'granted');
      const { data: withdrawn } = await supabase
        .from('consent_records')
        .select('id', { count: 'exact' })
        .eq('status', 'withdrawn');
      return {
        granted: granted?.length ?? 0,
        withdrawn: withdrawn?.length ?? 0,
      };
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

  const getRequestTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      access: 'bg-blue-50 text-blue-700',
      erasure: 'bg-red-50 text-red-700',
      rectification: 'bg-orange-50 text-orange-700',
      restriction: 'bg-yellow-50 text-yellow-700',
      portability: 'bg-green-50 text-green-700',
      objection: 'bg-purple-50 text-purple-700',
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

  return (
    <div className="space-y-6">
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
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span className="font-semibold text-orange-800">Attention Required</span>
            </div>
            {overdue.length > 0 && (
              <p className="text-sm text-orange-700">{overdue.length} request(s) are past the 30-day GDPR deadline</p>
            )}
            {urgentRequests.length > 0 && (
              <p className="text-sm text-orange-700">{urgentRequests.length} request(s) due within 7 days</p>
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
                        <TableRow key={request.id} className={isOverdue ? 'bg-red-50' : ''}>
                          <TableCell>{getRequestTypeBadge(request.type)}</TableCell>
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
                          <TableCell className="space-x-2">
                            {request.type === 'access' || request.type === 'portability' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  exportDataMutation.mutate({ patientId: request.patient_id, requestedBy: userId });
                                  updateStatusMutation.mutate({
                                    requestId: request.id,
                                    status: 'completed',
                                    actorId: userId,
                                    resolutionNotes: 'Data exported and provided to patient',
                                  });
                                }}
                              >
                                <Download className="h-3 w-3 mr-1" />Export
                              </Button>
                            ) : null}
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
                            <Button
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({
                                requestId: request.id,
                                status: 'completed',
                                actorId: userId,
                                resolutionNotes: 'Completed',
                              })}
                            >
                              Complete
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
                    onChange={(e) => setAuditFilter(e.target.value)}
                  />
                </div>
                <Select value={auditActionFilter} onValueChange={setAuditActionFilter}>
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
                  </SelectContent>
                </Select>
              </div>
              {auditLoading ? (
                <p className="text-sm text-muted-foreground py-4">Loading...</p>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Purpose</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(auditLogs ?? [])
                        .filter((log) =>
                          !auditFilter ||
                          log.entity_type?.toLowerCase().includes(auditFilter.toLowerCase()) ||
                          log.patient_id?.includes(auditFilter)
                        )
                        .map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs">
                              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{log.action}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">{log.entity_type ?? '-'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{log.purpose_code ?? '-'}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Incident</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Discovered</TableHead>
                      <TableHead>72h Deadline</TableHead>
                      <TableHead>DPA Notified</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breachIncidents.map((incident) => {
                      const hoursLeft = getNotificationDeadlineHours(incident.discovered_at);
                      return (
                        <TableRow key={incident.id}>
                          <TableCell className="font-medium text-sm">{incident.title}</TableCell>
                          <TableCell>{getSeverityBadge(incident.severity)}</TableCell>
                          <TableCell><Badge variant="outline">{incident.status}</Badge></TableCell>
                          <TableCell className="text-xs">
                            {formatDistanceToNow(new Date(incident.discovered_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell className={`text-xs ${hoursLeft < 12 ? 'text-red-600 font-bold' : ''}`}>
                            {incident.authority_notified_at ? 'Done' : `${hoursLeft.toFixed(1)}h left`}
                          </TableCell>
                          <TableCell>
                            {incident.authority_notified_at ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-orange-600" />
                            )}
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

        {/* Consents Tab */}
        <TabsContent value="consents">
          <Card>
            <CardHeader>
              <CardTitle>Consent Overview</CardTitle>
              <CardDescription>Summary of patient consent records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{consentStats?.granted ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Active Consents</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-orange-600">{consentStats?.withdrawn ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Withdrawn Consents</p>
                  </CardContent>
                </Card>
              </div>
              <p className="text-sm text-muted-foreground">
                Consent records are managed per-patient. View individual patient profiles to manage specific consent preferences.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
