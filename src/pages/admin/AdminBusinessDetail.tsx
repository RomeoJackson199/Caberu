import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ArrowLeft, Building2, Users, Calendar, Phone, Settings, Bot } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  useAdminBusinessDetail,
  useUpdateBusinessSettings,
  useAdminBusinessMembers,
  useRemoveBusinessMember,
  useAdminAppointments,
  useAdminPhoneCalls,
  useAdminEncryptionKeys,
  
  useAdminChatMessages,
  useToggleBusinessSubscriptionStatus,
} from '@/hooks/useAdminData';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-700 dark:text-green-400',
  inactive: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
  cancelled: 'bg-red-500/10 text-red-700 dark:text-red-400',
  trial: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
};

export default function AdminBusinessDetail() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { data: biz, isLoading } = useAdminBusinessDetail(businessId || null);
  const { data: members } = useAdminBusinessMembers(businessId || null);
  const { data: allAppointments } = useAdminAppointments({ businessId: businessId || undefined });
  const { data: allPhoneCalls } = useAdminPhoneCalls();
  const { data: encryptionKeys } = useAdminEncryptionKeys();
  
  const { data: chatMessages } = useAdminChatMessages();
  const updateSettings = useUpdateBusinessSettings();
  const removeMember = useRemoveBusinessMember();
  const toggleStatus = useToggleBusinessSubscriptionStatus();

  const [editSettingsOpen, setEditSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});
  const [removingMember, setRemovingMember] = useState<{ id: string; name: string } | null>(null);
  const [statusToggle, setStatusToggle] = useState<{ newStatus: string } | null>(null);

  const bizPhoneCalls = allPhoneCalls?.filter((p) => p.business_id === businessId) || [];
  const bizKeys = encryptionKeys?.filter((k) => k.business_id === businessId) || [];
  
  const bizChat = chatMessages?.filter((c) => c.business_id === businessId) || [];
  const botMessages = bizChat.filter((c) => c.is_bot).length;
  const humanMessages = bizChat.filter((c) => !c.is_bot).length;

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><LoadingSpinner /></div>;
  }

  if (!biz) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/practices')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Practices
        </Button>
        <p className="text-muted-foreground">Business not found.</p>
      </div>
    );
  }

  const currentStatus = biz.subscription_status || 'inactive';

  function openEditSettings() {
    setSettingsForm({
      name: biz!.name || '',
      slug: biz!.slug || '',
      subscription_plan: biz!.subscription_plan || 'free',
      subscription_status: biz!.subscription_status || 'inactive',
      subscription_ends_at: biz!.subscription_ends_at?.split('T')[0] || '',
      specialty_type: biz!.specialty_type || '',
    });
    setEditSettingsOpen(true);
  }

  function handleSaveSettings() {
    if (!businessId) return;
    const updates: Record<string, unknown> = {};
    if (settingsForm.name && settingsForm.name !== biz!.name) updates.name = settingsForm.name;
    if (settingsForm.slug && settingsForm.slug !== biz!.slug) updates.slug = settingsForm.slug;
    if (settingsForm.subscription_plan !== biz!.subscription_plan) updates.subscription_plan = settingsForm.subscription_plan;
    if (settingsForm.subscription_status !== biz!.subscription_status) updates.subscription_status = settingsForm.subscription_status;
    if (settingsForm.subscription_ends_at) updates.subscription_ends_at = settingsForm.subscription_ends_at;
    if (settingsForm.specialty_type !== (biz!.specialty_type || '')) updates.specialty_type = settingsForm.specialty_type || null;

    if (Object.keys(updates).length > 0) {
      updateSettings.mutate({ businessId, updates });
    }
    setEditSettingsOpen(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/practices')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Building2 className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-xl font-bold">{biz.name}</h2>
        <Badge className={statusColors[currentStatus] + ' text-xs'}>
          {currentStatus}
        </Badge>
        <div className="ml-auto flex gap-2">
          {currentStatus === 'active' ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setStatusToggle({ newStatus: 'inactive' })}
            >
              Deactivate
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => setStatusToggle({ newStatus: 'active' })}
            >
              Activate
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="staff">Staff & Members</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="calls">Phone Calls</TabsTrigger>
          <TabsTrigger value="ai">AI Config</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Business Information</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Slug</span><span>/{biz.slug}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Specialty</span><span>{biz.specialty_type || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span>{biz.address || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{biz.phone || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span>{biz.currency || 'EUR'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{format(new Date(biz.created_at), 'PP')}</span></div>
                {biz.primary_color && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Brand Color</span>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded" style={{ backgroundColor: biz.primary_color }} />
                      <span>{biz.primary_color}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Subscription</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="capitalize">{biz.subscription_plan || 'Free'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={statusColors[currentStatus]}>{currentStatus}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Started</span><span>{biz.subscription_started_at ? format(new Date(biz.subscription_started_at), 'PP') : 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ends</span><span>{biz.subscription_ends_at ? format(new Date(biz.subscription_ends_at), 'PP') : 'N/A'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Stripe Account</span><span className="text-xs font-mono">{biz.stripe_account_id || 'Not connected'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Charges Enabled</span><span>{biz.stripe_charges_enabled ? 'Yes' : 'No'}</span></div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Quick Stats</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-2xl font-bold">{members?.length || 0}</div>
                    <div className="text-xs text-muted-foreground">Members</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-2xl font-bold">{allAppointments?.length || 0}</div>
                    <div className="text-xs text-muted-foreground">Appointments</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <Phone className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-2xl font-bold">{bizPhoneCalls.length}</div>
                    <div className="text-xs text-muted-foreground">Phone Calls</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <Bot className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-2xl font-bold">{bizChat.length}</div>
                    <div className="text-xs text-muted-foreground">Chat Messages</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Business Settings</CardTitle>
              <Button variant="outline" size="sm" onClick={openEditSettings}>
                <Settings className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span>{biz.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Slug</span><span>/{biz.slug}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Subscription Plan</span><span className="capitalize">{biz.subscription_plan || 'Free'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Subscription Status</span><Badge className={statusColors[currentStatus]}>{currentStatus}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Subscription Ends</span><span>{biz.subscription_ends_at ? format(new Date(biz.subscription_ends_at), 'PP') : 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Specialty Type</span><span>{biz.specialty_type || 'N/A'}</span></div>
              {biz.logo_url && (
                <div className="flex justify-between items-center"><span className="text-muted-foreground">Logo</span><img src={biz.logo_url} alt="Logo" className="h-8 w-8 rounded" /></div>
              )}
              {biz.primary_color && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Primary Color</span>
                  <div className="flex items-center gap-2"><div className="h-4 w-4 rounded" style={{ backgroundColor: biz.primary_color }} /><span>{biz.primary_color}</span></div>
                </div>
              )}
              {biz.secondary_color && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Secondary Color</span>
                  <div className="flex items-center gap-2"><div className="h-4 w-4 rounded" style={{ backgroundColor: biz.secondary_color }} /><span>{biz.secondary_color}</span></div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff & Members Tab */}
        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Staff & Members ({members?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {members && members.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.profile_name}</TableCell>
                        <TableCell className="text-sm">{m.profile_email || 'N/A'}</TableCell>
                        <TableCell><Badge variant="outline">{m.role || 'member'}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={m.is_active ? 'default' : 'secondary'}>
                            {m.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setRemovingMember({ id: m.id, name: m.profile_name })}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No members found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appointments ({allAppointments?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {allAppointments && allAppointments.length > 0 ? (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Dentist</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allAppointments.slice(0, 50).map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>{a.patient_name || 'Unknown'}</TableCell>
                          <TableCell>{a.dentist_name || 'N/A'}</TableCell>
                          <TableCell className="text-sm">
                            {a.appointment_date ? format(new Date(a.appointment_date), 'PPp') : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">{a.status || 'unknown'}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{a.booking_source || 'N/A'}</TableCell>
                          <TableCell className="text-sm">{a.duration_minutes ? `${a.duration_minutes}m` : 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No appointments found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Phone Calls Tab */}
        <TabsContent value="calls">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Phone Calls ({bizPhoneCalls.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {bizPhoneCalls.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Caller</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bizPhoneCalls.map((p) => {
                      const costEur = p.duration_seconds ? (p.duration_seconds / 60) * 0.10 : 0;
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm">
                            {p.call_started_at ? format(new Date(p.call_started_at), 'PPp') : 'N/A'}
                          </TableCell>
                          <TableCell>{p.caller_phone || 'Unknown'}</TableCell>
                          <TableCell>
                            {p.duration_seconds ? `${Math.round(p.duration_seconds / 60 * 10) / 10}m` : 'N/A'}
                          </TableCell>
                          <TableCell>{costEur > 0 ? `€${costEur.toFixed(2)}` : '€0.00'}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{p.call_type || 'N/A'}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No phone calls found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Config Tab */}
        <TabsContent value="ai">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Voice AI Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Voice AI is managed externally via the Fastify server.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Chat Messages Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-2xl font-bold">{bizChat.length}</div>
                    <div className="text-xs text-muted-foreground">Total Messages</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-2xl font-bold">{botMessages}</div>
                    <div className="text-xs text-muted-foreground">Bot Messages</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-2xl font-bold">{humanMessages}</div>
                    <div className="text-xs text-muted-foreground">Human Messages</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Encryption Keys</CardTitle>
              <CardDescription>From admin_encryption_key_status view (actual keys are never exposed)</CardDescription>
            </CardHeader>
            <CardContent>
              {bizKeys.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Rotated</TableHead>
                      <TableHead>Expires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bizKeys.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell>{k.key_version}</TableCell>
                        <TableCell><Badge variant={k.is_active ? 'default' : 'secondary'}>{k.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                        <TableCell>{format(new Date(k.created_at), 'PP')}</TableCell>
                        <TableCell>{k.rotated_at ? format(new Date(k.rotated_at), 'PP') : 'Never'}</TableCell>
                        <TableCell>{k.expires_at ? format(new Date(k.expires_at), 'PP') : 'No expiry'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No encryption keys found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Settings Dialog */}
      <Dialog open={editSettingsOpen} onOpenChange={setEditSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Business Settings</DialogTitle>
            <DialogDescription>Update business configuration. Changes are logged.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Name</label>
              <Input value={settingsForm.name || ''} onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Slug</label>
              <Input value={settingsForm.slug || ''} onChange={(e) => setSettingsForm({ ...settingsForm, slug: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Subscription Plan</label>
              <Select value={settingsForm.subscription_plan || ''} onValueChange={(v) => setSettingsForm({ ...settingsForm, subscription_plan: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="promo">Promo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Subscription Status</label>
              <Select value={settingsForm.subscription_status || ''} onValueChange={(v) => setSettingsForm({ ...settingsForm, subscription_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Subscription Ends At</label>
              <Input type="date" value={settingsForm.subscription_ends_at || ''} onChange={(e) => setSettingsForm({ ...settingsForm, subscription_ends_at: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Specialty Type</label>
              <Input value={settingsForm.specialty_type || ''} onChange={(e) => setSettingsForm({ ...settingsForm, specialty_type: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSettingsOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings} disabled={updateSettings.isPending}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!removingMember} onOpenChange={(open) => !open && setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removingMember?.name} from this business? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (removingMember && businessId) {
                  removeMember.mutate({ memberId: removingMember.id, businessId });
                  setRemovingMember(null);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Toggle Confirmation */}
      <AlertDialog open={!!statusToggle} onOpenChange={(open) => !open && setStatusToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusToggle?.newStatus === 'active' ? 'Activate' : 'Deactivate'} Business
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {statusToggle?.newStatus === 'active' ? 'activate' : 'deactivate'} {biz.name}?
              {statusToggle?.newStatus === 'inactive' && ' This will prevent users from accessing the business.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={statusToggle?.newStatus === 'inactive' ? 'bg-destructive text-destructive-foreground' : ''}
              onClick={() => {
                if (statusToggle && businessId) {
                  toggleStatus.mutate({
                    businessId,
                    newStatus: statusToggle.newStatus,
                    oldStatus: currentStatus,
                    businessName: biz.name,
                  });
                  setStatusToggle(null);
                }
              }}
            >
              {statusToggle?.newStatus === 'active' ? 'Activate' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
