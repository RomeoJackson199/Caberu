import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
  Clock,
  Plus,
  Play,
  Square,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  XCircle,
} from 'lucide-react';

interface DowntimeForm {
  title: string;
  description: string;
  reason: string;
  severity: string;
  affected_services: string;
  scheduled_start: string;
  scheduled_end: string;
  notify_users: boolean;
  is_public: boolean;
}

const defaultForm: DowntimeForm = {
  title: '',
  description: '',
  reason: '',
  severity: 'maintenance',
  affected_services: '',
  scheduled_start: '',
  scheduled_end: '',
  notify_users: true,
  is_public: true,
};

export function DowntimeManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<DowntimeForm>(defaultForm);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: downtimes, isLoading } = useQuery({
    queryKey: ['scheduled-downtimes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_downtimes')
        .select('*')
        .order('scheduled_start', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: DowntimeForm) => {
      const { error } = await supabase.from('scheduled_downtimes').insert({
        title: formData.title,
        description: formData.description || null,
        reason: formData.reason || null,
        severity: formData.severity,
        affected_services: formData.affected_services
          ? formData.affected_services.split(',').map((s) => s.trim())
          : [],
        scheduled_start: formData.scheduled_start,
        scheduled_end: formData.scheduled_end,
        notify_users: formData.notify_users,
        is_public: formData.is_public,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-downtimes'] });
      queryClient.invalidateQueries({ queryKey: ['platform-status'] });
      toast({ title: 'Downtime scheduled', description: 'The maintenance window has been created.' });
      setDialogOpen(false);
      setForm(defaultForm);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, actual_start, actual_end }: { id: string; status: string; actual_start?: string; actual_end?: string }) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (actual_start) updates.actual_start = actual_start;
      if (actual_end) updates.actual_end = actual_end;
      const { error } = await supabase.from('scheduled_downtimes').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-downtimes'] });
      toast({ title: 'Status updated' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('scheduled_downtimes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-downtimes'] });
      toast({ title: 'Downtime deleted' });
    },
  });

  const severityConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    maintenance: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: <Wrench className="h-3 w-3" /> },
    partial: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: <AlertTriangle className="h-3 w-3" /> },
    major: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: <XCircle className="h-3 w-3" /> },
    critical: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: <XCircle className="h-3 w-3" /> },
  };

  const statusConfig: Record<string, string> = {
    scheduled: 'outline',
    in_progress: 'destructive',
    completed: 'secondary',
    cancelled: 'secondary',
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Scheduled Downtimes
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              Schedule Downtime
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Schedule Maintenance Downtime</DialogTitle>
              <DialogDescription>
                Create a scheduled maintenance window. Users will be notified if enabled.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Database Migration v2.5"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What will happen during this downtime..."
                  rows={2}
                />
              </div>
              <div>
                <Label>Reason</Label>
                <Input
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="e.g. Performance optimization, security patch..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Severity</Label>
                  <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="partial">Partial Outage</SelectItem>
                      <SelectItem value="major">Major Outage</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Affected Services</Label>
                  <Input
                    value={form.affected_services}
                    onChange={(e) => setForm({ ...form, affected_services: e.target.value })}
                    placeholder="database, api, auth"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Time *</Label>
                  <Input
                    type="datetime-local"
                    value={form.scheduled_start}
                    onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Time (Estimated) *</Label>
                  <Input
                    type="datetime-local"
                    value={form.scheduled_end}
                    onChange={(e) => setForm({ ...form, scheduled_end: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={form.notify_users} onCheckedChange={(v) => setForm({ ...form, notify_users: v })} />
                  <Label className="text-sm">Notify Users</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: v })} />
                  <Label className="text-sm">Show on Status Page</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.title || !form.scheduled_start || !form.scheduled_end || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Schedule Downtime'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : downtimes && downtimes.length > 0 ? (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {downtimes.map((dt: any) => {
              const sev = severityConfig[dt.severity] || severityConfig.maintenance;
              const isActive = dt.status === 'in_progress';
              const isUpcoming = dt.status === 'scheduled' && isFuture(new Date(dt.scheduled_start));

              return (
                <div
                  key={dt.id}
                  className={`p-3 border rounded-lg ${isActive ? 'border-destructive bg-destructive/5' : ''} ${dt.status === 'completed' || dt.status === 'cancelled' ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm">{dt.title}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sev.color}`}>
                          {sev.icon}
                          {dt.severity}
                        </span>
                        <Badge variant={statusConfig[dt.status] as any || 'secondary'} className="text-xs">
                          {dt.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      {dt.reason && <p className="text-xs text-muted-foreground mb-1">Reason: {dt.reason}</p>}
                      {dt.description && <p className="text-xs text-muted-foreground mb-1">{dt.description}</p>}
                      <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                        <span>
                          {format(new Date(dt.scheduled_start), 'MMM d, HH:mm')} → {format(new Date(dt.scheduled_end), 'MMM d, HH:mm')}
                        </span>
                        {dt.affected_services?.length > 0 && (
                          <span>Services: {dt.affected_services.join(', ')}</span>
                        )}
                        {isUpcoming && (
                          <span className="text-primary">
                            Starts {formatDistanceToNow(new Date(dt.scheduled_start), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {dt.status === 'scheduled' && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          title="Start downtime"
                          onClick={() => updateStatusMutation.mutate({ id: dt.id, status: 'in_progress', actual_start: new Date().toISOString() })}
                        >
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {dt.status === 'in_progress' && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          title="Complete downtime"
                          onClick={() => updateStatusMutation.mutate({ id: dt.id, status: 'completed', actual_end: new Date().toISOString() })}
                        >
                          <Square className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {(dt.status === 'scheduled' || dt.status === 'in_progress') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          title="Cancel"
                          onClick={() => updateStatusMutation.mutate({ id: dt.id, status: 'cancelled' })}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {(dt.status === 'completed' || dt.status === 'cancelled') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground"
                          title="Delete"
                          onClick={() => deleteMutation.mutate(dt.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No scheduled downtimes</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
