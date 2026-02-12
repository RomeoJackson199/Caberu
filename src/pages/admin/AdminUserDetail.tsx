import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ArrowLeft, Save } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  useAdminUserDetail,
  useUpdateUserProfile,
  useAddUserRole,
  useRemoveUserRole,
  useAdminBusinesses,
} from '@/hooks/useAdminData';

const APP_ROLES = ['admin', 'provider', 'customer', 'staff', 'patient', 'waiter', 'cook', 'host', 'manager', 'super_admin'];

function getUserDisplayName(user: { first_name: string | null; last_name: string | null; email: string | null }) {
  const name = [user.first_name, user.last_name].filter((s) => s && s.trim()).join(' ');
  return name || user.email || 'Unknown';
}

export default function AdminUserDetail() {
  const { profileId } = useParams<{ profileId: string }>();
  const navigate = useNavigate();
  const { data: user, isLoading } = useAdminUserDetail(profileId || null);
  const { data: businesses } = useAdminBusinesses();
  const updateProfile = useUpdateUserProfile();
  const addRole = useAddUserRole();
  const removeRole = useRemoveUserRole();

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [addRoleValue, setAddRoleValue] = useState('');
  const [removingRole, setRemovingRole] = useState<string | null>(null);
  const [addRoleOpen, setAddRoleOpen] = useState(false);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><LoadingSpinner /></div>;
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Users
        </Button>
        <p className="text-muted-foreground">User not found.</p>
      </div>
    );
  }

  function openEditProfile() {
    setForm({
      first_name: user!.first_name || '',
      last_name: user!.last_name || '',
      email: user!.email || '',
      role: user!.role || '',
      patient_status: user!.patient_status || '',
      onboarding_completed: user!.onboarding_completed ? 'true' : 'false',
      business_id: user!.business_id || '',
    });
    setEditOpen(true);
  }

  function handleSaveProfile() {
    if (!profileId) return;
    const updates: Record<string, unknown> = {};
    if (form.first_name !== (user!.first_name || '')) updates.first_name = form.first_name || null;
    if (form.last_name !== (user!.last_name || '')) updates.last_name = form.last_name || null;
    if (form.email !== (user!.email || '')) updates.email = form.email || null;
    if (form.role !== (user!.role || '')) updates.role = form.role || null;
    if (form.patient_status !== (user!.patient_status || '')) updates.patient_status = form.patient_status || null;
    if ((form.onboarding_completed === 'true') !== !!user!.onboarding_completed) updates.onboarding_completed = form.onboarding_completed === 'true';
    if (form.business_id !== (user!.business_id || '')) updates.business_id = form.business_id || null;

    if (Object.keys(updates).length > 0) {
      updateProfile.mutate({ profileId, updates });
    }
    setEditOpen(false);
  }

  const availableRoles = APP_ROLES.filter((r) => !user.roles.includes(r));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h2 className="text-xl font-bold">{getUserDisplayName(user)}</h2>
        {!user.user_id && (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
            Imported (no account)
          </Badge>
        )}
        {user.user_id && user.onboarding_completed === false && (
          <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-400">
            Incomplete onboarding
          </Badge>
        )}
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="memberships">Business Memberships</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Profile Information</CardTitle>
              <Button variant="outline" size="sm" onClick={openEditProfile}>
                <Save className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Profile ID</span><span className="font-mono text-xs">{user.id}</span></div>
              {user.user_id && (
                <div className="flex justify-between"><span className="text-muted-foreground">User ID (auth)</span><span className="font-mono text-xs">{user.user_id}</span></div>
              )}
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">First Name</span><span>{user.first_name || 'Not set'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Last Name</span><span>{user.last_name || 'Not set'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{user.email || 'Not set'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{user.phone || 'Not set'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Profile Role</span><span>{user.role || 'None'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Patient Status</span><span>{user.patient_status || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Onboarding</span><span>{user.onboarding_completed ? 'Completed' : 'Not completed'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Business</span><span>{user.business_name || 'None'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Member Since</span><span>{format(new Date(user.created_at), 'PPP')}</span></div>
              {user.updated_at && (
                <div className="flex justify-between"><span className="text-muted-foreground">Last Updated</span><span>{formatDistanceToNow(new Date(user.updated_at), { addSuffix: true })}</span></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">System Roles</CardTitle>
              {user.user_id && (
                <Button variant="outline" size="sm" onClick={() => setAddRoleOpen(true)}>
                  Add Role
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!user.user_id ? (
                <p className="text-sm text-muted-foreground">This user has no auth account. Roles cannot be managed for invited users.</p>
              ) : user.roles.length > 0 ? (
                <div className="space-y-2">
                  {user.roles.map((role) => (
                    <div key={role} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{role}</Badge>
                        {role === 'super_admin' && (
                          <span className="text-xs text-destructive font-medium">Full platform access</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setRemovingRole(role)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No system roles assigned.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Memberships Tab */}
        <TabsContent value="memberships">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business Memberships</CardTitle>
            </CardHeader>
            <CardContent>
              {user.memberships && user.memberships.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {user.memberships.map((m) => (
                      <TableRow
                        key={m.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/admin/practices/${m.business_id}`)}
                      >
                        <TableCell className="font-medium">{m.business_name}</TableCell>
                        <TableCell><Badge variant="outline">{m.role || 'member'}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={m.is_active ? 'default' : 'secondary'}>
                            {m.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">Not a member of any business.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Account Type:</span>
                {user.user_id ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-700">Registered</Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700">Imported (no account)</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Onboarding:</span>
                {user.onboarding_completed ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-700">Completed</Badge>
                ) : (
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-700">Incomplete</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Member since:</span>
                <span className="text-sm">{format(new Date(user.created_at), 'PPP')}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update user profile. Changes are logged.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">First Name</label>
                <Input value={form.first_name || ''} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Last Name</label>
                <Input value={form.last_name || ''} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Profile Role</label>
              <Select value={form.role || ''} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="provider">Provider</SelectItem>
                  <SelectItem value="dentist">Dentist</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Patient Status</label>
              <Select value={form.patient_status || ''} onValueChange={(v) => setForm({ ...form, patient_status: v })}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="discharged">Discharged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Onboarding Completed</label>
              <Select value={form.onboarding_completed || 'false'} onValueChange={(v) => setForm({ ...form, onboarding_completed: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Business</label>
              <Select value={form.business_id || ''} onValueChange={(v) => setForm({ ...form, business_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select business" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {businesses?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Role Dialog */}
      <Dialog open={addRoleOpen} onOpenChange={setAddRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Role</DialogTitle>
            <DialogDescription>Assign a new system role to this user.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Select value={addRoleValue} onValueChange={setAddRoleValue}>
              <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
              <SelectContent>
                {availableRoles.map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {addRoleValue === 'super_admin' && (
              <p className="text-sm text-destructive font-medium">
                Warning: Granting super_admin gives full platform access to this user.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddRoleOpen(false); setAddRoleValue(''); }}>Cancel</Button>
            <Button
              onClick={() => {
                if (addRoleValue && user.user_id && profileId) {
                  addRole.mutate({ userId: user.user_id, role: addRoleValue, profileId });
                  setAddRoleOpen(false);
                  setAddRoleValue('');
                }
              }}
              disabled={!addRoleValue || addRole.isPending}
            >
              Add Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Role Confirmation */}
      <AlertDialog open={!!removingRole} onOpenChange={(open) => !open && setRemovingRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the &quot;{removingRole}&quot; role from {getUserDisplayName(user)}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (removingRole && user.user_id && profileId) {
                  removeRole.mutate({ userId: user.user_id, role: removingRole, profileId });
                  setRemovingRole(null);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
