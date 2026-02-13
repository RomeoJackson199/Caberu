import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow, isFuture, isPast } from 'date-fns';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wrench,
  Clock,
  Activity,
  Shield,
} from 'lucide-react';

const statusInfo: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  operational: { label: 'All Systems Operational', color: 'text-green-500 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800', icon: <CheckCircle2 className="h-6 w-6 text-green-500" /> },
  degraded: { label: 'Degraded Performance', color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800', icon: <AlertTriangle className="h-6 w-6 text-yellow-500" /> },
  partial_outage: { label: 'Partial Outage', color: 'text-orange-600 bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800', icon: <AlertTriangle className="h-6 w-6 text-orange-500" /> },
  major_outage: { label: 'Major Outage', color: 'text-red-600 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800', icon: <XCircle className="h-6 w-6 text-red-500" /> },
  maintenance: { label: 'Under Maintenance', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800', icon: <Wrench className="h-6 w-6 text-blue-500" /> },
};

const severityStyles: Record<string, string> = {
  maintenance: 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/50',
  partial: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/50',
  major: 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/50',
  critical: 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/50',
};

export default function StatusPage() {
  const { data: platformStatus } = useQuery({
    queryKey: ['public-platform-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_status')
        .select('overall_status, status_message, updated_at')
        .limit(1)
        .single();
      if (error) return null;
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: downtimes } = useQuery({
    queryKey: ['public-downtimes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_downtimes')
        .select('*')
        .eq('is_public', true)
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_start', { ascending: true });
      if (error) return [];
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: recentDowntimes } = useQuery({
    queryKey: ['public-recent-downtimes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_downtimes')
        .select('*')
        .eq('is_public', true)
        .in('status', ['completed'])
        .order('actual_end', { ascending: false })
        .limit(10);
      if (error) return [];
      return data || [];
    },
  });

  const currentStatus = statusInfo[platformStatus?.overall_status || 'operational'] || statusInfo.operational;

  const services = [
    { name: 'Platform API', description: 'Core API endpoints' },
    { name: 'Database', description: 'PostgreSQL database' },
    { name: 'Authentication', description: 'Login and signup' },
    { name: 'Voice AI', description: 'ElevenLabs voice calls' },
    { name: 'WhatsApp', description: 'Messaging service' },
    { name: 'Booking Engine', description: 'Appointment scheduling' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Caberu System Status</h1>
              <p className="text-sm text-muted-foreground">Real-time platform health monitoring</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Overall Status Banner */}
        <div className={`p-6 rounded-xl border-2 ${currentStatus.color}`}>
          <div className="flex items-center gap-3">
            {currentStatus.icon}
            <div>
              <h2 className="text-lg font-semibold">{currentStatus.label}</h2>
              {platformStatus?.status_message && (
                <p className="text-sm opacity-80 mt-0.5">{platformStatus.status_message}</p>
              )}
            </div>
          </div>
          {platformStatus?.updated_at && (
            <p className="text-xs opacity-60 mt-3">
              Last updated {formatDistanceToNow(new Date(platformStatus.updated_at), { addSuffix: true })}
            </p>
          )}
        </div>

        {/* Active / Upcoming Downtimes */}
        {downtimes && downtimes.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Active & Scheduled Maintenance
            </h3>
            <div className="space-y-3">
              {downtimes.map((dt: any) => (
                <div key={dt.id} className={`p-4 rounded-lg border ${severityStyles[dt.severity] || severityStyles.maintenance}`}>
                  <div className="flex items-start gap-3">
                    {dt.status === 'in_progress' ? (
                      <Activity className="h-5 w-5 text-red-500 animate-pulse mt-0.5" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{dt.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          dt.status === 'in_progress' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {dt.status === 'in_progress' ? 'In Progress' : 'Scheduled'}
                        </span>
                      </div>
                      {dt.description && <p className="text-sm text-muted-foreground mb-2">{dt.description}</p>}
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>
                          📅 {format(new Date(dt.scheduled_start), 'EEEE, MMM d, yyyy HH:mm')} → {format(new Date(dt.scheduled_end), 'HH:mm')}
                        </p>
                        {dt.reason && <p>Reason: {dt.reason}</p>}
                        {dt.affected_services?.length > 0 && (
                          <p>Affected: {dt.affected_services.join(', ')}</p>
                        )}
                        {dt.status === 'scheduled' && isFuture(new Date(dt.scheduled_start)) && (
                          <p className="text-primary font-medium mt-1">
                            Starts {formatDistanceToNow(new Date(dt.scheduled_start), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Service Components */}
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Services
          </h3>
          <div className="border rounded-lg divide-y">
            {services.map((service) => {
              // Check if any active downtime affects this service
              const affected = downtimes?.some(
                (dt: any) =>
                  dt.status === 'in_progress' &&
                  dt.affected_services?.some((s: string) =>
                    service.name.toLowerCase().includes(s.toLowerCase()) ||
                    s.toLowerCase().includes(service.name.toLowerCase())
                  )
              );

              return (
                <div key={service.name} className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium">{service.name}</p>
                    <p className="text-xs text-muted-foreground">{service.description}</p>
                  </div>
                  {affected ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-orange-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Disrupted
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Operational
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent Incidents */}
        {recentDowntimes && recentDowntimes.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Recent Incidents
            </h3>
            <div className="space-y-3">
              {recentDowntimes.map((dt: any) => (
                <div key={dt.id} className="p-3 border rounded-lg opacity-75">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">{dt.title}</span>
                    <span className="text-xs text-muted-foreground">— Resolved</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {dt.actual_end
                      ? `Resolved ${formatDistanceToNow(new Date(dt.actual_end), { addSuffix: true })}`
                      : `Ended ${format(new Date(dt.scheduled_end), 'MMM d, HH:mm')}`}
                    {dt.reason && ` · ${dt.reason}`}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground pt-8 border-t">
          <p>Caberu Healthcare Solutions · Status updates every 30 seconds</p>
        </footer>
      </main>
    </div>
  );
}
