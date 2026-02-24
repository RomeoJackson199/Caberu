import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Phone,
  MessageSquare,
  RefreshCw,
  Clock,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Bot,
  Building2,
  CheckCircle2,
  XCircle,
  Wrench,
} from 'lucide-react';

interface CallLogRecord {
  id: string;
  business_id: string | null;
  call_sid: string;
  status: string | null;
  patient_phone: string | null;
  duration_seconds: number | null;
  started_at: string | null;
  ended_at: string | null;
  appointment_booked: boolean | null;
  total_cost_eur: number | null;
  openai_cost_eur: number | null;
  twilio_cost_eur: number | null;
  tools_used: unknown;
  errors: unknown;
  created_at: string | null;
  business_name?: string;
}

const formatDuration = (seconds: number | null) => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatCost = (eur: number | null) => {
  if (eur == null) return '€0.0000';
  return `€${eur.toFixed(4)}`;
};

const maskPhone = (phone: string | null) => {
  if (!phone) return 'Unknown';
  return phone.slice(0, 4) + '***' + phone.slice(-2);
};

const toolsCount = (tools: unknown): number => {
  if (Array.isArray(tools)) return tools.length;
  if (tools && typeof tools === 'object') return Object.keys(tools).length;
  return 0;
};

const hasErrors = (errors: unknown): boolean => {
  if (Array.isArray(errors)) return errors.length > 0;
  if (errors && typeof errors === 'object') return Object.keys(errors).length > 0;
  return false;
};

export function CommsMonitorTab() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: calls, isLoading: callsLoading, refetch: refetchCalls } = useQuery({
    queryKey: ['admin-comms-call-logs'],
    queryFn: async (): Promise<CallLogRecord[]> => {
      const { data, error } = await supabase
        .from('call_logs')
        .select('id, business_id, call_sid, status, patient_phone, duration_seconds, started_at, ended_at, appointment_booked, total_cost_eur, openai_cost_eur, twilio_cost_eur, tools_used, errors, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;

      const rows = (data ?? []) as CallLogRecord[];
      const bizIds = [...new Set(rows.map((r) => r.business_id).filter(Boolean))] as string[];
      const bizMap: Record<string, string> = {};
      if (bizIds.length > 0) {
        const { data: bizData } = await supabase.from('businesses').select('id, name').in('id', bizIds);
        (bizData ?? []).forEach((b) => { bizMap[b.id] = b.name; });
      }

      return rows.map((r) => ({
        ...r,
        business_name: r.business_id ? (bizMap[r.business_id] ?? 'Unknown') : 'Unknown',
      }));
    },
    refetchInterval: 15000,
    staleTime: 0,
  });

  const { data: commLogs, isLoading: commLoading, refetch: refetchComm } = useQuery({
    queryKey: ['admin-comms-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communication_logs')
        .select('id, business_id, channel, status, direction, created_at')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15000,
    staleTime: 0,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchCalls(), refetchComm()]);
    setIsRefreshing(false);
  };

  // Stats
  const totalCalls = calls?.length ?? 0;
  const completedCalls = calls?.filter((c) => c.status === 'completed').length ?? 0;
  const failedCalls = totalCalls - completedCalls;
  const appointmentsBooked = calls?.filter((c) => c.appointment_booked).length ?? 0;
  const totalMinutes = ((calls ?? []).reduce((s, c) => s + (c.duration_seconds ?? 0), 0) / 60);
  const avgDuration = totalCalls > 0
    ? (calls ?? []).reduce((s, c) => s + (c.duration_seconds ?? 0), 0) / totalCalls
    : 0;
  const bookingRate = completedCalls > 0 ? Math.round((appointmentsBooked / completedCalls) * 100) : 0;
  const totalCost = (calls ?? []).reduce((s, c) => s + (c.total_cost_eur ?? 0), 0);
  const activeBizIds = new Set((calls ?? []).map((c) => c.business_id).filter(Boolean));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Voice AI Monitor
          </h2>
          <p className="text-sm text-muted-foreground">
            Live call feed across all businesses — auto-refreshes every 15s
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalCalls}</p>
                <p className="text-xs text-muted-foreground">Total Calls</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalMinutes.toFixed(1)}m</p>
                <p className="text-xs text-muted-foreground">Total Minutes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{bookingRate}%</p>
                <p className="text-xs text-muted-foreground">Booking Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">€{totalCost.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Total Cost</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">{completedCalls}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{activeBizIds.size}</p>
                <p className="text-xs text-muted-foreground">Businesses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Log */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Recent Calls
          </CardTitle>
          <CardDescription>
            Avg duration: {formatDuration(Math.round(avgDuration))} ·{' '}
            {appointmentsBooked} appointments booked ·{' '}
            {failedCalls} failed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {callsLoading ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : calls && calls.length > 0 ? (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {calls.map((call) => (
                <div key={call.id} className="flex items-start justify-between p-3 border rounded-lg gap-3">

                  {/* Status icon */}
                  <div className={`mt-0.5 p-2 rounded-lg shrink-0 ${
                    call.status === 'completed' ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}>
                    {call.status === 'completed'
                      ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                      : <XCircle className="h-4 w-4 text-red-500" />}
                  </div>

                  {/* Left info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{maskPhone(call.patient_phone)}</span>
                      <Badge variant="outline" className="text-xs font-normal truncate max-w-[140px]">
                        <Building2 className="h-3 w-3 mr-1" />
                        {call.business_name}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {call.started_at
                          ? formatDistanceToNow(new Date(call.started_at), { addSuffix: true })
                          : 'Unknown'}
                      </span>
                      {call.started_at && (
                        <span className="text-xs text-muted-foreground">
                          · {format(new Date(call.started_at), 'MMM d, HH:mm')}
                        </span>
                      )}
                    </div>
                    {/* Cost breakdown */}
                    {(call.openai_cost_eur != null || call.twilio_cost_eur != null) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        OpenAI {formatCost(call.openai_cost_eur)} · Twilio {formatCost(call.twilio_cost_eur)}
                      </p>
                    )}
                  </div>

                  {/* Right badges */}
                  <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                    <span className="text-sm font-mono tabular-nums">
                      {formatDuration(call.duration_seconds)}
                    </span>
                    {call.appointment_booked && (
                      <Badge variant="default" className="text-xs">Booked</Badge>
                    )}
                    {toolsCount(call.tools_used) > 0 && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Wrench className="h-3 w-3" />
                        {toolsCount(call.tools_used)}
                      </Badge>
                    )}
                    {hasErrors(call.errors) && (
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <Badge variant="outline" className="text-xs font-mono">
                      {formatCost(call.total_cost_eur)}
                    </Badge>
                    <Badge
                      variant={call.status === 'completed' ? 'secondary' : 'destructive'}
                      className="text-xs capitalize"
                    >
                      {call.status ?? 'unknown'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No calls recorded yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Recent Messages
          </CardTitle>
          <CardDescription>WhatsApp &amp; SMS across all businesses</CardDescription>
        </CardHeader>
        <CardContent>
          {commLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : commLogs && commLogs.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {(commLogs as Array<{ id: string; channel: string; status: string; direction: string; created_at: string }>).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs capitalize">{log.channel}</Badge>
                    <span className="text-sm text-muted-foreground">{log.direction}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={log.status === 'delivered' || log.status === 'sent' ? 'secondary' : 'destructive'}
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
