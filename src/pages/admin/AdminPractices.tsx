import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Separator } from '@/components/ui/separator';
import { Search, Building2, Users, Calendar, Phone, ArrowLeft, Settings } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import {
  useAdminBusinesses,
  useAdminBusinessDetail,
  useUpdateBusinessSubscription,
  useAdminEncryptionKeys,
} from '@/hooks/useAdminData';
import type { AdminBusiness } from '@/types/admin-dashboard';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-700 dark:text-green-400',
  inactive: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
  cancelled: 'bg-red-500/10 text-red-700 dark:text-red-400',
  trial: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
};

export default function AdminPractices() {
  const { data: businesses, isLoading } = useAdminBusinesses();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBizId, setSelectedBizId] = useState<string | null>(null);
  const { data: bizDetail } = useAdminBusinessDetail(selectedBizId);
  const { data: encryptionKeys } = useAdminEncryptionKeys();
  const updateSubscription = useUpdateBusinessSubscription();
  const [editSub, setEditSub] = useState<{ businessId: string; status: string; plan: string } | null>(null);

  const filtered = businesses?.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.owner_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const bizKeys = encryptionKeys?.filter((k) => k.business_id === selectedBizId) || [];

  function handleSaveSub() {
    if (!editSub) return;
    updateSubscription.mutate({
      businessId: editSub.businessId,
      subscription_status: editSub.status,
      subscription_plan: editSub.plan,
    });
    setEditSub(null);
  }

  // Detail View
  if (selectedBizId && bizDetail) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedBizId(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h2 className="text-xl font-bold">{bizDetail.name}</h2>
          <Badge className={statusColors[bizDetail.subscription_status || 'inactive']}>
            {bizDetail.subscription_status || 'N/A'}
          </Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Business Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Slug</span><span>/{bizDetail.slug}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span>{bizDetail.address || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{bizDetail.phone || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Specialty</span><span>{bizDetail.specialty_type || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span>{bizDetail.currency || 'EUR'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{format(new Date(bizDetail.created_at), 'PP')}</span></div>
              {bizDetail.primary_color && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Brand Color</span>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded" style={{ backgroundColor: bizDetail.primary_color }} />
                    <span>{bizDetail.primary_color}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Subscription</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditSub({
                  businessId: selectedBizId,
                  status: bizDetail.subscription_status || 'inactive',
                  plan: bizDetail.subscription_plan || 'free',
                })}
              >
                <Settings className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="capitalize">{bizDetail.subscription_plan || 'Free'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={statusColors[bizDetail.subscription_status || 'inactive']}>{bizDetail.subscription_status || 'N/A'}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Started</span><span>{bizDetail.subscription_started_at ? format(new Date(bizDetail.subscription_started_at), 'PP') : 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Ends</span><span>{bizDetail.subscription_ends_at ? format(new Date(bizDetail.subscription_ends_at), 'PP') : 'N/A'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Stripe Account</span><span className="text-xs font-mono">{bizDetail.stripe_account_id || 'Not connected'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Charges Enabled</span><span>{bizDetail.stripe_charges_enabled ? 'Yes' : 'No'}</span></div>
            </CardContent>
          </Card>
        </div>

        {/* Encryption Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Encryption Keys</CardTitle>
            <CardDescription>From admin_encryption_key_status view</CardDescription>
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
              <p className="text-sm text-muted-foreground">No encryption keys found for this practice.</p>
            )}
          </CardContent>
        </Card>

        {/* Edit Subscription Dialog */}
        <Dialog open={!!editSub} onOpenChange={(open) => !open && setEditSub(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Subscription</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={editSub?.status || ''} onValueChange={(v) => editSub && setEditSub({ ...editSub, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Plan</label>
                <Select value={editSub?.plan || ''} onValueChange={(v) => editSub && setEditSub({ ...editSub, plan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="promo">Promo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditSub(null)}>Cancel</Button>
              <Button onClick={handleSaveSub} disabled={updateSubscription.isPending}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // List View
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12"><LoadingSpinner /></div>
          ) : (
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered && filtered.length > 0 ? (
                    filtered.map((biz) => (
                      <TableRow
                        key={biz.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedBizId(biz.id)}
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
                          <Badge className={statusColors[biz.subscription_status || 'inactive'] + ' text-xs'}>
                            {biz.subscription_status || 'N/A'}
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
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {searchQuery ? 'No practices found matching your search' : 'No practices found'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
