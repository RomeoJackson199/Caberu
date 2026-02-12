import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  Flag,
  Plus,
  Search,
  Settings2,
  History,
  Percent,
  ToggleLeft,
  Pencil,
} from 'lucide-react';

interface FeatureFlag {
  id: string;
  flag_key: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  rollout_percentage: number;
  category: string;
  created_at: string;
  updated_at: string;
}

interface FlagOverride {
  id: string;
  flag_id: string;
  business_id: string;
  is_enabled: boolean;
  reason: string | null;
}

interface ChangelogEntry {
  id: string;
  flag_id: string;
  action: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
}

export function FeatureFlagsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFlag, setNewFlag] = useState({ flag_key: '', name: '', description: '', category: 'general' });
  const [selectedFlagId, setSelectedFlagId] = useState<string | null>(null);

  // Fetch all flags
  const { data: flags, isLoading } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('category', { ascending: true });
      if (error) throw error;
      return data as FeatureFlag[];
    },
  });

  // Fetch changelog
  const { data: changelog } = useQuery({
    queryKey: ['feature-flag-changelog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flag_changelog')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as ChangelogEntry[];
    },
  });

  // Create flag
  const createFlag = useMutation({
    mutationFn: async (flag: typeof newFlag) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('feature_flags').insert({
        flag_key: flag.flag_key,
        name: flag.name,
        description: flag.description || null,
        category: flag.category,
        created_by: userData?.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      setIsCreateOpen(false);
      setNewFlag({ flag_key: '', name: '', description: '', category: 'general' });
      toast({ title: 'Flag created' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  // Toggle flag
  const toggleFlag = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from('feature_flags')
        .update({ is_enabled })
        .eq('id', id);
      if (error) throw error;

      // Log to changelog
      await supabase.from('feature_flag_changelog').insert({
        flag_id: id,
        action: is_enabled ? 'enabled' : 'disabled',
        old_value: { is_enabled: !is_enabled },
        new_value: { is_enabled },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: ['feature-flag-changelog'] });
    },
  });

  // Update rollout
  const updateRollout = useMutation({
    mutationFn: async ({ id, rollout_percentage }: { id: string; rollout_percentage: number }) => {
      const { error } = await supabase
        .from('feature_flags')
        .update({ rollout_percentage })
        .eq('id', id);
      if (error) throw error;

      await supabase.from('feature_flag_changelog').insert({
        flag_id: id,
        action: 'rollout_changed',
        new_value: { rollout_percentage },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: ['feature-flag-changelog'] });
    },
  });

  const filteredFlags = flags?.filter(
    (f) =>
      f.flag_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [...new Set(flags?.map((f) => f.category) || [])];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Feature Flags</h2>
          <p className="text-sm text-muted-foreground">
            Toggle features globally or per-practice
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          New Flag
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search flags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => {
            const categoryFlags = filteredFlags?.filter((f) => f.category === category);
            if (!categoryFlags?.length) return null;

            return (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base capitalize flex items-center gap-2">
                    <Flag className="h-4 w-4" />
                    {category}
                    <Badge variant="secondary" className="text-xs">{categoryFlags.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categoryFlags.map((flag) => (
                      <div
                        key={flag.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{flag.name}</p>
                            <Badge variant="outline" className="text-xs font-mono">{flag.flag_key}</Badge>
                          </div>
                          {flag.description && (
                            <p className="text-xs text-muted-foreground mt-1">{flag.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Percent className="h-3 w-3" />
                            <Select
                              value={String(flag.rollout_percentage)}
                              onValueChange={(v) =>
                                updateRollout.mutate({ id: flag.id, rollout_percentage: Number(v) })
                              }
                            >
                              <SelectTrigger className="h-7 w-20 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[0, 10, 25, 50, 75, 100].map((p) => (
                                  <SelectItem key={p} value={String(p)}>{p}%</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Switch
                            checked={flag.is_enabled}
                            onCheckedChange={(checked) =>
                              toggleFlag.mutate({ id: flag.id, is_enabled: checked })
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {(!filteredFlags || filteredFlags.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              <Flag className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No feature flags yet</p>
              <p className="text-xs">Create your first flag to get started</p>
            </div>
          )}
        </div>
      )}

      {/* Changelog */}
      {changelog && changelog.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              Recent Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {changelog.map((entry) => {
                const flag = flags?.find((f) => f.id === entry.flag_id);
                return (
                  <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                    <div>
                      <span className="font-medium">{flag?.name || 'Unknown'}</span>
                      <span className="text-muted-foreground ml-2">{entry.action}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Feature Flag</DialogTitle>
            <DialogDescription>Add a new feature flag to control feature availability</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Flag Key</Label>
              <Input
                placeholder="e.g., enable_whatsapp_v2"
                value={newFlag.flag_key}
                onChange={(e) => setNewFlag((p) => ({ ...p, flag_key: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                placeholder="e.g., WhatsApp V2 Integration"
                value={newFlag.name}
                onChange={(e) => setNewFlag((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="What does this flag control?"
                value={newFlag.description}
                onChange={(e) => setNewFlag((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newFlag.category} onValueChange={(v) => setNewFlag((p) => ({ ...p, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="communications">Communications</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="ai">AI Features</SelectItem>
                  <SelectItem value="experimental">Experimental</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createFlag.mutate(newFlag)}
              disabled={!newFlag.flag_key || !newFlag.name || createFlag.isPending}
            >
              Create Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
