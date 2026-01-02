import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuditLogs } from '@/hooks/useSuperAdmin';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Shield, Calendar, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function AuditLogsTab() {
  const { data: logs, isLoading } = useAuditLogs(100);

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'bg-green-500';
    if (action.includes('DELETE')) return 'bg-red-500';
    if (action.includes('UPDATE')) return 'bg-blue-500';
    if (action.includes('RESOLVE')) return 'bg-purple-500';
    return 'bg-gray-500';
  };

  const formatAction = (action: string) => {
    return action
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Audit Logs</h2>
        <p className="text-muted-foreground">
          Complete audit trail of all super admin actions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Activity ({logs?.length || 0})
          </CardTitle>
          <CardDescription>
            All super admin actions are logged for security and compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs && logs.length > 0 ? (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{log.admin_email}</div>
                              {log.ip_address && (
                                <div className="text-xs text-muted-foreground">
                                  {log.ip_address}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getActionColor(log.action)}>
                            {formatAction(log.action)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.resource_type ? (
                            <div>
                              <div className="font-medium">{log.resource_type}</div>
                              {log.resource_id && (
                                <code className="text-xs text-muted-foreground">
                                  {log.resource_id.slice(0, 8)}...
                                </code>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.details ? (
                            <details className="cursor-pointer">
                              <summary className="text-sm text-muted-foreground hover:text-foreground">
                                View details
                              </summary>
                              <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto max-w-md">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </details>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDistanceToNow(new Date(log.created_at), {
                              addSuffix: true,
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="text-muted-foreground">No audit logs found</div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Notice</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            All super admin actions are permanently logged and cannot be deleted. This includes:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>User identity and email address</li>
            <li>Action performed and affected resources</li>
            <li>Timestamp and IP address</li>
            <li>Additional context and metadata</li>
          </ul>
          <p className="pt-2">
            These logs are used for security auditing, compliance, and troubleshooting purposes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
