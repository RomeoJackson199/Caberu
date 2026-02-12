import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { FileText, Shield, Key, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  useAdminGdprRequests,
  useAdminUpdateGdprRequest,
  useAdminGdprExportBundles,
  useAdminAuditLogs,
  useAdminPatientConsents,
  useAdminPracticeConsents,
  useAdminEncryptionKeys,
} from '@/hooks/useAdminData';

const gdprStatusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  processing: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  completed: 'bg-green-500/10 text-green-700 dark:text-green-400',
  rejected: 'bg-red-500/10 text-red-700 dark:text-red-400',
};

export default function AdminCompliance() {
  const { data: gdprRequests, isLoading: gdprLoading } = useAdminGdprRequests();
  const { data: exportBundles, isLoading: exportLoading } = useAdminGdprExportBundles();
  const { data: auditLogs, isLoading: auditLoading } = useAdminAuditLogs();
  const { data: patientConsents, isLoading: patConsentLoading } = useAdminPatientConsents();
  const { data: practiceConsents, isLoading: pracConsentLoading } = useAdminPracticeConsents();
  const { data: encryptionKeys, isLoading: keysLoading } = useAdminEncryptionKeys();
  const updateGdpr = useAdminUpdateGdprRequest();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">GDPR & Compliance</h2>
        <p className="text-sm text-muted-foreground">Manage GDPR requests, audit logs, consents, and encryption keys</p>
      </div>

      <Tabs defaultValue="gdpr" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="gdpr">GDPR Requests</TabsTrigger>
          <TabsTrigger value="exports">Export Bundles</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="patient-consent">Patient Consents</TabsTrigger>
          <TabsTrigger value="practice-consent">Practice Consents</TabsTrigger>
          <TabsTrigger value="keys">Encryption Keys</TabsTrigger>
        </TabsList>

        {/* GDPR Requests */}
        <TabsContent value="gdpr">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">GDPR Requests ({gdprRequests?.length || 0})</CardTitle>
              <CardDescription>Data access, export, deletion, rectification, portability requests</CardDescription>
            </CardHeader>
            <CardContent>
              {gdprLoading ? <div className="flex justify-center py-8"><LoadingSpinner /></div> : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Processed By</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="w-[180px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gdprRequests && gdprRequests.length > 0 ? gdprRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell><Badge variant="outline" className="capitalize">{req.request_type}</Badge></TableCell>
                          <TableCell><Badge className={gdprStatusColors[req.status || ''] || ''}>{req.status}</Badge></TableCell>
                          <TableCell className="text-xs font-mono">{req.user_id?.slice(0, 8)}...</TableCell>
                          <TableCell className="text-sm">{req.requested_at ? format(new Date(req.requested_at), 'PP') : 'N/A'}</TableCell>
                          <TableCell className="text-xs">{req.processed_by?.slice(0, 8) || 'N/A'}</TableCell>
                          <TableCell className="text-sm">{req.completed_at ? format(new Date(req.completed_at), 'PP') : 'N/A'}</TableCell>
                          <TableCell className="max-w-[150px] truncate text-sm">{req.notes || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {req.status === 'pending' && (
                                <>
                                  <Button size="sm" variant="outline" className="text-xs"
                                    onClick={() => updateGdpr.mutate({ requestId: req.id, status: 'processing' })}
                                    disabled={updateGdpr.isPending}>
                                    Process
                                  </Button>
                                  <Button size="sm" variant="ghost" className="text-xs text-red-600"
                                    onClick={() => updateGdpr.mutate({ requestId: req.id, status: 'rejected' })}
                                    disabled={updateGdpr.isPending}>
                                    Reject
                                  </Button>
                                </>
                              )}
                              {req.status === 'processing' && (
                                <Button size="sm" variant="outline" className="text-xs text-green-600"
                                  onClick={() => updateGdpr.mutate({ requestId: req.id, status: 'completed' })}
                                  disabled={updateGdpr.isPending}>
                                  Complete
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No GDPR requests</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Bundles */}
        <TabsContent value="exports">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">GDPR Export Bundles ({exportBundles?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {exportLoading ? <div className="flex justify-center py-8"><LoadingSpinner /></div> : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Format</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Downloaded</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exportBundles && exportBundles.length > 0 ? exportBundles.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="text-xs font-mono">{b.request_id?.slice(0, 8)}...</TableCell>
                          <TableCell className="text-xs font-mono">{b.user_id?.slice(0, 8)}...</TableCell>
                          <TableCell><Badge variant="outline">{b.format || 'N/A'}</Badge></TableCell>
                          <TableCell>{b.file_size_bytes ? `${(b.file_size_bytes / 1024).toFixed(1)} KB` : 'N/A'}</TableCell>
                          <TableCell>{b.downloaded_at ? format(new Date(b.downloaded_at), 'PP') : 'Not yet'}</TableCell>
                          <TableCell>{b.expires_at ? format(new Date(b.expires_at), 'PP') : 'N/A'}</TableCell>
                          <TableCell className="text-sm">{format(new Date(b.created_at), 'PP')}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No export bundles</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audit Logs ({auditLogs?.length || 0})</CardTitle>
              <CardDescription>GDPR audit trail of all data operations</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLoading ? <div className="flex justify-center py-8"><LoadingSpinner /></div> : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Table</TableHead>
                        <TableHead>Record</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs && auditLogs.length > 0 ? auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs font-mono">{log.user_id?.slice(0, 8)}...</TableCell>
                          <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                          <TableCell className="text-sm">{log.table_name || 'N/A'}</TableCell>
                          <TableCell className="text-xs font-mono">{log.record_id?.slice(0, 8) || 'N/A'}</TableCell>
                          <TableCell className="text-xs">{log.ip_address || 'N/A'}</TableCell>
                          <TableCell className="text-sm">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No audit logs</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patient Consents */}
        <TabsContent value="patient-consent">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Patient Consents ({patientConsents?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {patConsentLoading ? <div className="flex justify-center py-8"><LoadingSpinner /></div> : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Practice</TableHead>
                        <TableHead>Health Data</TableHead>
                        <TableHead>Data Processing</TableHead>
                        <TableHead>Rights</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Withdrawn</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {patientConsents && patientConsents.length > 0 ? patientConsents.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-xs font-mono">{c.patient_id?.slice(0, 8)}...</TableCell>
                          <TableCell className="text-xs font-mono">{c.practice_id?.slice(0, 8)}...</TableCell>
                          <TableCell>{c.health_data_consent ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}</TableCell>
                          <TableCell>{c.data_processing_consent ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}</TableCell>
                          <TableCell>{c.understand_rights ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}</TableCell>
                          <TableCell>{c.consent_version || 'N/A'}</TableCell>
                          <TableCell>{c.withdrawn_at ? format(new Date(c.withdrawn_at), 'PP') : 'No'}</TableCell>
                          <TableCell className="text-sm">{c.consent_date ? format(new Date(c.consent_date), 'PP') : 'N/A'}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No patient consents</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Practice Consents */}
        <TabsContent value="practice-consent">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Practice Consents ({practiceConsents?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {pracConsentLoading ? <div className="flex justify-center py-8"><LoadingSpinner /></div> : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Practice</TableHead>
                        <TableHead>General</TableHead>
                        <TableHead>Data Processing</TableHead>
                        <TableHead>Terms Accepted</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {practiceConsents && practiceConsents.length > 0 ? practiceConsents.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-xs font-mono">{c.practice_id?.slice(0, 8)}...</TableCell>
                          <TableCell>{c.general_consent ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}</TableCell>
                          <TableCell>{c.data_processing_consent ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}</TableCell>
                          <TableCell>{c.terms_accepted ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}</TableCell>
                          <TableCell>{c.consent_version || 'N/A'}</TableCell>
                          <TableCell className="text-sm">{c.consent_date ? format(new Date(c.consent_date), 'PP') : 'N/A'}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No practice consents</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Encryption Keys */}
        <TabsContent value="keys">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Key className="h-4 w-4" />Encryption Keys ({encryptionKeys?.length || 0})</CardTitle>
              <CardDescription>From admin_encryption_key_status view (encrypted_key excluded)</CardDescription>
            </CardHeader>
            <CardContent>
              {keysLoading ? <div className="flex justify-center py-8"><LoadingSpinner /></div> : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Rotated</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Created By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {encryptionKeys && encryptionKeys.length > 0 ? encryptionKeys.map((key) => (
                        <TableRow key={key.id}>
                          <TableCell className="text-xs font-mono">{key.business_id?.slice(0, 8)}...</TableCell>
                          <TableCell>{key.key_version}</TableCell>
                          <TableCell><Badge variant={key.is_active ? 'default' : 'secondary'}>{key.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                          <TableCell className="text-sm">{format(new Date(key.created_at), 'PP')}</TableCell>
                          <TableCell className="text-sm">{key.rotated_at ? format(new Date(key.rotated_at), 'PP') : 'Never'}</TableCell>
                          <TableCell className="text-sm">
                            {key.expires_at ? (
                              <span className={new Date(key.expires_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'text-red-600 font-medium' : ''}>
                                {format(new Date(key.expires_at), 'PP')}
                              </span>
                            ) : 'No expiry'}
                          </TableCell>
                          <TableCell className="text-xs font-mono">{key.created_by?.slice(0, 8) || 'N/A'}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No encryption keys</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
