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
import {
  ArrowLeft, Building2, Users, Calendar, Phone, Settings, Bot,
  Mail, Flag, DollarSign, Shield, AlertTriangle, Eye, UserX,
  UserCog, CreditCard, RefreshCw, ToggleLeft, ToggleRight,
  Clock, CheckCircle2, XCircle, Ban,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  useAdminBusinessDetail,
  useUpdateBusinessSettings,
  useAdminBusinessMembers,
  useRemoveBusinessMember,
  useAdminAppointments,
  useAdminPhoneCalls,
  useAdminEncryptionKeys,
  useAdminElevenLabsAgents,
  useAdminChatMessages,
  useToggleBusinessSubscriptionStatus,
  useAdminEmailLogs,
  useAdminFeatureFlags,
  useAdminFeatureFlagOverrides,
  useAdminCreateFlagOverride,
  useUpdateAppointmentStatus,
  useAdminSystemErrors,
  useUpdateBusinessSubscription,
  useAdminSuperAuditLog,
} from '@/hooks/useAdminData';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-700 dark:text-green-400',
  inactive: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
  cancelled: 'bg-red-500/10 text-red-700 dark:text-red-400',
  trial: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
};

const appointmentStatusColors: Record<string, string> = {
  scheduled: 'text-blue-600',
  confirmed: 'text-green-600',
  completed: 'text-gray-600',
  cancelled: 'text-red-600',
  'no-show': 'text-orange-600',
};

