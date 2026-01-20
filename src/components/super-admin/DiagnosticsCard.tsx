import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Database,
  Mail,
  Server,
  Wifi,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
} from 'lucide-react';

interface TestResult {
  status: 'idle' | 'running' | 'success' | 'error';
  message?: string;
  latency?: number;
}

interface DiagnosticResults {
  database: TestResult;
  edgeFunctions: TestResult;
  auth: TestResult;
  storage: TestResult;
  realtime: TestResult;
}

export function DiagnosticsCard() {
  const { toast } = useToast();
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [results, setResults] = useState<DiagnosticResults>({
    database: { status: 'idle' },
    edgeFunctions: { status: 'idle' },
    auth: { status: 'idle' },
    storage: { status: 'idle' },
    realtime: { status: 'idle' },
  });

  const updateResult = (key: keyof DiagnosticResults, result: TestResult) => {
    setResults(prev => ({ ...prev, [key]: result }));
  };

  const testDatabase = async () => {
    updateResult('database', { status: 'running' });
    const start = performance.now();
    
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('count')
        .limit(1);
      
      const latency = Math.round(performance.now() - start);
      
      if (error) throw error;
      
      updateResult('database', {
        status: 'success',
        message: 'Connection successful',
        latency,
      });
      return true;
    } catch (error: any) {
      updateResult('database', {
        status: 'error',
        message: error.message || 'Connection failed',
      });
      return false;
    }
  };

  const testEdgeFunctions = async () => {
    updateResult('edgeFunctions', { status: 'running' });
    const start = performance.now();
    
    try {
      const { data, error } = await supabase.functions.invoke('health-check');
      const latency = Math.round(performance.now() - start);
      
      if (error) throw error;
      
      updateResult('edgeFunctions', {
        status: 'success',
        message: `Healthy (DB: ${data?.db_latency_ms || 0}ms)`,
        latency,
      });
      return true;
    } catch (error: any) {
      updateResult('edgeFunctions', {
        status: 'error',
        message: error.message || 'Edge functions unavailable',
      });
      return false;
    }
  };

  const testAuth = async () => {
    updateResult('auth', { status: 'running' });
    const start = performance.now();
    
    try {
      const { data, error } = await supabase.auth.getSession();
      const latency = Math.round(performance.now() - start);
      
      if (error) throw error;
      
      updateResult('auth', {
        status: 'success',
        message: data.session ? 'Authenticated' : 'No session',
        latency,
      });
      return true;
    } catch (error: any) {
      updateResult('auth', {
        status: 'error',
        message: error.message || 'Auth service error',
      });
      return false;
    }
  };

  const testStorage = async () => {
    updateResult('storage', { status: 'running' });
    const start = performance.now();
    
    try {
      const { data, error } = await supabase.storage.listBuckets();
      const latency = Math.round(performance.now() - start);
      
      if (error) throw error;
      
      updateResult('storage', {
        status: 'success',
        message: `${data?.length || 0} buckets available`,
        latency,
      });
      return true;
    } catch (error: any) {
      updateResult('storage', {
        status: 'error',
        message: error.message || 'Storage service error',
      });
      return false;
    }
  };

  const testRealtime = async () => {
    updateResult('realtime', { status: 'running' });
    const start = performance.now();
    
    try {
      // Create a temporary channel to test realtime
      const channel = supabase.channel('diagnostics-test');
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          channel.unsubscribe();
          reject(new Error('Connection timeout'));
        }, 5000);
        
        channel
          .on('presence', { event: 'sync' }, () => {
            clearTimeout(timeout);
            resolve();
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              clearTimeout(timeout);
              resolve();
            } else if (status === 'CHANNEL_ERROR') {
              clearTimeout(timeout);
              reject(new Error('Channel error'));
            }
          });
      });
      
      const latency = Math.round(performance.now() - start);
      await channel.unsubscribe();
      
      updateResult('realtime', {
        status: 'success',
        message: 'WebSocket connected',
        latency,
      });
      return true;
    } catch (error: any) {
      updateResult('realtime', {
        status: 'error',
        message: error.message || 'Realtime unavailable',
      });
      return false;
    }
  };

  const runAllTests = async () => {
    setIsRunningAll(true);
    
    const testResults = await Promise.all([
      testDatabase(),
      testEdgeFunctions(),
      testAuth(),
      testStorage(),
      testRealtime(),
    ]);
    
    const passedCount = testResults.filter(Boolean).length;
    
    toast({
      title: passedCount === testResults.length ? 'All Systems Healthy' : 'Issues Detected',
      description: `${passedCount}/${testResults.length} tests passed`,
      variant: passedCount === testResults.length ? 'default' : 'destructive',
    });
    
    setIsRunningAll(false);
  };

  const tests = [
    { key: 'database' as const, label: 'Database', icon: Database, color: 'text-blue-500' },
    { key: 'edgeFunctions' as const, label: 'Edge Functions', icon: Server, color: 'text-purple-500' },
    { key: 'auth' as const, label: 'Authentication', icon: Zap, color: 'text-yellow-500' },
    { key: 'storage' as const, label: 'Storage', icon: HardDrive, color: 'text-green-500' },
    { key: 'realtime' as const, label: 'Realtime', icon: Wifi, color: 'text-cyan-500' },
  ];

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (result: TestResult) => {
    if (result.status === 'idle') {
      return <Badge variant="outline">Not tested</Badge>;
    }
    if (result.status === 'running') {
      return <Badge variant="secondary">Testing...</Badge>;
    }
    if (result.status === 'success') {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
          {result.latency}ms
        </Badge>
      );
    }
    return <Badge variant="destructive">Failed</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Diagnostics
            </CardTitle>
            <CardDescription>
              Test connectivity and performance of all system components
            </CardDescription>
          </div>
          <Button onClick={runAllTests} disabled={isRunningAll} className="gap-2">
            {isRunningAll ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Run All Tests
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tests.map(({ key, label, icon: Icon, color }) => {
            const result = results[key];
            return (
              <div
                key={key}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-accent`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <div>
                    <p className="font-medium">{label}</p>
                    {result.message && (
                      <p className="text-xs text-muted-foreground">{result.message}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(result)}
                  {getStatusIcon(result.status)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
