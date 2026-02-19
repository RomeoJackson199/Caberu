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
  PhoneCall,
  PhoneOff,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface PhoneUsageRecord {
  id: string;
  business_id: string;
  call_id: string;
  agent_id: string | null;
  call_started_at: string;
  call_ended_at: string | null;
  duration_seconds: number | null;
  caller_phone: string | null;
  call_type: string | null;
  is_billable: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}


export function VoiceAIStatusCard() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch recent calls
  const { data: recentCalls, isLoading: callsLoading, refetch: refetchCalls } = useQuery({
    queryKey: ['super-admin-phone-usage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phone_usage')
        .select('*')
        .order('call_started_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as PhoneUsageRecord[];
    },
  });


  // Calculate stats
  const stats = {
    totalCalls: recentCalls?.length || 0,
    successfulCalls: recentCalls?.filter(c => c.duration_seconds && c.duration_seconds > 30)?.length || 0,
    failedCalls: recentCalls?.filter(c => !c.duration_seconds || c.duration_seconds < 10)?.length || 0,
    totalMinutes: (recentCalls?.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) || 0) / 60,
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchCalls();
    setIsRefreshing(false);
  };

  const getCallStatusBadge = (call: PhoneUsageRecord) => {
    if (!call.duration_seconds || call.duration_seconds < 10) {
      return <Badge variant="destructive" className="text-xs">Failed</Badge>;
    }
    if (call.duration_seconds < 30) {
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">Short</Badge>;
    }
    return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">Success</Badge>;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatPhoneNumber = (phone: string | null) => {
    if (!phone) return 'Unknown';
    // Mask middle digits for privacy
    if (phone.length > 6) {
      return phone.slice(0, 3) + '***' + phone.slice(-3);
    }
    return phone;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-purple-500" />
              Voice AI Status
            </CardTitle>
            <CardDescription>
              Voice AI phone call monitoring
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg bg-accent/50">
            <div className="flex items-center gap-2 mb-2">
              <PhoneCall className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Recent Calls</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalCalls}</p>
            <p className="text-xs text-muted-foreground">
              {stats.successfulCalls} successful, {stats.failedCalls} failed
            </p>
          </div>
          
          <div className="p-4 border rounded-lg bg-accent/50">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Total Duration</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalMinutes.toFixed(1)}m</p>
            <p className="text-xs text-muted-foreground">
              In last 10 calls
            </p>
          </div>
          
        </div>

        {/* Recent Calls */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <PhoneCall className="h-4 w-4" />
            Recent Call Logs
          </h4>
          {callsLoading ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner size="sm" />
            </div>
          ) : recentCalls && recentCalls.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentCalls.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      call.duration_seconds && call.duration_seconds > 30
                        ? 'bg-green-500/10'
                        : call.duration_seconds && call.duration_seconds > 0
                        ? 'bg-yellow-500/10'
                        : 'bg-red-500/10'
                    }`}>
                      {call.duration_seconds && call.duration_seconds > 30 ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : call.duration_seconds && call.duration_seconds > 0 ? (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <PhoneOff className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {formatPhoneNumber(call.caller_phone)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {call.call_started_at
                          ? formatDistanceToNow(new Date(call.call_started_at), { addSuffix: true })
                          : 'Unknown time'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">
                      {formatDuration(call.duration_seconds)}
                    </span>
                    {getCallStatusBadge(call)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent phone calls
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
