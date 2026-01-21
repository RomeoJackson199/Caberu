import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Server,
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Trash2,
} from 'lucide-react';

interface TestResult {
  timestamp: string;
  functionName: string;
  status: 'success' | 'error';
  statusCode?: number;
  latency: number;
  response?: unknown;
  error?: string;
}

const AVAILABLE_FUNCTIONS = [
  { name: 'health-check', description: 'System health check', requiresBody: false },
  { name: 'voice-call-ai', description: 'Voice AI conversation', requiresBody: true },
  { name: 'send-email-notification', description: 'Send email', requiresBody: true },
  { name: 'elevenlabs-webhook', description: 'ElevenLabs webhook', requiresBody: true },
  { name: 'make-super-admin', description: 'Grant super admin', requiresBody: true },
  { name: 'get-system-stats', description: 'System statistics', requiresBody: false },
];

const SAMPLE_PAYLOADS: Record<string, string> = {
  'health-check': '{}',
  'voice-call-ai': JSON.stringify({
    message: "Hello, I need to book an appointment",
    caller_phone: "+1234567890",
    business_id: null
  }, null, 2),
  'send-email-notification': JSON.stringify({
    to: "test@example.com",
    subject: "Test Email",
    message: "<p>This is a test email</p>",
    messageType: "system"
  }, null, 2),
  'elevenlabs-webhook': JSON.stringify({
    event_type: "call.started",
    call_id: "test-call-123",
    agent_id: "test-agent"
  }, null, 2),
  'make-super-admin': JSON.stringify({
    email: "user@example.com"
  }, null, 2),
  'get-system-stats': '{}',
};

export function EdgeFunctionTestPanel() {
  const { toast } = useToast();
  const [selectedFunction, setSelectedFunction] = useState<string>('health-check');
  const [payload, setPayload] = useState<string>('{}');
  const [isLoading, setIsLoading] = useState(false);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  const [lastResponse, setLastResponse] = useState<Record<string, unknown> | null>(null);

  const handleFunctionChange = (fn: string) => {
    setSelectedFunction(fn);
    setPayload(SAMPLE_PAYLOADS[fn] || '{}');
    setLastResponse(null);
  };

  const handleTest = async () => {
    setIsLoading(true);
    const start = performance.now();

    try {
      let parsedPayload = {};
      try {
        parsedPayload = JSON.parse(payload);
      } catch {
        toast({
          title: 'Invalid JSON',
          description: 'Please enter valid JSON payload',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke(selectedFunction, {
        body: parsedPayload,
      });

      const latency = Math.round(performance.now() - start);

      if (error) {
        const result: TestResult = {
          timestamp: new Date().toISOString(),
          functionName: selectedFunction,
          status: 'error',
          latency,
          error: error.message,
        };
        setTestHistory(prev => [result, ...prev.slice(0, 9)]);
        setLastResponse({ error: error.message });
        toast({
          title: 'Function Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        const result: TestResult = {
          timestamp: new Date().toISOString(),
          functionName: selectedFunction,
          status: 'success',
          latency,
          response: data,
        };
        setTestHistory(prev => [result, ...prev.slice(0, 9)]);
        setLastResponse(data);
        toast({
          title: 'Success',
          description: `${selectedFunction} completed in ${latency}ms`,
        });
      }
    } catch (err: unknown) {
      const latency = Math.round(performance.now() - start);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const result: TestResult = {
        timestamp: new Date().toISOString(),
        functionName: selectedFunction,
        status: 'error',
        latency,
        error: errorMessage,
      };
      setTestHistory(prev => [result, ...prev.slice(0, 9)]);
      setLastResponse({ error: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const copyResponse = () => {
    if (lastResponse) {
      navigator.clipboard.writeText(JSON.stringify(lastResponse, null, 2));
      toast({ title: 'Copied', description: 'Response copied to clipboard' });
    }
  };

  const clearHistory = () => {
    setTestHistory([]);
    setLastResponse(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5 text-indigo-500" />
          Edge Function Tester
        </CardTitle>
        <CardDescription>
          Interactively test and debug edge functions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Function Selector */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Select Function</Label>
            <Select value={selectedFunction} onValueChange={handleFunctionChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_FUNCTIONS.map((fn) => (
                  <SelectItem key={fn.name} value={fn.name}>
                    <div className="flex items-center gap-2">
                      <span>{fn.name}</span>
                      {fn.requiresBody && (
                        <Badge variant="outline" className="text-xs">requires body</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {AVAILABLE_FUNCTIONS.find(f => f.name === selectedFunction)?.description}
            </p>
          </div>
          
          <div className="flex items-end gap-2">
            <Button
              onClick={handleTest}
              disabled={isLoading}
              className="gap-2 flex-1"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run Test
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={clearHistory}
              title="Clear history"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Payload Editor */}
        <div className="space-y-2">
          <Label>Request Payload (JSON)</Label>
          <Textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            className="font-mono text-sm min-h-[120px]"
            placeholder="{}"
          />
        </div>

        {/* Response Viewer */}
        {lastResponse && (
          <div className="space-y-2">
          <div className="flex items-center justify-between">
              <Label>Response</Label>
              <Button variant="ghost" size="sm" onClick={copyResponse} className="gap-1">
                <Copy className="h-3 w-3" />
                Copy
              </Button>
            </div>
            <pre className="p-4 bg-muted rounded-lg overflow-auto max-h-[200px] text-xs font-mono">
              {typeof lastResponse === 'object' ? JSON.stringify(lastResponse, null, 2) : String(lastResponse)}
            </pre>
          </div>
        )}

        {/* Test History */}
        {testHistory.length > 0 && (
          <div className="space-y-2">
            <Label>Recent Tests</Label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {testHistory.map((test, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 border rounded-lg text-sm"
                >
                  <div className="flex items-center gap-3">
                    {test.status === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <p className="font-mono">{test.functionName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(test.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{test.latency}ms</span>
                    <Badge variant={test.status === 'success' ? 'default' : 'destructive'}>
                      {test.status}
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
