import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAllUsers, useUpdateUserRole, useRemoveUserFromBusiness } from '@/hooks/useSuperAdmin';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Search, Mail, Phone, Calendar, Building2, ChevronDown, Trash2, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';

const AVAILABLE_ROLES = ['owner', 'admin', 'dentist', 'staff', 'patient'];

export function UsersTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: users, isLoading } = useAllUsers(searchQuery);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const updateRole = useUpdateUserRole();
  const removeUser = useRemoveUserFromBusiness();
  const [confirmRemove, setConfirmRemove] = useState<{
    userId: string;
    businessId: string;
    userName: string;
    businessName: string;
  } | null>(null);

  const toggleUserExpansion = (userId: string) => {
    setExpandedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  function handleRoleChange(userId: string, businessId: string, newRole: string) {
    updateRole.mutate({ userId, businessId, newRole });
  }

  function handleRemoveUser(userId: string, businessId: string, userName: string, businessName: string) {
    setConfirmRemove({ userId, businessId, userName, businessName });
  }

  function confirmRemoveUser() {
    if (confirmRemove) {
      removeUser.mutate(confirmRemove);
      setConfirmRemove(null);
    }
  }

  const BusinessMemberships = ({ user }: { user: NonNullable<typeof users>[number] }) => (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm flex items-center gap-2">
        <ShieldCheck className="h-4 w-4" />
        Business Memberships
      </h4>
      <div className="grid gap-2">
        {user.businesses.map((business, idx) => (
          <div
            key={idx}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-background rounded border"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium truncate">{business.business_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={business.role}
                onValueChange={(newRole) =>
                  handleRoleChange(user.user_id, business.business_id, newRole)
                }
              >
                <SelectTrigger className="w-[130px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() =>
                  handleRemoveUser(
                    user.user_id,
                    business.business_id,
                    `${user.first_name} ${user.last_name}`,
                    business.business_name
                  )
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">User Management</h2>
        <p className="text-sm text-muted-foreground">
          View and manage all users across all businesses
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Users ({users?.length || 0})</CardTitle>
          <CardDescription>Search and filter users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Businesses</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users && users.length > 0 ? (
                      users.map((user) => (
                        <>
                          <TableRow key={user.user_id}>
                            <TableCell>
                              <div className="font-medium">
                                {user.first_name} {user.last_name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  {user.email}
                                </div>
                                {user.phone && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Phone className="h-3 w-3" />
                                    {user.phone}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {user.businesses.length}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {user.roles.map((role, idx) => (
                                  <Badge key={idx} variant="secondary">
                                    {role}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                {formatDistanceToNow(new Date(user.created_at), {
                                  addSuffix: true,
                                })}
                              </div>
                            </TableCell>
                            <TableCell>
                              {user.businesses.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleUserExpansion(user.user_id)}
                                >
                                  <ChevronDown
                                    className={`h-4 w-4 transition-transform ${
                                      expandedUsers.has(user.user_id) ? 'rotate-180' : ''
                                    }`}
                                  />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                          {expandedUsers.has(user.user_id) && user.businesses.length > 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="bg-muted/50">
                                <div className="p-4">
                                  <BusinessMemberships user={user} />
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="text-muted-foreground">
                            {searchQuery
                              ? 'No users found matching your search'
                              : 'No users found'}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {users && users.length > 0 ? (
                  users.map((user) => (
                    <Card key={user.user_id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3 shrink-0" />
                                {user.phone}
                              </div>
                            )}
                          </div>
                          {user.businesses.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0"
                              onClick={() => toggleUserExpansion(user.user_id)}
                            >
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${
                                  expandedUsers.has(user.user_id) ? 'rotate-180' : ''
                                }`}
                              />
                            </Button>
                          )}
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {role}
                              </Badge>
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(user.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>

                        {expandedUsers.has(user.user_id) && user.businesses.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <BusinessMemberships user={user} />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery
                      ? 'No users found matching your search'
                      : 'No users found'}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirm Remove Dialog */}
      <AlertDialog open={!!confirmRemove} onOpenChange={(open) => !open && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User from Business</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{confirmRemove?.userName}</strong> from{' '}
              <strong>{confirmRemove?.businessName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
