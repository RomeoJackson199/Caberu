import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSystemErrors, useResolveError } from '@/hooks/useSuperAdmin';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AlertCircle, CheckCircle2, Calendar, ExternalLink, TestTube } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { SystemError } from '@/types/super-admin';
import { reportError } from '@/lib/error-handling/reporting';
import { useToast } from '@/hooks/use-toast';

export function ErrorsTab() {
  const [showResolved, setShowResolved] = useState(false);
  const { data: errors, isLoading, refetch } = useSystemErrors(!showResolved ? false : undefined);
  const resolveError = useResolveError();
  const [selectedError, setSelectedError] = useState<SystemError | null>(null);
  const { toast } = useToast();

  const handleCreateTestError = async () => {
    const severities: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];
    const randomSeverity = severities[Math.floor(Math.random() * severities.length)];
    
    await reportError({
      error_type: 'TestError',
      error_message: `Test error created at ${new Date().toLocaleTimeString()}`,
      stack_trace: 'at TestComponent.render (test.tsx:42:15)\nat handleClick (test.tsx:18:5)',
      severity: randomSeverity,
      metadata: { test: true, timestamp: Date.now() },
    });

    toast({
      title: 'Test Error Created',
      description: 'A sample error has been logged to the system',
    });

    // Refetch errors after a short delay
    setTimeout(() => refetch(), 500);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleResolve = async (errorId: string) => {
    await resolveError.mutateAsync(errorId);
    setSelectedError(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Error Tracking</h2>
        <p className="text-muted-foreground">
          Monitor and resolve system errors and exceptions
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Errors ({errors?.length || 0})</CardTitle>
              <CardDescription>Track bugs and exceptions</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateTestError}
                className="gap-2"
              >
                <TestTube className="h-4 w-4" />
                Create Test Error
              </Button>
              <Tabs value={showResolved ? 'all' : 'unresolved'} onValueChange={(v) => setShowResolved(v === 'all')}>
                <TabsList>
                  <TabsTrigger value="unresolved">Unresolved</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
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
                    <TableHead>Error</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Occurred</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errors && errors.length > 0 ? (
                    errors.map((error) => (
                      <TableRow key={error.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell onClick={() => setSelectedError(error)}>
                          <div className="max-w-md">
                            <div className="font-medium truncate">{error.error_message}</div>
                            {error.url && (
                              <div className="text-xs text-muted-foreground truncate">
                                {error.url}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(error.severity)}>
                            {error.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {error.error_type}
                          </code>
                        </TableCell>
                        <TableCell>
                          {error.business_id ? (
                            <span className="text-sm">{error.business_id.slice(0, 8)}...</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {error.resolved ? (
                            <Badge variant="outline" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Resolved
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDistanceToNow(new Date(error.created_at), {
                              addSuffix: true,
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedError(error)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-muted-foreground">
                          {showResolved ? 'No errors found' : 'No unresolved errors'}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Details Dialog */}
      <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Error Details</DialogTitle>
            <DialogDescription>
              Full error information and stack trace
            </DialogDescription>
          </DialogHeader>

          {selectedError && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Severity</label>
                  <div className="mt-1">
                    <Badge className={getSeverityColor(selectedError.severity)}>
                      {selectedError.severity}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="mt-1">
                    {selectedError.resolved ? (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Resolved
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Active
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Error Type</label>
                <div className="mt-1">
                  <code className="text-sm bg-muted px-2 py-1 rounded block">
                    {selectedError.error_type}
                  </code>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Error Message</label>
                <div className="mt-1 p-3 bg-muted rounded-lg">
                  <p className="text-sm">{selectedError.error_message}</p>
                </div>
              </div>

              {selectedError.url && (
                <div>
                  <label className="text-sm font-medium">URL</label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                      {selectedError.url}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(selectedError.url!, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {selectedError.stack_trace && (
                <div>
                  <label className="text-sm font-medium">Stack Trace</label>
                  <div className="mt-1">
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                      {selectedError.stack_trace}
                    </pre>
                  </div>
                </div>
              )}

              {selectedError.metadata && (
                <div>
                  <label className="text-sm font-medium">Metadata</label>
                  <div className="mt-1">
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(selectedError.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setSelectedError(null)}>
                  Close
                </Button>
                {!selectedError.resolved && (
                  <Button
                    onClick={() => handleResolve(selectedError.id)}
                    disabled={resolveError.isPending}
                  >
                    {resolveError.isPending ? 'Resolving...' : 'Mark as Resolved'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
