import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Search, UserCog, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAdminUsers, useAdminUpdateUserRole } from '@/hooks/useAdminData';
import { useAdminBusinesses } from '@/hooks/useAdminData';

const roleColors: Record<string, string> = {
  super_admin: 'bg-red-500/10 text-red-700 dark:text-red-400',
  admin: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  provider: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  dentist: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  staff: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  patient: 'bg-green-500/10 text-green-700 dark:text-green-400',
  customer: 'bg-green-500/10 text-green-700 dark:text-green-400',
};

const APP_ROLES = ['admin', 'provider', 'customer', 'staff', 'patient', 'dentist', 'manager', 'super_admin'];
const PAGE_SIZE = 20;

function getUserDisplayName(user: { first_name: string | null; last_name: string | null; email: string | null }) {
  const name = [user.first_name, user.last_name].filter((s) => s && s.trim()).join(' ');
  return name || user.email || 'Unknown';
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterBiz, setFilterBiz] = useState<string>('');
  const [page, setPage] = useState(0);
  const { data: users, isLoading, error } = useAdminUsers({
    search: search || undefined,
    role: filterRole && filterRole !== 'all' ? filterRole : undefined,
    businessId: filterBiz && filterBiz !== 'all' ? filterBiz : undefined,
  });
  const { data: businesses } = useAdminBusinesses();
  const updateRole = useAdminUpdateUserRole();
  const [editingUser, setEditingUser] = useState<{ userId: string; currentRole: string; name: string } | null>(null);
  const [newRole, setNewRole] = useState('');

  const totalPages = Math.ceil((users?.length || 0) / PAGE_SIZE);
  const paginatedUsers = users?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleSaveRole() {
    if (!editingUser || !newRole) return;
    updateRole.mutate({ userId: editingUser.userId, role: newRole });
    setEditingUser(null);
    setNewRole('');
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">User Management</h2>
        <p className="text-sm text-muted-foreground">View profiles, manage roles, and filter by business</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Users ({users?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-10"
              />
            </div>
            <Select value={filterRole} onValueChange={(v) => { setFilterRole(v); setPage(0); }}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="All roles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {APP_ROLES.map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterBiz} onValueChange={(v) => { setFilterBiz(v); setPage(0); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All businesses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All businesses</SelectItem>
                {businesses?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12"><LoadingSpinner /></div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">Failed to load users: {(error as Error).message}</div>
          ) : (
            <>
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>System Roles</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[60px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers && paginatedUsers.length > 0 ? (
                      paginatedUsers.map((user) => (
                        <TableRow
                          key={user.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/admin/users/${user.id}`)}
                        >
                          <TableCell className="font-medium">
                            {getUserDisplayName(user)}
                          </TableCell>
                          <TableCell className="text-sm">{user.email || 'N/A'}</TableCell>
                          <TableCell>
                            {!user.user_id ? (
                              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-xs">
                                Invited
                              </Badge>
                            ) : user.onboarding_completed === false ? (
                              <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-400 text-xs">
                                Onboarding
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 text-xs">
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={roleColors[user.role || ''] || 'bg-gray-500/10 text-gray-700'}>
                              {user.role || 'none'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.roles.length > 0 ? user.roles.map((r) => (
                                <Badge key={r} variant="outline" className="text-xs">{r}</Badge>
                              )) : (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{user.business_name || 'N/A'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            {user.user_id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingUser({
                                    userId: user.user_id!,
                                    currentRole: user.roles[0] || user.role || '',
                                    name: getUserDisplayName(user),
                                  });
                                  setNewRole(user.roles[0] || user.role || '');
                                }}
                              >
                                <UserCog className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 0}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Role: {editingUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <label className="text-sm font-medium">Role</label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {APP_ROLES.map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {newRole === 'super_admin' && (
              <p className="text-sm text-destructive font-medium">
                Warning: Granting super_admin gives full platform access.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={handleSaveRole} disabled={updateRole.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
