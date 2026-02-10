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
  Shield,
  Download,
  Trash2,
  Eye,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { usePatientConsents, useGrantConsent, useWithdrawConsent } from '@/hooks/useConsent';
import {
  usePatientGdprRequests,
  useSubmitGdprRequest,
  useExportPatientData,
  useAnonymizePatient,
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

export function PatientPrivacyDashboard({ patientId, userId }: PatientPrivacyDashboardProps) {
  const [deleteReason, setDeleteReason] = useState('');
  const { data: consents, isLoading: consentsLoading } = usePatientConsents(patientId);
  const { data: requests, isLoading: requestsLoading } = usePatientGdprRequests(patientId);
  const { data: auditLogs } = usePatientAuditLog(patientId);

  const grantConsentMutation = useGrantConsent();
  const withdrawConsentMutation = useWithdrawConsent();
  const submitRequestMutation = useSubmitGdprRequest();
  const exportDataMutation = useExportPatientData();
  const anonymizeMutation = useAnonymizePatient();

  const isConsentGranted = (scope: ConsentScope): boolean => {
    return consents?.some((c) => c.scope === scope && c.status === 'granted') ?? false;
  };

  const handleConsentToggle = (scope: ConsentScope, granted: boolean) => {
    if (granted) {
      grantConsentMutation.mutate({ patientId, scope, actorId: userId });
    } else {
      withdrawConsentMutation.mutate({ patientId, scope, actorId: userId });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700"><AlertCircle className="h-3 w-3 mr-1" />In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => exportDataMutation.mutate({ patientId, requestedBy: userId })}>
          <CardContent className="flex items-center gap-3 p-4">
            <Download className="h-8 w-8 text-blue-600" />
            <div>
              <p className="font-semibold text-sm">Download My Data</p>
              <p className="text-xs text-muted-foreground">Export all your data as JSON</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => submitRequestMutation.mutate({ patientId, type: 'rectification', actorId: userId, description: 'Patient-initiated correction request' })}>
          <CardContent className="flex items-center gap-3 p-4">
            <FileText className="h-8 w-8 text-orange-600" />
            <div>
              <p className="font-semibold text-sm">Request Correction</p>
              <p className="text-xs text-muted-foreground">Fix inaccurate data</p>
            </div>
          </CardContent>
        </Card>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow border-red-100">
              <CardContent className="flex items-center gap-3 p-4">
                <Trash2 className="h-8 w-8 text-red-600" />
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
        <CardContent className="space-y-4">
          {consentsLoading ? (
            <p className="text-sm text-muted-foreground">Loading consent preferences...</p>
          ) : (
            Object.entries(CONSENT_LABELS).map(([scope, info]) => (
              <div key={scope} className="flex items-center justify-between py-2">
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
          <CardDescription>History of your data access, deletion, and correction requests</CardDescription>
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
                  <div>
                    <p className="text-sm font-medium capitalize">{request.type.replace('_', ' ')} Request</p>
                    <p className="text-xs text-muted-foreground">
                      Submitted {formatDistanceToNow(new Date(request.submitted_at), { addSuffix: true })}
                      {' · '}Due by {new Date(request.due_at).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Log */}
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
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {auditLogs.slice(0, 20).map((log) => (
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
