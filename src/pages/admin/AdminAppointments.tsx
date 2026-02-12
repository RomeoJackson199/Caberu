import { useState } from 'react';
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Search, Lock, Bot, Hand } from 'lucide-react';
import { format } from 'date-fns';
import { useAdminAppointments, useUpdateAppointmentStatus, useAdminBusinesses } from '@/hooks/useAdminData';

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  confirmed: 'bg-green-500/10 text-green-700 dark:text-green-400',
  completed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  cancelled: 'bg-red-500/10 text-red-700 dark:text-red-400',
  'no-show': 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
};

export default function AdminAppointments() {
  const [filterBiz, setFilterBiz] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterSource, setFilterSource] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: appointments, isLoading } = useAdminAppointments({
    businessId: filterBiz || undefined,
    status: filterStatus || undefined,
    bookingSource: filterSource || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const { data: businesses } = useAdminBusinesses();
  const updateStatus = useUpdateAppointmentStatus();

  const [selectedAppt, setSelectedAppt] = useState<typeof appointments extends (infer T)[] | undefined ? T | null : null>(null);
  const [statusAction, setStatusAction] = useState<{ id: string; status: string } | null>(null);

  function handleStatusChange() {
    if (!statusAction) return;
    updateStatus.mutate({ appointmentId: statusAction.id, status: statusAction.status });
    setStatusAction(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Appointment Management</h2>
        <p className="text-sm text-muted-foreground">View all appointments across all practices</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Appointments ({appointments?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={filterBiz} onValueChange={setFilterBiz}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All businesses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All businesses</SelectItem>
                {businesses?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="no-show">No Show</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="All sources" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="ai">AI</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" placeholder="From" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" placeholder="To" />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12"><LoadingSpinner /></div>
          ) : (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Dentist</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments && appointments.length > 0 ? (
                    appointments.map((appt) => (
                      <TableRow key={appt.id}>
                        <TableCell className="font-medium">{appt.patient_name}</TableCell>
                        <TableCell>{appt.dentist_name || 'N/A'}</TableCell>
                        <TableCell className="text-sm">{appt.business_name}</TableCell>
                        <TableCell className="text-sm">
                          {appt.appointment_date ? format(new Date(appt.appointment_date), 'PP p') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[appt.status || ''] || 'bg-gray-500/10 text-gray-700'}>
                            {appt.status || 'unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {appt.booking_source === 'ai' ? (
                            <Badge variant="outline" className="gap-1"><Bot className="h-3 w-3" />AI</Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1"><Hand className="h-3 w-3" />Manual</Badge>
                          )}
                        </TableCell>
                        <TableCell>{appt.duration_minutes ? `${appt.duration_minutes}m` : 'N/A'}</TableCell>
                        <TableCell>
                          {(appt.reason || appt.notes || appt.ai_summary) && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Lock className="h-3 w-3" /> Encrypted
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {appt.status !== 'cancelled' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 text-xs"
                                onClick={() => setStatusAction({ id: appt.id, status: 'cancelled' })}
                              >
                                Cancel
                              </Button>
                            )}
                            {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 text-xs"
                                onClick={() => setStatusAction({ id: appt.id, status: 'completed' })}
                              >
                                Complete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No appointments found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Status Change */}
      <Dialog open={!!statusAction} onOpenChange={(open) => !open && setStatusAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this appointment as <strong>{statusAction?.status}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusAction(null)}>Cancel</Button>
            <Button onClick={handleStatusChange} disabled={updateStatus.isPending}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
