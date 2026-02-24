import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Bell, CheckCircle2, Clock, XCircle, AlertTriangle,
  RefreshCw, MinusCircle, Building2, Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAdminReminders, useBusinessList, AdminReminderRow } from '@/hooks/useAdminReminders';

type StatusFilter = 'all' | 'pending' | 'sent' | 'failed';

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'sent':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-amber-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'cancelled':
      return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
    default:
      return <MinusCircle className="h-4 w-4 text-muted-foreground/40" />;
  }
}

function SummaryStats({ rows }: { rows: AdminReminderRow[] }) {
  const pending = rows.filter((r) => r.reminder.status === 'pending').length;
  const sent = rows.filter((r) => r.reminder.status === 'sent').length;
  const failed = rows.filter((r) => r.reminder.status === 'failed').length;
  const cancelled = rows.filter((r) => r.reminder.status === 'cancelled').length;
  const businesses = new Set(rows.map((r) => r.business_id)).size;

  const stats = [
    { label: 'Pending', value: pending, icon: Clock, color: 'text-amber-500' },
    { label: 'Sent', value: sent, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Failed', value: failed, icon: XCircle, color: 'text-destructive' },
    { label: 'Cancelled', value: cancelled, icon: MinusCircle, color: 'text-muted-foreground' },
    { label: 'Businesses', value: businesses, icon: Building2, color: 'text-primary' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 border">
          <Icon className={cn('h-5 w-5 shrink-0', color)} />
          <div>
            <p className="text-lg font-bold leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReminderRow({ row }: { row: AdminReminderRow }) {
  const patientName = [row.patient_first_name, row.patient_last_name].filter(Boolean).join(' ') || 'Unknown Patient';
  const dentistName = [row.dentist_first_name, row.dentist_last_name].filter(Boolean).join(' ') || 'Unknown';
  const scheduledDate = parseISO(row.reminder.scheduled_for);
  const aptDate = parseISO(row.appointment_date);
  const hasFailed = row.reminder.status === 'failed';

  return (
    <div
      className={cn(
        'grid grid-cols-[1fr_1fr_auto_auto_auto] items-center gap-3 px-4 py-3 rounded-lg border transition-colors',
        hasFailed
          ? 'border-destructive/30 bg-destructive/5'
          : row.reminder.status === 'sent'
          ? 'border-emerald-200/50 bg-emerald-50/30 dark:border-emerald-800/30 dark:bg-emerald-900/10'
          : 'border-border bg-card hover:bg-muted/30',
      )}
    >
      {/* Patient + dentist */}
      <div className="min-w-0">
        <p className="font-medium text-sm truncate">{patientName}</p>
        <p className="text-xs text-muted-foreground truncate">Dr. {dentistName}</p>
      </div>

      {/* Business */}
      <div className="min-w-0">
        <p className="text-sm truncate">{row.business_name}</p>
        <p className="text-xs text-muted-foreground">{row.reminder.reminder_type} · {row.reminder.notification_method}</p>
      </div>

      {/* Appointment date */}
      <div className="text-right shrink-0">
        <p className="text-sm font-medium whitespace-nowrap">{format(aptDate, 'MMM d')}</p>
        <p className="text-xs text-muted-foreground">{format(aptDate, 'h:mm a')}</p>
      </div>

      {/* Scheduled for */}
      <div className="text-right shrink-0">
        <p className="text-xs text-muted-foreground">Scheduled</p>
        <p className="text-xs">{format(scheduledDate, 'MMM d, h:mm a')}</p>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        <StatusIcon status={row.reminder.status} />
        <Badge
          variant="outline"
          className={cn('text-xs capitalize', {
            'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300': row.reminder.status === 'sent',
            'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300': row.reminder.status === 'pending',
            'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300': row.reminder.status === 'failed',
            'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400': row.reminder.status === 'cancelled',
          })}
        >
          {row.reminder.status}
        </Badge>
      </div>
    </div>
  );
}

export default function AdminReminders() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedBusiness, setSelectedBusiness] = useState<string>('all');

  const { data: businesses = [], isLoading: bizLoading } = useBusinessList();
  const { data: rows = [], isLoading, error, refetch, isRefetching } = useAdminReminders({
    businessId: selectedBusiness === 'all' ? null : selectedBusiness,
    statusFilter,
  });

  const filterButtons: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Sent', value: 'sent' },
    { label: 'Failed', value: 'failed' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Appointment Reminders
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            All reminders across businesses
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Summary */}
      {!isLoading && !error && <SummaryStats rows={rows} />}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Status filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {filterButtons.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    statusFilter === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Business picker */}
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
                <SelectTrigger className="w-[200px] h-8 text-xs">
                  <SelectValue placeholder="All Businesses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Businesses</SelectItem>
                  {businesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-3 px-4 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Patient / Dentist</span>
            <span>Business / Type</span>
            <span className="text-right">Appointment</span>
            <span className="text-right">Scheduled</span>
            <span>Status</span>
          </div>

          {/* Rows */}
          <div className="space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))
            ) : error ? (
              <div className="text-center py-8 text-destructive flex flex-col items-center gap-2">
                <AlertTriangle className="h-8 w-8" />
                <p className="text-sm">Failed to load reminder data</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Try again
                </Button>
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No reminders found</p>
                <p className="text-xs mt-1">
                  {statusFilter === 'all'
                    ? 'No appointment reminders exist yet'
                    : `No reminders with "${statusFilter}" status`}
                </p>
              </div>
            ) : (
              rows.map((row) => (
                <ReminderRow key={row.reminder.id} row={row} />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground px-1">
        <span className="font-medium">Legend:</span>
        {[
          { icon: CheckCircle2, color: 'text-emerald-500', label: 'Sent' },
          { icon: Clock, color: 'text-amber-500', label: 'Pending' },
          { icon: XCircle, color: 'text-destructive', label: 'Failed' },
          { icon: MinusCircle, color: 'text-muted-foreground', label: 'Cancelled' },
        ].map(({ icon: Icon, color, label }) => (
          <span key={label} className="flex items-center gap-1">
            <Icon className={cn('h-3.5 w-3.5', color)} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
