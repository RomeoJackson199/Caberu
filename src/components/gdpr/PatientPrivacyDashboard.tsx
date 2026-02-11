/**
 * Patient Privacy Dashboard
 * Allows patients to view their data, manage consent, and submit GDPR requests.
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shield,
  Download,
  Trash2,
  Eye,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Ban,
  ChevronLeft,
  ChevronRight,
  Edit3,
} from 'lucide-react';
import { usePatientConsents, useGrantConsent, useWithdrawConsent } from '@/hooks/useConsent';
import {
  usePatientGdprRequests,
  useSubmitGdprRequest,
  useExportPatientData,
  useAnonymizePatient,
  useObjectToProcessing,
} from '@/hooks/useGdprRequests';
import { usePatientAuditLog } from '@/hooks/useAuditLog';
import { type ConsentScope } from '@/lib/gdpr/consentManager';
import { formatDistanceToNow } from 'date-fns';

interface PatientPrivacyDashboardProps {
  patientId: string;
  userId: string;
}

const CONSENT_LABELS: Record<ConsentScope, { label: string; description: string }> = {
  health_data_processing: {
    label: 'Health Data Processing',
    description: 'Allow processing of your dental health records for care purposes',
  },
  ai_intake: {
    label: 'AI-Assisted Intake',
    description: 'Allow AI analysis of your symptoms during phone/chat intake',
  },
  notifications: {
    label: 'Appointment Notifications',
    description: 'Receive SMS and email reminders for appointments',
  },
  marketing: {
    label: 'Marketing Communications',
    description: 'Receive promotional communications and service updates',
  },
  analytics: {
    label: 'Analytics & Improvement',
    description: 'Allow anonymized data use for service improvement',
  },
};

const AUDIT_PAGE_SIZE = 10;

export function PatientPrivacyDashboard({ patientId, userId }: PatientPrivacyDashboardProps) {
  const [deleteReason, setDeleteReason] = useState('');
  const [rectificationOpen, setRectificationOpen] = useState(false);
  const [rectificationDescription, setRectificationDescription] = useState('');
  const [objectionOpen, setObjectionOpen] = useState(false);
  const [objectionReason, setObjectionReason] = useState('');
  const [objectionTypes, setObjectionTypes] = useState<string[]>([]);
  const [auditPage, setAuditPage] = useState(0);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');

  const { data: consents, isLoading: consentsLoading } = usePatientConsents(patientId);
  const { data: requests, isLoading: requestsLoading } = usePatientGdprRequests(patientId);
  const { data: auditLogs } = usePatientAuditLog(patientId);

  const grantConsentMutation = useGrantConsent();
  const withdrawConsentMutation = useWithdrawConsent();
  const submitRequestMutation = useSubmitGdprRequest();
  const exportDataMutation = useExportPatientData();
  const anonymizeMutation = useAnonymizePatient();
  const objectionMutation = useObjectToProcessing();

  const isConsentGranted = (scope: ConsentScope): boolean => {
    return consents?.some((c) => {
      if (c.scope !== scope || c.status !== 'granted') return false;
      if (c.expires_at && new Date(c.expires_at) < new Date()) return false;
      return true;
    }) ?? false;
  };

  const handleConsentToggle = (scope: ConsentScope, granted: boolean) => {
    if (granted) {
      grantConsentMutation.mutate({ patientId, scope, actorId: userId });
    } else {
      withdrawConsentMutation.mutate({ patientId, scope, actorId: userId });
    }
  };

  const handleRectificationSubmit = () => {
    if (!rectificationDescription.trim()) return;
    submitRequestMutation.mutate({
      patientId,
      type: 'rectification',
      actorId: userId,
      description: rectificationDescription,
    });
    setRectificationDescription('');
    setRectificationOpen(false);
  };

  const handleObjectionSubmit = () => {
    if (objectionTypes.length === 0) return;
    objectionMutation.mutate({
      patientId,
      actorId: userId,
      processingTypes: objectionTypes,
      reason: objectionReason,
    });
    submitRequestMutation.mutate({
      patientId,
      type: 'objection',
      actorId: userId,
      description: `Objection to: ${objectionTypes.join(', ')}. Reason: ${objectionReason || 'Not specified'}`,
    });
    setObjectionReason('');
    setObjectionTypes([]);
    setObjectionOpen(false);
  };

  const toggleObjectionType = (type: string) => {
    setObjectionTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><AlertCircle className="h-3 w-3 mr-1" />In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Paginated audit logs
  const paginatedLogs = auditLogs?.slice(auditPage * AUDIT_PAGE_SIZE, (auditPage + 1) * AUDIT_PAGE_SIZE) ?? [];
  const totalAuditPages = Math.ceil((auditLogs?.length ?? 0) / AUDIT_PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold">Privacy & Data Rights</h2>
          <p className="text-muted-foreground">Manage your data, consent preferences, and privacy rights under GDPR</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Download Data */}
        <Card className="group cursor-pointer hover:shadow-md transition-all hover:border-blue-200">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-2">
              <Download className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Download My Data</p>
              <div className="flex items-center gap-2 mt-1">
                <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'json' | 'csv')}>
                  <SelectTrigger className="h-7 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => exportDataMutation.mutate({ patientId, requestedBy: userId, format: exportFormat })}
                  disabled={exportDataMutation.isPending}
                >
                  {exportDataMutation.isPending ? 'Exporting...' : 'Export'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Request Correction */}
        <Card
          className="group cursor-pointer hover:shadow-md transition-all hover:border-orange-200"
          onClick={() => setRectificationOpen(true)}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-orange-50 dark:bg-orange-950 p-2">
              <Edit3 className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">Request Correction</p>
              <p className="text-xs text-muted-foreground">Fix inaccurate data</p>
            </div>
          </CardContent>
        </Card>

        {/* Object to Processing */}
        <Card
          className="group cursor-pointer hover:shadow-md transition-all hover:border-purple-200"
          onClick={() => setObjectionOpen(true)}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-purple-50 dark:bg-purple-950 p-2">
              <Ban className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">Object to Processing</p>
              <p className="text-xs text-muted-foreground">Stop specific data use</p>
            </div>
          </CardContent>
        </Card>

        {/* Delete Data */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Card className="group cursor-pointer hover:shadow-md transition-all hover:border-red-200 border-red-50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-red-50 dark:bg-red-950 p-2">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Delete My Data</p>
                  <p className="text-xs text-muted-foreground">Right to erasure</p>
                </div>
              </CardContent>
            </Card>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete your data?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently anonymize your personal data. Appointment history will be kept
                for legal compliance but your name and contact details will be removed.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Label htmlFor="deleteReason" className="text-sm">Reason (optional)</Label>
              <input
                id="deleteReason"
                type="text"
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                placeholder="Why do you want your data deleted?"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => anonymizeMutation.mutate({
                  patientId,
                  actorId: userId,
                  reason: deleteReason || 'Patient-initiated erasure request',
                })}
              >
                Delete My Data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Rectification Dialog */}
      <Dialog open={rectificationOpen} onOpenChange={setRectificationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-orange-600" />
              Request Data Correction
            </DialogTitle>
            <DialogDescription>
              Describe what information is incorrect and what it should be changed to. Your request will be processed within 30 days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="rectification-details">What needs to be corrected?</Label>
              <Textarea
                id="rectification-details"
                placeholder="e.g., My phone number is incorrect. It should be +32 xxx xxx xxx instead of..."
                value={rectificationDescription}
                onChange={(e) => setRectificationDescription(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRectificationOpen(false)}>Cancel</Button>
            <Button
              onClick={handleRectificationSubmit}
              disabled={!rectificationDescription.trim() || submitRequestMutation.isPending}
            >
              {submitRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Objection Dialog */}
      <Dialog open={objectionOpen} onOpenChange={setObjectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-purple-600" />
              Object to Processing
            </DialogTitle>
            <DialogDescription>
              Select the types of processing you want to object to. This will stop the selected processing activities and withdraw related consents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <Label>Processing types to object to:</Label>
              {[
                { id: 'marketing', label: 'Marketing Communications', desc: 'Promotional emails, offers' },
                { id: 'analytics', label: 'Analytics & Profiling', desc: 'Usage tracking, service improvement' },
                { id: 'ai_processing', label: 'AI Processing', desc: 'AI-assisted intake and analysis' },
                { id: 'notifications', label: 'Non-essential Notifications', desc: 'Reminders beyond legal requirements' },
              ].map(item => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    objectionTypes.includes(item.id) ? 'border-purple-400 bg-purple-50 dark:bg-purple-950' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => toggleObjectionType(item.id)}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    objectionTypes.includes(item.id) ? 'border-purple-600 bg-purple-600' : 'border-muted-foreground'
                  }`}>
                    {objectionTypes.includes(item.id) && <CheckCircle2 className="h-3 w-3 text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <Label htmlFor="objection-reason">Reason (optional)</Label>
              <Textarea
                id="objection-reason"
                placeholder="Why are you objecting to this processing?"
                value={objectionReason}
                onChange={(e) => setObjectionReason(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObjectionOpen(false)}>Cancel</Button>
            <Button
              onClick={handleObjectionSubmit}
              disabled={objectionTypes.length === 0 || objectionMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {objectionMutation.isPending ? 'Processing...' : 'Submit Objection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Consent Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Consent Preferences
          </CardTitle>
          <CardDescription>
            Control how your data is processed. Changes take effect immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {consentsLoading ? (
            <p className="text-sm text-muted-foreground">Loading consent preferences...</p>
          ) : (
            Object.entries(CONSENT_LABELS).map(([scope, info]) => (
              <div key={scope} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">{info.label}</Label>
                  <p className="text-xs text-muted-foreground">{info.description}</p>
                </div>
                <Switch
                  checked={isConsentGranted(scope as ConsentScope)}
                  onCheckedChange={(checked) => handleConsentToggle(scope as ConsentScope, checked)}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* GDPR Requests History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Your Data Requests
          </CardTitle>
          <CardDescription>History of your data access, deletion, correction, and objection requests</CardDescription>
        </CardHeader>
        <CardContent>
          {requestsLoading ? (
            <p className="text-sm text-muted-foreground">Loading requests...</p>
          ) : !requests?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No requests yet</p>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div key={request.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium capitalize">{request.type.replace('_', ' ')} Request</p>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Submitted {formatDistanceToNow(new Date(request.submitted_at), { addSuffix: true })}
                      {request.due_at && <> &middot; Due by {new Date(request.due_at).toLocaleDateString()}</>}
                    </p>
                    {request.description && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{request.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Log with Pagination */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Data Access Log
          </CardTitle>
          <CardDescription>Who has accessed your data</CardDescription>
        </CardHeader>
        <CardContent>
          {!auditLogs?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No access logs recorded</p>
          ) : (
            <>
              <div className="space-y-2">
                {paginatedLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-1.5 text-sm border-b last:border-0">
                    <div>
                      <span className="font-medium capitalize">{log.action.replace('_', ' ')}</span>
                      {log.entity_type && (
                        <span className="text-muted-foreground"> on {log.entity_type}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
              {totalAuditPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <span className="text-xs text-muted-foreground">
                    Page {auditPage + 1} of {totalAuditPages} ({auditLogs.length} entries)
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

      <Separator />

      <div className="text-center text-sm text-muted-foreground space-y-1">
        <p>For privacy questions, contact your dental practice or email <a href="mailto:Romeo@caberu.be" className="text-blue-600 hover:underline">Romeo@caberu.be</a></p>
        <p>You have the right to lodge a complaint with the Belgian Data Protection Authority (APD/GBA)</p>
      </div>
    </div>
  );
}