export default function AdminBusinessDetail() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { data: biz, isLoading } = useAdminBusinessDetail(businessId || null);
  const { data: members } = useAdminBusinessMembers(businessId || null);
  const { data: allAppointments } = useAdminAppointments({ businessId: businessId || undefined });
  const { data: allPhoneCalls } = useAdminPhoneCalls();
  const { data: encryptionKeys } = useAdminEncryptionKeys();
  const { data: agents } = useAdminElevenLabsAgents();
  const { data: chatMessages } = useAdminChatMessages();
  const { data: emailLogs } = useAdminEmailLogs();
  const { data: featureFlags } = useAdminFeatureFlags();
  const { data: allOverrides } = useAdminFeatureFlagOverrides();
  const { data: systemErrors } = useAdminSystemErrors({ businessId: businessId || undefined });
  const { data: auditLogs } = useAdminSuperAuditLog();
  const updateSettings = useUpdateBusinessSettings();
  const removeMember = useRemoveBusinessMember();
  const toggleStatus = useToggleBusinessSubscriptionStatus();
  const updateAppointmentStatus = useUpdateAppointmentStatus();
  const createFlagOverride = useAdminCreateFlagOverride();
  const updateSubscription = useUpdateBusinessSubscription();

  const [editSettingsOpen, setEditSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});
  const [removingMember, setRemovingMember] = useState<{ id: string; name: string } | null>(null);
  const [statusToggle, setStatusToggle] = useState<{ newStatus: string } | null>(null);
  const [appointmentFilter, setAppointmentFilter] = useState('all');
  const [changingApptStatus, setChangingApptStatus] = useState<{ id: string; currentStatus: string } | null>(null);
  const [newApptStatus, setNewApptStatus] = useState('');
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [subscriptionForm, setSubscriptionForm] = useState({ plan: '', status: '' });
  const [flagOverrideDialog, setFlagOverrideDialog] = useState<{ flagId: string; flagName: string } | null>(null);
  const [flagOverrideEnabled, setFlagOverrideEnabled] = useState(true);

  const bizPhoneCalls = allPhoneCalls?.filter((p) => p.business_id === businessId) || [];
  const bizKeys = encryptionKeys?.filter((k) => k.business_id === businessId) || [];
  const bizAgents = agents?.filter((a) => a.business_id === businessId) || [];
  const bizChat = chatMessages?.filter((c) => c.business_id === businessId) || [];
  const bizEmails = emailLogs?.filter((e) => e.business_id === businessId) || [];
  const bizErrors = systemErrors?.filter((e) => e.business_id === businessId) || [];
  const bizAuditLogs = auditLogs?.filter((l) => l.resource_id === businessId) || [];
  const bizOverrides = allOverrides?.filter((o) => o.business_id === businessId) || [];
  const botMessages = bizChat.filter((c) => c.is_bot).length;
  const humanMessages = bizChat.filter((c) => !c.is_bot).length;

  const filteredAppointments = allAppointments?.filter((a) =>
    appointmentFilter === 'all' ? true : a.status === appointmentFilter
  ) || [];

  const totalCallMinutes = bizPhoneCalls.reduce((sum, p) => sum + (p.duration_seconds || 0) / 60, 0);
  const totalCallCost = totalCallMinutes * 0.10;

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

  function openSubscriptionDialog() {
    setSubscriptionForm({
      plan: biz!.subscription_plan || 'free',
      status: biz!.subscription_status || 'inactive',
    });
    setSubscriptionDialogOpen(true);
  }

  function handleSaveSubscription() {
    if (!businessId) return;
    updateSubscription.mutate({
      businessId,
      subscription_plan: subscriptionForm.plan,
      subscription_status: subscriptionForm.status,
    });
    setSubscriptionDialogOpen(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/practices')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold">{biz.name}</h2>
          <Badge className={statusColors[currentStatus] + ' text-xs'}>
            {currentStatus}
          </Badge>
        </div>
        <div className="sm:ml-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={openSubscriptionDialog}>
            <CreditCard className="h-3.5 w-3.5 mr-1" /> Manage Plan
          </Button>
          <Button variant="outline" size="sm" onClick={openEditSettings}>
            <Settings className="h-3.5 w-3.5 mr-1" /> Edit Settings
          </Button>
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
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="staff">Staff ({members?.length || 0})</TabsTrigger>
          <TabsTrigger value="appointments">Appointments ({allAppointments?.length || 0})</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="calls">Calls ({bizPhoneCalls.length})</TabsTrigger>
          <TabsTrigger value="emails">Emails ({bizEmails.length})</TabsTrigger>
          <TabsTrigger value="ai">AI Config</TabsTrigger>
          <TabsTrigger value="features">Feature Flags</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
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
                {biz.updated_at && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Last Updated</span><span>{format(new Date(biz.updated_at), 'PP')}</span></div>
                )}
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
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Subscription</CardTitle>
                  <Button variant="outline" size="sm" onClick={openSubscriptionDialog}>
                    <CreditCard className="h-3.5 w-3.5 mr-1" /> Change
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="capitalize font-medium">{biz.subscription_plan || 'Free'}</span></div>
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
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
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
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <Mail className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-2xl font-bold">{bizEmails.length}</div>
                    <div className="text-xs text-muted-foreground">Emails Sent</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-2xl font-bold">{bizErrors.length}</div>
                    <div className="text-xs text-muted-foreground">Errors</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alerts for this business */}
            {bizErrors.length > 0 && (
              <Card className="lg:col-span-2 border-orange-200 dark:border-orange-800">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Attention Required
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/30 rounded text-sm">
                    <span>{bizErrors.length} unresolved system error(s)</span>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/admin/system')}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
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
              <CardDescription>Manage team members and their roles within this practice</CardDescription>
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
                        <TableCell className="font-medium">
                          <button
                            className="hover:underline text-left"
                            onClick={() => navigate(`/admin/users/${m.profile_id}`)}
                          >
                            {m.profile_name}
                          </button>
                        </TableCell>
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
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/admin/users/${m.profile_id}`)}
                              title="View user details"
                            >
                              <UserCog className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setRemovingMember({ id: m.id, name: m.profile_name })}
                              title="Remove from business"
                            >
                              <UserX className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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

        {/* Appointments Tab - Enhanced with filters and status management */}
        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-base">Appointments ({filteredAppointments.length})</CardTitle>
                <Select value={appointmentFilter} onValueChange={setAppointmentFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no-show">No Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {/* Appointment status summary */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                {['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'].map((status) => {
                  const count = allAppointments?.filter((a) => a.status === status).length || 0;
                  const icons: Record<string, typeof Clock> = {
                    scheduled: Clock,
                    confirmed: CheckCircle2,
                    completed: CheckCircle2,
                    cancelled: XCircle,
                    'no-show': Ban,
                  };
                  const Icon = icons[status] || Clock;
                  return (
                    <button
                      key={status}
                      className={`p-2 rounded-lg border text-center text-xs transition-colors ${
                        appointmentFilter === status ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setAppointmentFilter(appointmentFilter === status ? 'all' : status)}
                    >
                      <Icon className={`h-4 w-4 mx-auto mb-1 ${appointmentStatusColors[status] || ''}`} />
                      <div className="font-medium">{count}</div>
                      <div className="capitalize text-muted-foreground">{status}</div>
                    </button>
                  );
                })}
              </div>

              {filteredAppointments.length > 0 ? (
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
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments.slice(0, 50).map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>{a.patient_name || 'Unknown'}</TableCell>
                          <TableCell>{a.dentist_name || 'N/A'}</TableCell>
                          <TableCell className="text-sm">
                            {a.appointment_date ? format(new Date(a.appointment_date), 'PPp') : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs capitalize ${appointmentStatusColors[a.status || ''] || ''}`}>
                              {a.status || 'unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{a.booking_source || 'N/A'}</TableCell>
                          <TableCell className="text-sm">{a.duration_minutes ? `${a.duration_minutes}m` : 'N/A'}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setChangingApptStatus({ id: a.id, currentStatus: a.status || 'scheduled' });
                                setNewApptStatus(a.status || 'scheduled');
                              }}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
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

        {/* Billing Tab */}
        <TabsContent value="billing">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Subscription Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Current Plan</span><span className="capitalize font-medium">{biz.subscription_plan || 'Free'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={statusColors[currentStatus]}>{currentStatus}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Stripe Connected</span><Badge variant={biz.stripe_account_id ? 'default' : 'secondary'}>{biz.stripe_account_id ? 'Yes' : 'No'}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Charges Enabled</span><span>{biz.stripe_charges_enabled ? 'Yes' : 'No'}</span></div>
                {biz.stripe_account_id && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Stripe ID</span><span className="font-mono text-xs">{biz.stripe_account_id}</span></div>
                )}
                <Separator />
                <Button variant="outline" size="sm" className="w-full" onClick={openSubscriptionDialog}>
                  <CreditCard className="h-3.5 w-3.5 mr-1" /> Change Subscription
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Usage & Costs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <Phone className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-lg font-bold">{Math.round(totalCallMinutes)}m</div>
                    <div className="text-xs text-muted-foreground">Call Minutes</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <DollarSign className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-lg font-bold">&euro;{totalCallCost.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">Call Costs</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <Mail className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-lg font-bold">{bizEmails.length}</div>
                    <div className="text-xs text-muted-foreground">Emails Sent</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <Bot className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-lg font-bold">{bizChat.length}</div>
                    <div className="text-xs text-muted-foreground">AI Messages</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Phone Calls Tab */}
        <TabsContent value="calls">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Phone Calls ({bizPhoneCalls.length})</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Total: {Math.round(totalCallMinutes)}m | &euro;{totalCallCost.toFixed(2)}
                </div>
              </div>
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
                          <TableCell>&euro;{costEur.toFixed(2)}</TableCell>
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

        {/* Emails Tab */}
        <TabsContent value="emails">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email Logs ({bizEmails.length})</CardTitle>
              <CardDescription>All emails sent from this practice</CardDescription>
            </CardHeader>
            <CardContent>
              {bizEmails.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bizEmails.slice(0, 50).map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm">
                          {e.sent_at ? format(new Date(e.sent_at), 'PPp') : 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm">{e.recipient_email || 'N/A'}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{e.subject || 'N/A'}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{e.email_type || 'N/A'}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={e.status === 'sent' ? 'default' : 'secondary'} className="text-xs">
                            {e.status || 'unknown'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No email logs found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Config Tab */}
        <TabsContent value="ai">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ElevenLabs Agents</CardTitle>
              </CardHeader>
              <CardContent>
                {bizAgents.length > 0 ? (
                  <div className="space-y-3">
                    {bizAgents.map((a) => (
                      <div key={a.id} className="border rounded-lg p-3 space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Agent Name</span><span className="font-medium">{a.agent_name || 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Agent ID</span><span className="font-mono text-xs">{a.agent_id || 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Voice ID</span><span className="font-mono text-xs">{a.voice_id || 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Active</span><Badge variant={a.is_active ? 'default' : 'secondary'}>{a.is_active ? 'Yes' : 'No'}</Badge></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No ElevenLabs agents configured.</p>
                )}
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

        {/* Feature Flags Tab */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Flag className="h-4 w-4" /> Feature Flags for {biz.name}
              </CardTitle>
              <CardDescription>Override global feature flags for this specific business</CardDescription>
            </CardHeader>
            <CardContent>
              {featureFlags && featureFlags.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feature</TableHead>
                      <TableHead>Global Status</TableHead>
                      <TableHead>Override</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {featureFlags.map((flag) => {
                      const override = bizOverrides.find((o) => o.flag_id === flag.id);
                      return (
                        <TableRow key={flag.id}>
                          <TableCell>
                            <div className="font-medium">{flag.name}</div>
                            <div className="text-xs text-muted-foreground">{flag.description || flag.flag_key}</div>
                          </TableCell>
                          <TableCell>
                            {flag.is_enabled ? (
                              <Badge className="bg-green-500/10 text-green-700">Enabled</Badge>
                            ) : (
                              <Badge variant="secondary">Disabled</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {override ? (
                              <Badge className={override.is_enabled
                                ? 'bg-green-500/10 text-green-700'
                                : 'bg-red-500/10 text-red-700'
                              }>
                                {override.is_enabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">No override</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setFlagOverrideDialog({ flagId: flag.id, flagName: flag.name });
                                setFlagOverrideEnabled(override?.is_enabled ?? flag.is_enabled);
                              }}
                            >
                              {override ? (
                                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                              ) : (
                                <ToggleLeft className="h-3.5 w-3.5 mr-1" />
                              )}
                              {override ? 'Update' : 'Override'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No feature flags configured.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Encryption Keys
                </CardTitle>
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

          </div>
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity Log</CardTitle>
              <CardDescription>Admin actions related to this business</CardDescription>
            </CardHeader>
            <CardContent>
              {bizAuditLogs.length > 0 ? (
                <div className="space-y-2">
                  {bizAuditLogs.slice(0, 30).map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 text-sm">
                      <div className="p-1 rounded bg-muted shrink-0 mt-0.5">
                        <Shield className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{log.action}</div>
                        <div className="text-xs text-muted-foreground">
                          {log.resource_type} &middot; {format(new Date(log.created_at), 'PPp')}
                        </div>
                        {log.details && (
                          <div className="text-xs text-muted-foreground mt-1 font-mono bg-muted/30 p-1 rounded">
                            {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No activity logs found for this business.</p>
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

      {/* Subscription Change Dialog */}
      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Subscription</DialogTitle>
            <DialogDescription>Update the subscription plan and status for {biz.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Plan</label>
              <Select value={subscriptionForm.plan} onValueChange={(v) => setSubscriptionForm({ ...subscriptionForm, plan: v })}>
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
              <label className="text-sm font-medium">Status</label>
              <Select value={subscriptionForm.status} onValueChange={(v) => setSubscriptionForm({ ...subscriptionForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubscriptionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSubscription} disabled={updateSubscription.isPending}>Update Subscription</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appointment Status Change Dialog */}
      <Dialog open={!!changingApptStatus} onOpenChange={(open) => !open && setChangingApptStatus(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Appointment Status</DialogTitle>
            <DialogDescription>Update the status for this appointment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">New Status</label>
              <Select value={newApptStatus} onValueChange={setNewApptStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no-show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangingApptStatus(null)}>Cancel</Button>
            <Button
              disabled={newApptStatus === changingApptStatus?.currentStatus}
              onClick={() => {
                if (changingApptStatus) {
                  updateAppointmentStatus.mutate({
                    appointmentId: changingApptStatus.id,
                    status: newApptStatus,
                  });
                  setChangingApptStatus(null);
                }
              }}
            >
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feature Flag Override Dialog */}
      <Dialog open={!!flagOverrideDialog} onOpenChange={(open) => !open && setFlagOverrideDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Feature Flag Override</DialogTitle>
            <DialogDescription>
              Set a business-specific override for &quot;{flagOverrideDialog?.flagName}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <span className="text-sm font-medium">Enabled for this business</span>
              <Button
                variant={flagOverrideEnabled ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFlagOverrideEnabled(!flagOverrideEnabled)}
              >
                {flagOverrideEnabled ? (
                  <><ToggleRight className="h-4 w-4 mr-1" /> On</>
                ) : (
                  <><ToggleLeft className="h-4 w-4 mr-1" /> Off</>
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagOverrideDialog(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (flagOverrideDialog && businessId) {
                  createFlagOverride.mutate({
                    flag_id: flagOverrideDialog.flagId,
                    business_id: businessId,
                    is_enabled: flagOverrideEnabled,
                  });
                  setFlagOverrideDialog(null);
                }
              }}
            >
              Save Override
            </Button>
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
