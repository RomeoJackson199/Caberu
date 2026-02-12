import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Slider } from '@/components/ui/slider';
import { Plus, Flag, History, Settings2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  useAdminFeatureFlags,
  useAdminCreateFeatureFlag,
  useAdminUpdateFeatureFlag,
  useAdminFeatureFlagOverrides,
  useAdminCreateFlagOverride,
  useAdminFeatureFlagChangelog,
  useAdminBusinesses,
} from '@/hooks/useAdminData';

export default function AdminFeatureFlags() {
  const { data: flags, isLoading } = useAdminFeatureFlags();
  const { data: overrides } = useAdminFeatureFlagOverrides();
  const { data: changelog } = useAdminFeatureFlagChangelog();
  const { data: businesses } = useAdminBusinesses();
  const createFlag = useAdminCreateFeatureFlag();
  const updateFlag = useAdminUpdateFeatureFlag();
  const createOverride = useAdminCreateFlagOverride();

  const [showCreate, setShowCreate] = useState(false);
  const [newFlag, setNewFlag] = useState({ flag_key: '', name: '', description: '', category: '', rollout_percentage: 0 });

  const [showOverride, setShowOverride] = useState(false);
  const [overrideData, setOverrideData] = useState({ flag_id: '', business_id: '', is_enabled: true, reason: '' });

  function handleCreateFlag() {
    createFlag.mutate(newFlag);
    setShowCreate(false);
    setNewFlag({ flag_key: '', name: '', description: '', category: '', rollout_percentage: 0 });
  }

  function handleCreateOverride() {
    createOverride.mutate(overrideData);
    setShowOverride(false);
    setOverrideData({ flag_id: '', business_id: '', is_enabled: true, reason: '' });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Feature Flags</h2>
          <p className="text-sm text-muted-foreground">Manage feature flags, rollout percentages, and per-business overrides</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Flag
        </Button>
      </div>

      <Tabs defaultValue="flags" className="space-y-4">
        <TabsList>
          <TabsTrigger value="flags" className="gap-1.5"><Flag className="h-3.5 w-3.5" />Flags ({flags?.length || 0})</TabsTrigger>
          <TabsTrigger value="overrides" className="gap-1.5"><Settings2 className="h-3.5 w-3.5" />Overrides ({overrides?.length || 0})</TabsTrigger>
          <TabsTrigger value="changelog" className="gap-1.5"><History className="h-3.5 w-3.5" />Changelog ({changelog?.length || 0})</TabsTrigger>
        </TabsList>

        {/* Feature Flags */}
        <TabsContent value="flags">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? <div className="flex justify-center py-8"><LoadingSpinner /></div> : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Key</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Enabled</TableHead>
                        <TableHead>Rollout %</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flags && flags.length > 0 ? flags.map((flag) => (
                        <TableRow key={flag.id}>
                          <TableCell className="font-mono text-sm">{flag.flag_key}</TableCell>
                          <TableCell className="font-medium">{flag.name}</TableCell>
                          <TableCell><Badge variant="outline">{flag.category || 'general'}</Badge></TableCell>
                          <TableCell>
                            <Switch
                              checked={flag.is_enabled}
                              onCheckedChange={(checked) =>
                                updateFlag.mutate({ flagId: flag.id, updates: { is_enabled: checked } })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <Slider
                                value={[flag.rollout_percentage || 0]}
                                max={100}
                                step={5}
                                className="w-20"
                                onValueCommit={([val]) =>
                                  updateFlag.mutate({ flagId: flag.id, updates: { rollout_percentage: val } })
                                }
                              />
                              <span className="text-xs text-muted-foreground w-8">{flag.rollout_percentage || 0}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(flag.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => {
                                setOverrideData({ ...overrideData, flag_id: flag.id });
                                setShowOverride(true);
                              }}
                            >
                              + Override
                            </Button>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No feature flags</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overrides */}
        <TabsContent value="overrides">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Per-Business Overrides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Flag</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Enabled</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overrides && overrides.length > 0 ? overrides.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-sm">{o.flag_id?.slice(0, 8)}...</TableCell>
                        <TableCell>{o.business_name || o.business_id?.slice(0, 8)}</TableCell>
                        <TableCell><Badge variant={o.is_enabled ? 'default' : 'secondary'}>{o.is_enabled ? 'On' : 'Off'}</Badge></TableCell>
                        <TableCell className="text-sm">{o.reason || 'N/A'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No overrides</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Changelog */}
        <TabsContent value="changelog">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Changelog</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Flag</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Changes</TableHead>
                      <TableHead>Changed By</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changelog && changelog.length > 0 ? changelog.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-mono text-sm">{entry.flag_id?.slice(0, 8)}...</TableCell>
                        <TableCell><Badge variant="outline">{entry.action}</Badge></TableCell>
                        <TableCell className="text-xs max-w-[300px]">
                          {entry.new_value ? (
                            <pre className="bg-muted p-1 rounded text-xs overflow-hidden max-h-[60px]">
                              {JSON.stringify(entry.new_value, null, 1)}
                            </pre>
                          ) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{entry.changed_by?.slice(0, 8) || 'N/A'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No changelog entries</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Flag Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Feature Flag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Flag Key</label>
              <Input placeholder="e.g. enable_voice_ai" value={newFlag.flag_key} onChange={(e) => setNewFlag({ ...newFlag, flag_key: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input placeholder="Display name" value={newFlag.name} onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input placeholder="Optional description" value={newFlag.description} onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Input placeholder="e.g. ai, billing, ui" value={newFlag.category} onChange={(e) => setNewFlag({ ...newFlag, category: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rollout Percentage: {newFlag.rollout_percentage}%</label>
              <Slider
                value={[newFlag.rollout_percentage]}
                max={100}
                step={5}
                onValueChange={([val]) => setNewFlag({ ...newFlag, rollout_percentage: val })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreateFlag} disabled={!newFlag.flag_key || !newFlag.name || createFlag.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Override Dialog */}
      <Dialog open={showOverride} onOpenChange={setShowOverride}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Business Override</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Business</label>
              <Select value={overrideData.business_id} onValueChange={(v) => setOverrideData({ ...overrideData, business_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select business" /></SelectTrigger>
                <SelectContent>
                  {businesses?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Enabled</label>
              <Switch checked={overrideData.is_enabled} onCheckedChange={(v) => setOverrideData({ ...overrideData, is_enabled: v })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <Input placeholder="Why this override?" value={overrideData.reason} onChange={(e) => setOverrideData({ ...overrideData, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverride(false)}>Cancel</Button>
            <Button onClick={handleCreateOverride} disabled={!overrideData.business_id || !overrideData.flag_id || createOverride.isPending}>Create Override</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
