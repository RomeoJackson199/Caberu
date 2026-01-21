import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  RefreshCw,
  AlertTriangle,
  Bell,
  Pause,
  Play,
  Radio,
  Clock,
  Zap,
} from 'lucide-react';

interface SystemError {
  id: string;
  error_type: string;
  error_message: string;
  severity: string;
  created_at: string;
  business_id: string | null;
}

export function LiveMonitoringCard() {
  const queryClient = useQueryClient();
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch real-time errors
  const { data: liveErrors, isLoading, refetch } = useQuery({
    queryKey: ['super-admin-live-errors'],
    queryFn: async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('system_errors')
        .select('id, error_type, error_message, severity, created_at, business_id')
        .gte('created_at', oneHourAgo)
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setLastRefresh(new Date());
      return data as SystemError[];
    },
    refetchInterval: isLiveMode ? 30000 : false, // Auto-refresh every 30s when live
  });

  // Get error stats
  const errorStats = {
    critical: liveErrors?.filter(e => e.severity === 'critical').length || 0,
    high: liveErrors?.filter(e => e.severity === 'high').length || 0,
    medium: liveErrors?.filter(e => e.severity === 'medium').length || 0,
    low: liveErrors?.filter(e => e.severity === 'low').length || 0,
    total: liveErrors?.length || 0,
  };

  const handleManualRefresh = async () => {
    await refetch();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive" className="text-xs">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">Medium</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Low</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              Live Monitoring
              {isLiveMode && (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
                  <Radio className="h-3 w-3 animate-pulse" />
                  Live
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Real-time error feed and system activity (last hour)
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="live-mode"
                checked={isLiveMode}
                onCheckedChange={setIsLiveMode}
              />
              <Label htmlFor="live-mode" className="text-sm">
                Auto-refresh
              </Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Stats Bar */}
        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Unresolved Errors (1h)</span>
            </div>
            <span className="text-2xl font-bold">{errorStats.total}</span>
          </div>
          
          {errorStats.total > 0 && (
            <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
              {errorStats.critical > 0 && (
                <div
                  className="bg-red-500"
                  style={{ width: `${(errorStats.critical / errorStats.total) * 100}%` }}
                />
              )}
              {errorStats.high > 0 && (
                <div
                  className="bg-orange-500"
                  style={{ width: `${(errorStats.high / errorStats.total) * 100}%` }}
                />
              )}
              {errorStats.medium > 0 && (
                <div
                  className="bg-yellow-500"
                  style={{ width: `${(errorStats.medium / errorStats.total) * 100}%` }}
                />
              )}
              {errorStats.low > 0 && (
                <div
                  className="bg-blue-500"
                  style={{ width: `${(errorStats.low / errorStats.total) * 100}%` }}
                />
              )}
            </div>
          )}
          
          <div className="flex gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Critical: {errorStats.critical}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              High: {errorStats.high}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              Medium: {errorStats.medium}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Low: {errorStats.low}
            </span>
          </div>
        </div>

        {/* Live Error Feed */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Error Feed
            </h4>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}
            </span>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : liveErrors && liveErrors.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {liveErrors.map((error) => (
                <div
                  key={error.id}
                  className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-2 h-2 mt-2 rounded-full ${getSeverityColor(error.severity)}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">
                            {error.error_type}
                          </p>
                          {getSeverityBadge(error.severity)}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {error.error_message}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(error.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No unresolved errors in the last hour</p>
              <p className="text-xs">All systems operating normally</p>
            </div>
          )}
        </div>

        {/* Activity Pulse */}
        <div className="p-4 bg-accent/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${errorStats.critical > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
              <span className="text-sm font-medium">
                System Status: {errorStats.critical > 0 ? 'Attention Required' : 'Healthy'}
              </span>
            </div>
            {isLiveMode && (
              <span className="text-xs text-muted-foreground">
                Next refresh in ~30s
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
