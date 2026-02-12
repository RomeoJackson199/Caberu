import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Search, Building2, ChevronLeft, ChevronRight, Power, PowerOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  useAdminBusinesses,
  useToggleBusinessSubscriptionStatus,
} from '@/hooks/useAdminData';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-700 dark:text-green-400',
  inactive: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
  cancelled: 'bg-red-500/10 text-red-700 dark:text-red-400',
  trial: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
};

const PAGE_SIZE = 20;

export default function AdminPractices() {
  const navigate = useNavigate();
  const { data: businesses, isLoading, error } = useAdminBusinesses();
  const toggleStatus = useToggleBusinessSubscriptionStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [statusToggle, setStatusToggle] = useState<{
    businessId: string;
    businessName: string;
    oldStatus: string;
    newStatus: string;
  } | null>(null);

  const filtered = businesses?.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.owner_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil((filtered?.length || 0) / PAGE_SIZE);
  const paginated = filtered?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Practice Management</h2>
        <p className="text-sm text-muted-foreground">View and manage all practices on the platform</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Practices ({businesses?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or slug..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12"><LoadingSpinner /></div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">Failed to load practices: {(error as Error).message}</div>
          ) : (
            <>
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead className="text-center">Members</TableHead>
                      <TableHead className="text-center">Appts</TableHead>
                      <TableHead className="text-center">Calls</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated && paginated.length > 0 ? (
                      paginated.map((biz) => {
                        const currentStatus = biz.subscription_status || 'inactive';
                        return (
                          <TableRow
                            key={biz.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/admin/practices/${biz.id}`)}
                          >
                            <TableCell>
                              <div className="font-medium flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {biz.name}
                              </div>
                              <div className="text-xs text-muted-foreground ml-6">/{biz.slug}</div>
                            </TableCell>
                            <TableCell className="capitalize">{biz.subscription_plan || 'free'}</TableCell>
                            <TableCell>
                              <Badge className={statusColors[currentStatus] + ' text-xs'}>
                                {currentStatus}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{biz.owner_name || 'N/A'}</div>
                              <div className="text-xs text-muted-foreground">{biz.owner_email}</div>
                            </TableCell>
                            <TableCell className="text-center">{biz.member_count}</TableCell>
                            <TableCell className="text-center">{biz.appointment_count}</TableCell>
                            <TableCell className="text-center">{biz.phone_call_count}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(biz.created_at), { addSuffix: true })}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title={currentStatus === 'active' ? 'Deactivate' : 'Activate'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStatusToggle({
                                    businessId: biz.id,
                                    businessName: biz.name,
                                    oldStatus: currentStatus,
                                    newStatus: currentStatus === 'active' ? 'inactive' : 'active',
                                  });
                                }}
                              >
                                {currentStatus === 'active' ? (
                                  <PowerOff className="h-4 w-4 text-destructive" />
                                ) : (
                                  <Power className="h-4 w-4 text-green-600" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          {searchQuery ? 'No practices found matching your search' : 'No practices found'}
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

      {/* Status Toggle Confirmation */}
      <AlertDialog open={!!statusToggle} onOpenChange={(open) => !open && setStatusToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusToggle?.newStatus === 'active' ? 'Activate' : 'Deactivate'} Business
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {statusToggle?.newStatus === 'active' ? 'activate' : 'deactivate'} &quot;{statusToggle?.businessName}&quot;?
              {statusToggle?.newStatus === 'inactive' && ' This will prevent users from accessing the business.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={statusToggle?.newStatus === 'inactive' ? 'bg-destructive text-destructive-foreground' : ''}
              onClick={() => {
                if (statusToggle) {
                  toggleStatus.mutate(statusToggle);
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
