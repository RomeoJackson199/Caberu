import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddUserDialog } from "@/components/admin/AddUserDialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Mail, Calendar, Shield, Users as UsersIcon, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ModernLoadingSpinner } from "@/components/enhanced/ModernLoadingSpinner";
import { logger } from '@/lib/logger';
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useLanguage } from "@/hooks/useLanguage";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserWithRoles {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  user_id: string | null;
  roles: string[];
  invitation_status?: 'pending' | 'accepted';
  invitation_sent_at?: string;
}

export default function DentistAdminUsers() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { businessId } = useBusinessContext();
  const { t } = useLanguage();

  const fetchUsers = async () => {
    try {
      setLoading(true);

      if (!businessId) {
        setUsers([]);
        return;
      }

      // First, get all profile IDs that are members of this business
      const { data: businessMembers, error: membersError } = await supabase
        .from('business_members')
        .select('profile_id, role')
        .eq('business_id', businessId);

      if (membersError) throw membersError;

      if (!businessMembers || businessMembers.length === 0) {
        setUsers([]);
        return;
      }

      // Get unique profile IDs
      const profileIds = [...new Set(businessMembers.map(m => m.profile_id))];

      // Fetch profiles for these members only
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, created_at, user_id')
        .in('id', profileIds)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Map profiles with their roles from this business
      const usersWithRoles = (profiles || []).map((profile) => {
        // Get roles for this profile in this business
        const memberRoles = businessMembers
          .filter(m => m.profile_id === profile.id)
          .map(m => m.role);

        const uniqueRoles = [...new Set(memberRoles)];

        return {
          ...profile,
          roles: uniqueRoles,
          invitation_status: profile.user_id ? 'accepted' as const : undefined,
          invitation_sent_at: undefined,
        };
      });

      setUsers(usersWithRoles);
    } catch (error: any) {
      logger.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [businessId]);

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.first_name?.toLowerCase().includes(query) ||
      user.last_name?.toLowerCase().includes(query) ||
      user.roles.some(role => role.toLowerCase().includes(query))
    );
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'provider': return 'default';
      case 'dentist': return 'default';
      case 'staff': return 'secondary';
      case 'patient': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <ModernLoadingSpinner message={t.loading} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.teamMembers || "Team Members"}</h1>
          <p className="text-muted-foreground mt-1">
            {t.teamMembersDesc || "Manage staff and patients for your clinic"}
          </p>
        </div>
        <AddUserDialog onUserAdded={fetchUsers} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.totalUsers || "Total Users"}</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.activeUsers || "Active Users"}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.user_id).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.pendingInvites || "Pending Invites"}</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.invitation_status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.admins || "Admins"}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.roles.includes('admin')).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>{t.userList || "User List"}</CardTitle>
          <CardDescription>
            {t.userListDesc || "Search and manage all users in the system"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.searchByNameEmailRole || "Search by name, email, or role..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchUsers}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.name || "Name"}</TableHead>
                  <TableHead>{t.email}</TableHead>
                  <TableHead>{t.roles || "Roles"}</TableHead>
                  <TableHead>{t.status}</TableHead>
                  <TableHead>{t.joined || "Joined"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {t.noUsersFound || "No users found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.first_name} {user.last_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <Badge key={role} variant={getRoleBadgeVariant(role)}>
                                {role}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline">{t.noRolesAssigned || "No roles assigned"}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.invitation_status === 'pending' ? (
                          <Badge variant="secondary">{t.invitationPending || "Invitation Pending"}</Badge>
                        ) : user.user_id ? (
                          <Badge variant="default" className="bg-green-600">{t.active || "Active"}</Badge>
                        ) : (
                          <Badge variant="outline">{t.inactive || "Inactive"}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
