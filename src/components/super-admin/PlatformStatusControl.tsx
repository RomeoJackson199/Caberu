import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe, Save } from 'lucide-react';

export function PlatformStatusControl() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ['platform-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_status')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({
    overall_status: 'operational',
    status_message: '',
    show_banner: false,
    banner_message: '',
    banner_severity: 'info',
  });

  useEffect(() => {
    if (status) {
      setForm({
        overall_status: status.overall_status || 'operational',
        status_message: status.status_message || '',
        show_banner: status.show_banner || false,
        banner_message: status.banner_message || '',
        banner_severity: status.banner_severity || 'info',
      });
    }
  }, [status]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!status?.id) return;
      const { error } = await supabase
        .from('platform_status')
        .update({
          overall_status: form.overall_status,
          status_message: form.status_message || null,
          show_banner: form.show_banner,
          banner_message: form.banner_message || null,
          banner_severity: form.banner_severity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', status.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-status'] });
      toast({ title: 'Platform status updated' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  if (isLoading) return <LoadingSpinner size="sm" />;

  const statusColors: Record<string, string> = {
    operational: 'text-green-500',
    degraded: 'text-yellow-500',
    partial_outage: 'text-orange-500',
    major_outage: 'text-red-500',
    maintenance: 'text-blue-500',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Platform Status & Banner Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Overall Status</Label>
            <Select value={form.overall_status} onValueChange={(v) => setForm({ ...form, overall_status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operational">✅ Operational</SelectItem>
                <SelectItem value="degraded">⚠️ Degraded Performance</SelectItem>
                <SelectItem value="partial_outage">🟠 Partial Outage</SelectItem>
                <SelectItem value="major_outage">🔴 Major Outage</SelectItem>
                <SelectItem value="maintenance">🔧 Under Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status Message</Label>
            <Input
              value={form.status_message}
              onChange={(e) => setForm({ ...form, status_message: e.target.value })}
              placeholder="All systems operational"
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center gap-3 mb-3">
            <Switch
              checked={form.show_banner}
              onCheckedChange={(v) => setForm({ ...form, show_banner: v })}
            />
            <Label className="text-sm font-medium">Show Global Error/Info Banner</Label>
          </div>
          {form.show_banner && (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>Banner Message</Label>
                <Input
                  value={form.banner_message}
                  onChange={(e) => setForm({ ...form, banner_message: e.target.value })}
                  placeholder="We're experiencing elevated error rates..."
                />
              </div>
              <div>
                <Label>Banner Severity</Label>
                <Select value={form.banner_severity} onValueChange={(v) => setForm({ ...form, banner_severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">ℹ️ Info</SelectItem>
                    <SelectItem value="warning">⚠️ Warning</SelectItem>
                    <SelectItem value="error">❌ Error</SelectItem>
                    <SelectItem value="critical">🚨 Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <Button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {updateMutation.isPending ? 'Saving...' : 'Save Status'}
        </Button>
      </CardContent>
    </Card>
  );
}
