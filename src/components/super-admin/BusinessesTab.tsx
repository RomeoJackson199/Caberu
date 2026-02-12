import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAllBusinesses, useToggleBusinessStatus } from '@/hooks/useSuperAdmin';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Search, Building2, Users, Calendar, Plus, Power } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CreateBusinessDialog } from './CreateBusinessDialog';

export function BusinessesTab() {
  const { data: businesses, isLoading } = useAllBusinesses();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const toggleStatus = useToggleBusinessStatus();
  const [confirmToggle, setConfirmToggle] = useState<{
    businessId: string;
    businessName: string;
    currentlyActive: boolean;
  } | null>(null);

  const filteredBusinesses = businesses?.filter(
    (business) =>
      business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.owner_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function handleToggleStatus(businessId: string, businessName: string, currentlyActive: boolean) {
    setConfirmToggle({ businessId, businessName, currentlyActive });
  }

  function confirmToggleStatus() {
    if (confirmToggle) {
      toggleStatus.mutate({
        businessId: confirmToggle.businessId,
        isActive: !confirmToggle.currentlyActive,
        businessName: confirmToggle.businessName,
      });
      setConfirmToggle(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Business Management</h2>
          <p className="text-sm text-muted-foreground">
            View and manage all businesses on the platform
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Create Business
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">All Businesses ({businesses?.length || 0})</CardTitle>
              <CardDescription>Search and filter businesses</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or slug..."
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
                      <TableHead>Business</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Patients</TableHead>
                      <TableHead>Appointments</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBusinesses && filteredBusinesses.length > 0 ? (
                      filteredBusinesses.map((business) => (
                        <TableRow key={business.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {business.name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                /{business.slug}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{business.owner_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {business.owner_email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              {business.total_members}
                            </div>
                          </TableCell>
                          <TableCell>{business.total_patients}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {business.total_appointments}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {business.active_appointments} active
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={business.is_active ? 'default' : 'secondary'}
                            >
                              {business.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {formatDistanceToNow(new Date(business.created_at), {
                                addSuffix: true,
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={
                                business.is_active
                                  ? 'text-destructive hover:text-destructive hover:bg-destructive/10'
                                  : 'text-green-600 hover:text-green-600 hover:bg-green-600/10'
                              }
                              onClick={() =>
                                handleToggleStatus(business.id, business.name, business.is_active)
                              }
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="text-muted-foreground">
                            {searchQuery
                              ? 'No businesses found matching your search'
                              : 'No businesses found'}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {filteredBusinesses && filteredBusinesses.length > 0 ? (
                  filteredBusinesses.map((business) => (
                    <Card key={business.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="truncate">{business.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground ml-6">/{business.slug}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge variant={business.is_active ? 'default' : 'secondary'} className="text-xs">
                              {business.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={
                                business.is_active
                                  ? 'h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10'
                                  : 'h-8 w-8 text-green-600 hover:text-green-600 hover:bg-green-600/10'
                              }
                              onClick={() =>
                                handleToggleStatus(business.id, business.name, business.is_active)
                              }
                            >
                              <Power className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                          <div className="bg-muted/50 rounded-md py-2 px-1">
                            <div className="text-lg font-semibold">{business.total_members}</div>
                            <div className="text-[10px] text-muted-foreground uppercase">Members</div>
                          </div>
                          <div className="bg-muted/50 rounded-md py-2 px-1">
                            <div className="text-lg font-semibold">{business.total_patients}</div>
                            <div className="text-[10px] text-muted-foreground uppercase">Patients</div>
                          </div>
                          <div className="bg-muted/50 rounded-md py-2 px-1">
                            <div className="text-lg font-semibold">{business.total_appointments}</div>
                            <div className="text-[10px] text-muted-foreground uppercase">Appts</div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{business.owner_name} &middot; {business.owner_email}</span>
                          <span>
                            {formatDistanceToNow(new Date(business.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery
                      ? 'No businesses found matching your search'
                      : 'No businesses found'}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <CreateBusinessDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />

      {/* Confirm Toggle Status Dialog */}
      <AlertDialog open={!!confirmToggle} onOpenChange={(open) => !open && setConfirmToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmToggle?.currentlyActive ? 'Deactivate' : 'Activate'} Business
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmToggle?.currentlyActive ? 'deactivate' : 'activate'}{' '}
              <strong>{confirmToggle?.businessName}</strong>?
              {confirmToggle?.currentlyActive &&
                ' Users will no longer be able to access this business.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmToggleStatus}
              className={
                confirmToggle?.currentlyActive
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
            >
              {confirmToggle?.currentlyActive ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
