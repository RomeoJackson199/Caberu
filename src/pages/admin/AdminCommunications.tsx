import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Phone, MessageSquare, Mail, Lock } from 'lucide-react';
import { format } from 'date-fns';
import {
  useAdminPhoneCalls,
  useAdminChatMessages,
  useAdminMessages,
  useAdminEmailLogs,
} from '@/hooks/useAdminData';

const formatDuration = (seconds: number | null) => {
  if (!seconds) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

const formatCents = (cents: number | null) => {
  if (cents === null || cents === undefined) return 'N/A';
  return new Intl.NumberFormat('de-BE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
};

export default function AdminCommunications() {
  const { data: phoneCalls, isLoading: phoneLoading } = useAdminPhoneCalls();
  const { data: chatMessages, isLoading: chatLoading } = useAdminChatMessages();
  const { data: messages, isLoading: msgLoading } = useAdminMessages();
  const { data: emailLogs, isLoading: emailLoading } = useAdminEmailLogs();
  

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Communications</h2>
        <p className="text-sm text-muted-foreground">Monitor all communication channels across practices</p>
      </div>

      <Tabs defaultValue="phone" className="space-y-4">
        <TabsList>
          <TabsTrigger value="phone" className="gap-1.5"><Phone className="h-3.5 w-3.5" />Phone Calls</TabsTrigger>
          <TabsTrigger value="chat" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" />Chat</TabsTrigger>
          <TabsTrigger value="messages" className="gap-1.5"><Mail className="h-3.5 w-3.5" />Messages</TabsTrigger>
          <TabsTrigger value="email" className="gap-1.5"><Mail className="h-3.5 w-3.5" />Email Logs</TabsTrigger>
          
        </TabsList>

        {/* Phone Calls */}
        <TabsContent value="phone">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Phone Calls ({phoneCalls?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {phoneLoading ? <div className="flex justify-center py-8"><LoadingSpinner /></div> : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Caller</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Billable</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Transcript</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {phoneCalls && phoneCalls.length > 0 ? phoneCalls.map((call) => (
                        <TableRow key={call.id}>
                          <TableCell className="font-medium">{call.business_name || 'N/A'}</TableCell>
                          <TableCell><Badge variant="outline">{call.call_type || 'unknown'}</Badge></TableCell>
                          <TableCell className="text-sm">{call.caller_phone || 'N/A'}</TableCell>
                          <TableCell>{formatDuration(call.duration_seconds)}</TableCell>
                          <TableCell>{formatCents(call.cost_cents)}</TableCell>
                          <TableCell>{call.is_billable ? 'Yes' : 'No'}</TableCell>
                          <TableCell className="text-sm">
                            {call.call_started_at ? format(new Date(call.call_started_at), 'PP p') : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {call.transcript ? <Badge variant="outline" className="text-xs">Available</Badge> : 'None'}
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No phone calls found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat Messages */}
        <TabsContent value="chat">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chat Messages ({chatMessages?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {chatLoading ? <div className="flex justify-center py-8"><LoadingSpinner /></div> : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Session</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead>Sender</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {chatMessages && chatMessages.length > 0 ? chatMessages.map((msg) => (
                        <TableRow key={msg.id}>
                          <TableCell className="text-xs font-mono">{msg.session_id?.slice(0, 8)}...</TableCell>
                          <TableCell>{msg.business_name || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={msg.is_bot ? 'default' : 'secondary'}>
                              {msg.is_bot ? 'Bot' : 'User'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            <span className="flex items-center gap-1"><Lock className="h-3 w-3" />{msg.message || '[Encrypted]'}</span>
                          </TableCell>
                          <TableCell><Badge variant="outline">{msg.message_type || 'text'}</Badge></TableCell>
                          <TableCell className="text-sm">{format(new Date(msg.created_at), 'PP p')}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No chat messages found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages */}
        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Internal Messages ({messages?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {msgLoading ? <div className="flex justify-center py-8"><LoadingSpinner /></div> : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sender</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Read</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messages && messages.length > 0 ? messages.map((msg) => (
                        <TableRow key={msg.id}>
                          <TableCell className="font-medium">{msg.sender_name || 'N/A'}</TableCell>
                          <TableCell>{msg.recipient_name || 'N/A'}</TableCell>
                          <TableCell className="text-sm">{msg.business_name || 'N/A'}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            <span className="flex items-center gap-1"><Lock className="h-3 w-3" />{msg.message_text || '[Encrypted]'}</span>
                          </TableCell>
                          <TableCell>{msg.is_read ? 'Yes' : 'No'}</TableCell>
                          <TableCell className="text-sm">{format(new Date(msg.created_at), 'PP p')}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No messages found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Logs */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email Logs ({emailLogs?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {emailLoading ? <div className="flex justify-center py-8"><LoadingSpinner /></div> : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailLogs && emailLogs.length > 0 ? emailLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{log.business_name || 'N/A'}</TableCell>
                          <TableCell>{log.recipient_email}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{log.subject || 'N/A'}</TableCell>
                          <TableCell><Badge variant="outline">{log.email_type || 'N/A'}</Badge></TableCell>
                          <TableCell><Badge variant={log.status === 'sent' ? 'default' : 'secondary'}>{log.status || 'unknown'}</Badge></TableCell>
                          <TableCell className="text-sm">{log.sent_at ? format(new Date(log.sent_at), 'PP p') : 'Pending'}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No email logs found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
