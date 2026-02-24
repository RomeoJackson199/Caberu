import { useState } from 'react';
import { Bell, Building2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, Clock, XCircle, AlertTriangle, RefreshCw, MinusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAdminBusinesses } from '@/hooks/useAdminData';
import { useAppointmentReminders, AppointmentReminder, AppointmentWithReminders } from '@/hooks/useAppointmentReminders';

const REMINDER_TYPES = ['24h', '2h', '1h'] as const;
type ReminderType = (typeof REMINDER_TYPES)[number];

const REMINDER_LABEL: Record<ReminderType, string> = {
  '24h': '24 h',
  '2h': '2 h',
  '1h': '1 h',
};

type StatusFilter = 'all' | 'pending' | 'sent' | 'failed';

function ReminderStatusIcon({ reminder }: { reminder: AppointmentReminder | undefined }) {
  if (!reminder) {
    return <MinusCircle className="h-4 w-4 text-muted-foreground/40" />;
  }
  switch (reminder.status) {
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

function AppointmentRow({ appointment }: { appointment: AppointmentWithReminders }) {
  const patientName = appointment.patient
    ? `${appointment.patient.first_name ?? ''} ${appointment.patient.last_name ?? ''}`.trim()
    : 'Unknown Patient';

  const aptDate = parseISO(appointment.appointment_date);

  const getReminderForType = (type: ReminderType): AppointmentReminder | undefined =>
    appointment.reminders.find((r) => r.reminder_type === type);

  const hasFailed = appointment.reminders.some((r) => r.status === 'failed');
  const allSent =
    appointment.reminders.length > 0 &&
    appointment.reminders.every((r) => r.status === 'sent' || r.status === 'cancelled');

  return (
    <div
      className={cn(
        'grid grid-cols-[1fr_auto_repeat(3,_56px)] items-center gap-3 px-4 py-3 rounded-lg border transition-colors',
        hasFailed
          ? 'border-destructive/30 bg-destructive/5'
          : allSent
          ? 'border-emerald-200/50 bg-emerald-50/30 dark:border-emerald-800/30 dark:bg-emerald-900/10'
          : 'border-border bg-card hover:bg-muted/30',
      )}
    >
      <div className="min-w-0">
        <p className="font-medium text-sm truncate">{patientName}</p>
        <p className="text-xs text-muted-foreground">{appointment.reason || 'No reason specified'}</p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-sm font-medium whitespace-nowrap">{format(aptDate, 'MMM d')}</p>
        <p className="text-xs text-muted-foreground">{format(aptDate, 'h:mm a')}</p>
      </div>

      {REMINDER_TYPES.map((type) => {
        const reminder = getReminderForType(type);
        return (
          <div key={type} className="flex flex-col items-center gap-1">
            <ReminderStatusIcon reminder={reminder} />
            <span className="text-[10px] text-muted-foreground">{REMINDER_LABEL[type]}</span>
          </div>
        );
      })}
    </div>
  );
}

function SummaryStats({ appointments }: { appointments: AppointmentWithReminders[] }) {
  const allReminders = appointments.flatMap((a) => a.reminders);
  const pending = allReminders.filter((r) => r.status === 'pending').length;
  const sent = allReminders.filter((r) => r.status === 'sent').length;
  const failed = allReminders.filter((r) => r.status === 'failed').length;
  const noReminders = appointments.filter((a) => a.reminders.length === 0).length;

  const stats = [
    { label: 'Pending', value: pending, icon: Clock, color: 'text-amber-500' },
    { label: 'Sent', value: sent, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Failed', value: failed, icon: XCircle, color: 'text-destructive' },
    { label: 'No Reminders', value: noReminders, icon: AlertTriangle, color: 'text-muted-foreground' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

export default function AdminReminders() {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [daysAhead, setDaysAhead] = useState(7);

  const { data: businesses = [], isLoading: businessesLoading } = useAdminBusinesses();

  const { data: appointments = [], isLoading, error, refetch, isRefetching } = useAppointmentReminders({
    businessId: selectedBusinessId || null,
    daysAhead,
  });

  const filteredAppointments = appointments.filter((apt) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return apt.reminders.some((r) => r.status === 'pending');
    if (statusFilter === 'sent') return apt.reminders.every((r) => r.status === 'sent' || r.status === 'cancelled') && apt.reminders.length > 0;
    if (statusFilter === 'failed') return apt.reminders.some((r) => r.status === 'failed');
    return true;
  });

  const filterButtons: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Sent', value: 'sent' },
    { label: 'Failed', value: 'failed' },
  ];

  const rangeButtons: { label: string; value: number }[] = [
    { label: '3 days', value: 3 },
    { label: '7 days', value: 7 },
    { label: '14 days', value: 14 },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Appointment Reminders
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Monitor reminder status across all businesses
        </p>
      </div>

      {/* Business Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Business:</span>
        </div>
        <Select
          value={selectedBusinessId}
          onValueChange={setSelectedBusinessId}
          disabled={businessesLoading}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a business…" />
          </SelectTrigger>
          <SelectContent>
            {businesses.map((biz) => (
              <SelectItem key={biz.id} value={biz.id}>
                {biz.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedBusinessId ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Building2 className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">Select a business to view reminders</p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          {!isLoading && !error && <SummaryStats appointments={appointments} />}

          {/* Filters + Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
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
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-muted-foreground">Range:</span>
                  {rangeButtons.map(({ label, value }) => (
                    <button
                      key={value}
                      onClick={() => setDaysAhead(value)}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                        daysAhead === value
                          ? 'bg-secondary text-secondary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isRefetching}
                    className="gap-2 ml-2"
                  >
                    <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="grid grid-cols-[1fr_auto_repeat(3,_56px)] gap-3 px-4 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span>Patient / Reason</span>
                <span className="text-right">Date</span>
                {REMINDER_TYPES.map((t) => (
                  <span key={t} className="text-center">
                    {REMINDER_LABEL[t]}
                  </span>
                ))}
              </div>

              <div className="space-y-2">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
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
                ) : filteredAppointments.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No appointments found</p>
                    <p className="text-xs mt-1">
                      {statusFilter === 'all'
                        ? `No upcoming appointments in the next ${daysAhead} days`
                        : `No appointments with "${statusFilter}" reminders`}
                    </p>
                  </div>
                ) : (
                  filteredAppointments.map((apt) => (
                    <AppointmentRow key={apt.id} appointment={apt} />
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
              { icon: MinusCircle, color: 'text-muted-foreground/40', label: 'Not scheduled' },
            ].map(({ icon: Icon, color, label }) => (
              <span key={label} className="flex items-center gap-1">
                <Icon className={cn('h-3.5 w-3.5', color)} />
                {label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
