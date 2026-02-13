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
import { AlertTriangle, CheckCircle, Trash2, Server } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  useAdminSystemErrors,
  useAdminSystemErrorsArchive,
  useAdminResolveError,
  useAdminDeleteArchivedError,
  useAdminHealthChecks,
  useAdminBusinesses,
} from '@/hooks/useAdminData';

const severityColors: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-700 dark:text-red-400',
  high: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  low: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
};

export default function AdminSystemHealth() {
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [filterBiz, setFilterBiz] = useState<string>('');
  const [filterResolved, setFilterResolved] = useState<string>('false');

  const { data: errors, isLoading: errorsLoading } = useAdminSystemErrors({
    severity: filterSeverity || undefined,
    businessId: filterBiz || undefined,
    resolved: filterResolved === 'all' ? undefined : filterResolved === 'true',
  });
  const { data: archivedErrors, isLoading: archiveLoading } = useAdminSystemErrorsArchive();
  const { data: healthChecks, isLoading: healthLoading } = useAdminHealthChecks();
  const { data: businesses } = useAdminBusinesses();
  const resolveError = useAdminResolveError();
  const deleteArchived = useAdminDeleteArchivedError();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">System Health</h2>
        <p className="text-sm text-muted-foreground">Monitor errors, health checks, and system status</p>
      </div>

      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="errors">System Errors ({errors?.length || 0})</TabsTrigger>
          <TabsTrigger value="archive">Archive ({archivedErrors?.length || 0})</TabsTrigger>
          <TabsTrigger value="health">Health Checks</TabsTrigger>
        </TabsList>

        {/* Active Errors */}
        <TabsContent value="errors">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">System Errors</CardTitle>
              <CardDescription>Filter and resolve system errors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="All severities" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterBiz} onValueChange={setFilterBiz}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="All businesses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All businesses</SelectItem>
                    {businesses?.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterResolved} onValueChange={setFilterResolved}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Unresolved</SelectItem>
                    <SelectItem value="true">Resolved</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {errorsLoading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Severity</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errors && errors.length > 0 ? errors.map((err) => (
                        <TableRow key={err.id}>
                          <TableCell>
                            <Badge className={severityColors[err.severity]}>{err.severity}</Badge>
                          </TableCell>
                          <TableCell className="font-medium text-sm">{err.error_type}</TableCell>
                          <TableCell className="max-w-[300px] truncate text-sm">{err.error_message}</TableCell>
                          <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground">{err.url || 'N/A'}</TableCell>
                          <TableCell>
                            {err.resolved ? (
                              <Badge variant="outline" className="gap-1 text-green-600"><CheckCircle className="h-3 w-3" />Resolved</Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-red-600"><AlertTriangle className="h-3 w-3" />Open</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(err.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            {!err.resolved && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 text-xs"
                                onClick={() => resolveError.mutate(err.id)}
                                disabled={resolveError.isPending}
                              >
                                Resolve
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No errors found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Archive */}
        <TabsContent value="archive">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Archived Errors</CardTitle>
              <CardDescription>Old errors moved to archive</CardDescription>
            </CardHeader>
            <CardContent>
              {archiveLoading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Severity</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {archivedErrors && archivedErrors.length > 0 ? archivedErrors.map((err) => (
                        <TableRow key={err.id}>
                          <TableCell><Badge className={severityColors[err.severity]}>{err.severity}</Badge></TableCell>
                          <TableCell className="font-medium text-sm">{err.error_type}</TableCell>
                          <TableCell className="max-w-[300px] truncate text-sm">{err.error_message}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(err.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600"
                              onClick={() => deleteArchived.mutate(err.id)}
                              disabled={deleteArchived.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No archived errors</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health Checks */}
        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Health Checks</CardTitle>
            </CardHeader>
            <CardContent>
              {healthLoading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : healthChecks && healthChecks.length > 0 ? (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Response Time</TableHead>
                        <TableHead>Error</TableHead>
                        <TableHead>Checked</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {healthChecks.map((check) => (
                        <TableRow key={check.id}>
                          <TableCell className="font-medium flex items-center gap-2">
                            <Server className="h-4 w-4 text-muted-foreground" />
                            {check.service_name}
                          </TableCell>
                          <TableCell>
                            <Badge variant={check.status === 'healthy' ? 'default' : 'destructive'}>
                              {check.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{check.response_time_ms ? `${check.response_time_ms}ms` : 'N/A'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{check.error_message || 'None'}</TableCell>
                          <TableCell className="text-sm">{check.checked_at ? format(new Date(check.checked_at), 'PP p') : 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No health checks recorded yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
