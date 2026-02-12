import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatDistanceToNow } from 'date-fns';
import {
  Phone,
  MessageSquare,
  Radio,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Bot,
  Send,
  Eye,
  BarChart3,
} from 'lucide-react';

interface CallRecord {
  id: string;
  business_id: string;
  call_id: string;
  caller_phone: string | null;
  duration_seconds: number | null;
  call_started_at: string;
  call_type: string | null;
  is_billable: boolean;
}

export function CommsMonitorTab() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Recent calls
  const { data: calls, isLoading: callsLoading, refetch: refetchCalls } = useQuery({
    queryKey: ['admin-comms-calls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phone_usage')
        .select('id, business_id, call_id, caller_phone, duration_seconds, call_started_at, call_type, is_billable')
        .order('call_started_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as CallRecord[];
    },
  });

  // Communication logs (WhatsApp + SMS)
  const { data: commLogs, isLoading: commLoading, refetch: refetchComm } = useQuery({
    queryKey: ['admin-comms-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communication_logs')
        .select('id, business_id, channel, status, direction, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  // Stats
  const callStats = {
    total: calls?.length || 0,
    completed: calls?.filter((c) => c.duration_seconds && c.duration_seconds > 30).length || 0,
    failed: calls?.filter((c) => !c.duration_seconds || c.duration_seconds < 10).length || 0,
    totalMinutes: ((calls || []).reduce((s, c) => s + (c.duration_seconds || 0), 0) / 60).toFixed(1),
  };

  const whatsappStats = {
    total: commLogs?.filter((c) => c.channel === 'whatsapp').length || 0,
    delivered: commLogs?.filter((c) => c.channel === 'whatsapp' && c.status === 'delivered').length || 0,
    failed: commLogs?.filter((c) => c.channel === 'whatsapp' && c.status === 'failed').length || 0,
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchCalls(), refetchComm()]);
    setIsRefreshing(false);
  };

  const maskPhone = (phone: string | null) => {
    if (!phone) return '***';
    return phone.slice(0, 4) + '***' + phone.slice(-2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Communications Monitor</h2>
          <p className="text-sm text-muted-foreground">Live feed of calls and messages (anonymized)</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{callStats.total}</p>
                <p className="text-xs text-muted-foreground">Recent Calls</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{callStats.totalMinutes}m</p>
                <p className="text-xs text-muted-foreground">Total Duration</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{whatsappStats.total}</p>
                <p className="text-xs text-muted-foreground">WhatsApp Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">
                  {callStats.total > 0 ? Math.round((callStats.completed / callStats.total) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Call Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Feed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Recent Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          {callsLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : calls && calls.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {calls.map((call) => (
                <div key={call.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      call.duration_seconds && call.duration_seconds > 30 ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}>
                      {call.duration_seconds && call.duration_seconds > 30
                        ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                        : <XCircle className="h-4 w-4 text-red-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{maskPhone(call.caller_phone)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(call.call_started_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">
                      {call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}m${call.duration_seconds % 60}s` : '0s'}
                    </span>
                    <Badge variant={call.duration_seconds && call.duration_seconds > 30 ? 'default' : 'destructive'} className="text-xs">
                      {call.duration_seconds && call.duration_seconds > 30 ? 'OK' : 'Failed'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent calls</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp Feed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Recent Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          {commLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : commLogs && commLogs.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {commLogs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs capitalize">{log.channel}</Badge>
                    <span className="text-sm">{log.direction}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={log.status === 'delivered' || log.status === 'sent' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {log.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent messages</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
