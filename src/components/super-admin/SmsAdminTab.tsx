import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import {
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  FileText,
  BarChart3,
  AlertCircle,
  Pencil,
  Save,
  X,
} from 'lucide-react';

export function SmsAdminTab() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch SMS logs
  const { data: smsLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['admin-sms-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch SMS templates
  const { data: templates, isLoading: templatesLoading, refetch: refetchTemplates } = useQuery({
    queryKey: ['admin-sms-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_templates')
        .select('*')
        .order('template_key');
      if (error) throw error;
      return data || [];
    },
  });

  // Update template mutation
  const updateTemplate = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      const { error } = await supabase
        .from('sms_templates')
        .update({ template_body: body })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sms-templates'] });
      setEditingTemplate(null);
      toast({ title: 'Template updated', description: 'SMS template saved successfully.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  // Stats
  const stats = {
    total: smsLogs?.length || 0,
    sent: smsLogs?.filter((l: any) => l.status === 'sent').length || 0,
    failed: smsLogs?.filter((l: any) => l.status === 'failed').length || 0,
    skipped: smsLogs?.filter((l: any) => l.status === 'skipped').length || 0,
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchLogs(), refetchTemplates()]);
    setIsRefreshing(false);
  };

  const handleTestSms = async () => {
    if (!testPhone || !testMessage) {
      toast({ title: 'Missing fields', description: 'Enter a phone number and message.', variant: 'destructive' });
      return;
    }
    setTestSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: { to: testPhone, message: testMessage, messageType: 'test' },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: 'SMS Sent!', description: `Test SMS sent to ${testPhone}` });
      } else {
        toast({ title: 'SMS Failed', description: data?.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setTestSending(false);
      refetchLogs();
    }
  };

  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 6) return '***';
    return phone.slice(0, 4) + '****' + phone.slice(-3);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-primary/10 text-primary border-primary/20">Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'skipped':
        return <Badge variant="secondary">Skipped</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">SMS Management</h2>
          <p className="text-sm text-muted-foreground">Monitor SMS delivery, test messages, and manage templates</p>
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
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total SMS</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.sent}</p>
                <p className="text-xs text-muted-foreground">Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{stats.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">
                  {stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">SMS Logs</TabsTrigger>
          <TabsTrigger value="templates">Message Templates</TabsTrigger>
          <TabsTrigger value="test">Send Test</TabsTrigger>
        </TabsList>

        {/* SMS Logs */}
        <TabsContent value="logs">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Recent SMS Messages
              </CardTitle>
              <CardDescription>All outgoing SMS messages (phone numbers masked for privacy)</CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : smsLogs && smsLogs.length > 0 ? (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {smsLogs.map((log: any) => (
                    <div key={log.id} className="flex items-start justify-between p-3 border rounded-lg gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium font-mono">{maskPhone(log.recipient_phone)}</span>
                          <Badge variant="outline" className="text-xs">{log.message_type}</Badge>
                          {statusBadge(log.status)}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{log.message_body}</p>
                        {log.error_message && (
                          <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {log.error_message}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </p>
                        {log.twilio_sid && (
                          <p className="text-xs font-mono text-muted-foreground mt-0.5">
                            {log.twilio_sid.slice(0, 12)}…
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No SMS logs yet. Messages will appear here once SMS is sent.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Default SMS Templates
              </CardTitle>
              <CardDescription>
                Edit the default messages sent for each notification type. Use {'{{date}}'}, {'{{time}}'}, {'{{clinic_name}}'}, {'{{message}}'} as placeholders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : templates && templates.length > 0 ? (
                <div className="space-y-3">
                  {templates.map((tpl: any) => (
                    <div key={tpl.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="text-sm font-semibold">{tpl.template_name}</h4>
                          <p className="text-xs text-muted-foreground">{tpl.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-mono">{tpl.template_key}</Badge>
                          {editingTemplate === tpl.id ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  updateTemplate.mutate({ id: tpl.id, body: editBody });
                                }}
                                disabled={updateTemplate.isPending}
                              >
                                <Save className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingTemplate(null)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingTemplate(tpl.id);
                                setEditBody(tpl.template_body);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {editingTemplate === tpl.id ? (
                        <Textarea
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          className="text-sm font-mono"
                          rows={3}
                        />
                      ) : (
                        <p className="text-sm bg-muted p-2 rounded font-mono">{tpl.template_body}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No templates configured.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test SMS */}
        <TabsContent value="test">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4" />
                Send Test SMS
              </CardTitle>
              <CardDescription>Send a test SMS to verify Twilio integration is working.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-phone">Phone Number (E.164 format)</Label>
                <Input
                  id="test-phone"
                  placeholder="+32467881965"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-message">Message</Label>
                <Textarea
                  id="test-message"
                  placeholder="Hello! This is a test SMS from Caberu."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  rows={3}
                />
              </div>
              <Button onClick={handleTestSms} disabled={testSending || !testPhone || !testMessage}>
                {testSending ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Test SMS
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
