import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatDistanceToNow, format, subDays } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Server,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Zap,
  Database,
  Wifi,
} from 'lucide-react';

export function SystemHealthTab() {
  const [timeRange, setTimeRange] = useState('24h');

  const hoursBack = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
  const fromDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  // System errors filtered by time
  const { data: errors, isLoading: errorsLoading, refetch } = useQuery({
    queryKey: ['system-health-errors', timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_errors')
        .select('id, error_type, error_message, severity, created_at, resolved, business_id, url')
        .gte('created_at', fromDate)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Health checks
  const { data: healthChecks, isLoading: healthLoading } = useQuery({
    queryKey: ['system-health-checks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_health_checks')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
  });

  // Error stats
  const errorStats = {
    total: errors?.length || 0,
    critical: errors?.filter((e) => e.severity === 'critical').length || 0,
    high: errors?.filter((e) => e.severity === 'high').length || 0,
    unresolved: errors?.filter((e) => !e.resolved).length || 0,
  };

  // Group by error type
  const errorsByType: Record<string, number> = {};
  errors?.forEach((e) => {
    errorsByType[e.error_type] = (errorsByType[e.error_type] || 0) + 1;
  });

  const latestHealthByService: Record<string, any> = {};
  (healthChecks || []).forEach((hc: any) => {
    if (!latestHealthByService[hc.service_name]) {
      latestHealthByService[hc.service_name] = hc;
    }
  });

  const statusIcon = (status: string) => {
    if (status === 'healthy') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (status === 'degraded') return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">System Health</h2>
          <p className="text-sm text-muted-foreground">Performance metrics and error tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 hour</SelectItem>
              <SelectItem value="24h">24 hours</SelectItem>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Service Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4" />
            Service Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div>
          ) : Object.keys(latestHealthByService).length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(latestHealthByService).map(([service, hc]: [string, any]) => (
                <div key={service} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    {statusIcon(hc.status)}
                    <span className="text-sm font-medium capitalize">{service.replace('_', ' ')}</span>
                  </div>
                  {hc.response_time_ms && (
                    <p className="text-xs text-muted-foreground">{hc.response_time_ms}ms</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No health checks recorded yet. Run diagnostics from the Overview tab.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Error Summary */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{errorStats.total}</p>
            <p className="text-xs text-muted-foreground">Total Errors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-red-500">{errorStats.critical}</p>
            <p className="text-xs text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-orange-500">{errorStats.high}</p>
            <p className="text-xs text-muted-foreground">High</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-yellow-500">{errorStats.unresolved}</p>
            <p className="text-xs text-muted-foreground">Unresolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Error Type Breakdown */}
      {Object.keys(errorsByType).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Error Breakdown by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(errorsByType)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm font-mono">{type}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Log */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Error Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {errorsLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : errors && errors.length > 0 ? (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {errors.map((err: any) => (
                <div key={err.id} className={`p-3 border rounded-lg ${err.resolved ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{err.error_type}</span>
                        <Badge
                          variant={err.severity === 'critical' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {err.severity}
                        </Badge>
                        {err.resolved && <Badge variant="outline" className="text-xs text-green-600">Resolved</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{err.error_message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(err.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No errors in this time range</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
