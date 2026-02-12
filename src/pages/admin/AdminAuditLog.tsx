import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ScrollText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAdminSuperAuditLog } from '@/hooks/useAdminData';

export default function AdminAuditLog() {
  const { data: auditLogs, isLoading } = useAdminSuperAuditLog();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Admin Audit Log</h2>
        <p className="text-sm text-muted-foreground">All actions taken by super admins are logged here</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="h-4 w-4" /> Super Admin Actions ({auditLogs?.length || 0})
          </CardTitle>
          <CardDescription>Every admin write operation is automatically logged</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource Type</TableHead>
                    <TableHead>Resource ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs && auditLogs.length > 0 ? auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">{log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{log.resource_type || 'N/A'}</TableCell>
                      <TableCell className="text-xs font-mono">{log.resource_id?.slice(0, 12) || 'N/A'}</TableCell>
                      <TableCell className="text-xs font-mono">{log.user_id?.slice(0, 8) || 'system'}</TableCell>
                      <TableCell className="max-w-[300px]">
                        {log.details ? (
                          <details>
                            <summary className="text-xs text-muted-foreground cursor-pointer">View details</summary>
                            <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto max-h-[100px]">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No audit log entries yet. Actions will appear here as admin operations are performed.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
