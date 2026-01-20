import { useState, useEffect } from 'react';
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
  AlertTriangle,
  Download,
  Activity,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';

interface TestResult {
  status: 'idle' | 'running' | 'success' | 'warning' | 'error';
  message?: string;
  latency?: number;
  details?: Record<string, any>;
  timestamp?: string;
}

interface DiagnosticResults {
  database: TestResult;
  edgeFunctions: TestResult;
  auth: TestResult;
  storage: TestResult;
  realtime: TestResult;
  system: TestResult;
}

interface HealthCheckHistory {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  overall_latency_ms: number;
}

export function DiagnosticsCard() {
  const { toast } = useToast();
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [overallStatus, setOverallStatus] = useState<'healthy' | 'degraded' | 'unhealthy' | null>(null);
  const [history, setHistory] = useState<HealthCheckHistory[]>([]);
  const [results, setResults] = useState<DiagnosticResults>({
    database: { status: 'idle' },
    edgeFunctions: { status: 'idle' },
    auth: { status: 'idle' },
    storage: { status: 'idle' },
    realtime: { status: 'idle' },
    system: { status: 'idle' },
  });

  const updateResult = (key: keyof DiagnosticResults, result: TestResult) => {
    setResults(prev => ({
      ...prev,
      [key]: { ...result, timestamp: new Date().toISOString() }
    }));
  };

  const testDatabase = async () => {
    updateResult('database', { status: 'running' });
    const start = performance.now();

    try {
      // Run multiple database operations to thoroughly test
      const [selectTest, countTest] = await Promise.all([
        supabase.from('businesses').select('id').limit(1),
        supabase.from('businesses').select('*', { count: 'exact', head: true }),
      ]);

      const latency = Math.round(performance.now() - start);

      if (selectTest.error) throw selectTest.error;

      const status = latency > 1000 ? 'warning' : 'success';
      updateResult('database', {
        status,
        message: latency > 1000 ? 'Responding slowly' : 'Connection successful',
        latency,
        details: {
          operations_tested: 2,
          warning_threshold: '1000ms',
        },
      });
      return status !== 'error';
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

      // Parse the comprehensive health check response
      const healthData = data;
      const dbLatency = healthData?.checks?.database?.latency_ms || 0;
      const overallLatency = healthData?.overall_latency_ms || latency;

      const status = healthData?.status === 'healthy' ? 'success' :
                     healthData?.status === 'degraded' ? 'warning' : 'error';

      updateResult('edgeFunctions', {
        status,
        message: `${healthData?.status || 'unknown'} (DB: ${dbLatency}ms)`,
        latency: overallLatency,
        details: {
          version: healthData?.version,
          checks_performed: Object.keys(healthData?.checks || {}).length,
          overall_status: healthData?.status,
        },
      });

      // Update overall status based on edge function health check
      setOverallStatus(healthData?.status || 'degraded');

      return status !== 'error';
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

      const status = latency > 1500 ? 'warning' : 'success';
      updateResult('auth', {
        status,
        message: data.session ? 'Authenticated' : 'Service available',
        latency,
        details: {
          session_active: !!data.session,
          warning_threshold: '1500ms',
        },
      });
      return status !== 'error';
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

      const bucketCount = data?.length || 0;
      const status = latency > 2000 ? 'warning' : 'success';

      updateResult('storage', {
        status,
        message: `${bucketCount} bucket${bucketCount !== 1 ? 's' : ''} available`,
        latency,
        details: {
          buckets: data?.map(b => b.name) || [],
          warning_threshold: '2000ms',
        },
      });
      return status !== 'error';
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
      const channel = supabase.channel('diagnostics-test-' + Date.now());

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

      const status = latency > 3000 ? 'warning' : 'success';
      updateResult('realtime', {
        status,
        message: 'WebSocket connected',
        latency,
        details: {
          connection_type: 'websocket',
          warning_threshold: '3000ms',
        },
      });
      return status !== 'error';
    } catch (error: any) {
      updateResult('realtime', {
        status: 'error',
        message: error.message || 'Realtime unavailable',
      });
      return false;
    }
  };

  const testSystem = async () => {
    updateResult('system', { status: 'running' });
    const start = performance.now();

    try {
      // Test system resources and client performance
      const memoryInfo = (performance as any).memory;
      const connectionInfo = (navigator as any).connection;

      const systemInfo = {
        memory_used_mb: memoryInfo ? Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) : null,
        memory_limit_mb: memoryInfo ? Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024) : null,
        connection_type: connectionInfo?.effectiveType || 'unknown',
        downlink_mbps: connectionInfo?.downlink || null,
      };

      const latency = Math.round(performance.now() - start);

      // Determine status based on memory usage
      let status: 'success' | 'warning' | 'error' = 'success';
      let message = 'System resources normal';

      if (memoryInfo && systemInfo.memory_limit_mb) {
        const memoryUsagePercent = (systemInfo.memory_used_mb! / systemInfo.memory_limit_mb) * 100;
        if (memoryUsagePercent > 80) {
          status = 'warning';
          message = 'High memory usage detected';
        }
      }

      updateResult('system', {
        status,
        message,
        latency,
        details: systemInfo,
      });
      return status !== 'error';
    } catch (error: any) {
      updateResult('system', {
        status: 'warning',
        message: 'Could not retrieve system info',
      });
      return false;
    }
  };

  const runAllTests = async () => {
    setIsRunningAll(true);
    setLastCheckTime(new Date());

    const testResults = await Promise.all([
      testDatabase(),
      testEdgeFunctions(),
      testAuth(),
      testStorage(),
      testRealtime(),
      testSystem(),
    ]);

    const passedCount = testResults.filter(Boolean).length;
    const totalTests = testResults.length;

    // Determine overall status
    const allPassed = passedCount === totalTests;
    const criticalFailed = !testResults[0] || !testResults[2]; // Database or Auth failed

    const status: 'healthy' | 'degraded' | 'unhealthy' =
      allPassed ? 'healthy' : criticalFailed ? 'unhealthy' : 'degraded';

    setOverallStatus(status);

    // Add to history
    setHistory(prev => [
      {
        timestamp: new Date().toISOString(),
        status,
        overall_latency_ms: Object.values(results).reduce((sum, r) => sum + (r.latency || 0), 0) / totalTests,
      },
      ...prev.slice(0, 9), // Keep last 10 checks
    ]);

    toast({
      title: allPassed ? 'All Systems Healthy ✓' :
             criticalFailed ? 'Critical Issues Detected' :
             'Some Issues Detected',
      description: `${passedCount}/${totalTests} tests passed`,
      variant: allPassed ? 'default' : 'destructive',
    });

    setIsRunningAll(false);
  };

  const exportHealthData = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      overall_status: overallStatus,
      last_check: lastCheckTime?.toISOString(),
      results,
      history,
      system_info: {
        user_agent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-check-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Health Data Exported',
      description: 'System health data has been downloaded',
    });
  };

  const tests = [
    {
      key: 'database' as const,
      label: 'Database',
      icon: Database,
      color: 'text-blue-500',
      description: 'PostgreSQL connectivity and query performance',
      testFn: testDatabase,
    },
    {
      key: 'edgeFunctions' as const,
      label: 'Edge Functions',
      icon: Server,
      color: 'text-purple-500',
      description: 'Serverless functions and API endpoints',
      testFn: testEdgeFunctions,
    },
    {
      key: 'auth' as const,
      label: 'Authentication',
      icon: Zap,
      color: 'text-yellow-500',
      description: 'Auth service and session management',
      testFn: testAuth,
    },
    {
      key: 'storage' as const,
      label: 'Storage',
      icon: HardDrive,
      color: 'text-green-500',
      description: 'Object storage and file buckets',
      testFn: testStorage,
    },
    {
      key: 'realtime' as const,
      label: 'Realtime',
      icon: Wifi,
      color: 'text-cyan-500',
      description: 'WebSocket connectivity and subscriptions',
      testFn: testRealtime,
    },
    {
      key: 'system' as const,
      label: 'System Resources',
      icon: Activity,
      color: 'text-orange-500',
      description: 'Client resources and performance',
      testFn: testSystem,
    },
  ];

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (result: TestResult) => {
    if (result.status === 'idle') {
      return <Badge variant="outline" className="text-xs">Not tested</Badge>;
    }
    if (result.status === 'running') {
      return <Badge variant="secondary" className="text-xs">Testing...</Badge>;
    }
    if (result.status === 'success') {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
          {result.latency}ms
        </Badge>
      );
    }
    if (result.status === 'warning') {
      return (
        <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">
          {result.latency ? `${result.latency}ms` : 'Warning'}
        </Badge>
      );
    }
    return <Badge variant="destructive" className="text-xs">Failed</Badge>;
  };

  const getOverallStatusBadge = () => {
    if (!overallStatus) return null;

    switch (overallStatus) {
      case 'healthy':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            All Systems Healthy
          </Badge>
        );
      case 'degraded':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Degraded Performance
          </Badge>
        );
      case 'unhealthy':
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            Critical Issues
          </Badge>
        );
    }
  };

  // Auto-run tests on mount
  useEffect(() => {
    runAllTests();
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Diagnostics
              {getOverallStatusBadge()}
            </CardTitle>
            <CardDescription>
              Comprehensive health monitoring for all system components
            </CardDescription>
            {lastCheckTime && (
              <p className="text-xs text-muted-foreground">
                Last checked: {format(lastCheckTime, 'PPpp')}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={exportHealthData}
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={!lastCheckTime}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              onClick={runAllTests}
              disabled={isRunningAll}
              size="sm"
              className="gap-2"
            >
              {isRunningAll ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Run All Tests
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tests.map(({ key, label, icon: Icon, color, description, testFn }) => {
            const result = results[key];
            return (
              <div
                key={key}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-lg bg-accent mt-1`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{label}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={testFn}
                        disabled={result.status === 'running'}
                      >
                        Test
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{description}</p>
                    {result.message && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {result.message}
                      </p>
                    )}
                    {result.details && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          View details
                        </summary>
                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {getStatusBadge(result)}
                  {getStatusIcon(result.status)}
                </div>
              </div>
            );
          })}
        </div>

        {history.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Recent Health Checks</h4>
            </div>
            <div className="space-y-2">
              {history.slice(0, 5).map((check, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground">
                    {format(new Date(check.timestamp), 'PPpp')}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{Math.round(check.overall_latency_ms)}ms</span>
                    <Badge
                      variant="outline"
                      className={
                        check.status === 'healthy' ? 'border-green-500/20 text-green-600' :
                        check.status === 'degraded' ? 'border-yellow-500/20 text-yellow-600' :
                        'border-red-500/20 text-red-600'
                      }
                    >
                      {check.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
