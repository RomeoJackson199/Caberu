import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import {
  Building2,
  Users,
  Calendar,
  AlertTriangle,
  DollarSign,
  ArrowRight,
  ShieldAlert,
  Key,
  FileWarning,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, ResponsiveContainer } from 'recharts';
import {
  useAdminOverviewStats,
  useAppointmentsOverTime,
  usePhoneUsageOverTime,
  useSystemErrorsTrend,
  useAdminAlerts,
} from '@/hooks/useAdminData';

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('de-BE', { style: 'currency', currency: 'EUR' }).format(cents / 100);

export default function AdminOverview() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useAdminOverviewStats();
  const { data: appointmentsData } = useAppointmentsOverTime();
  const { data: phoneData } = usePhoneUsageOverTime();
  const { data: errorsTrend } = useSystemErrorsTrend();
  const { data: alerts } = useAdminAlerts();

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Total Businesses',
      value: stats?.total_businesses || 0,
      icon: Building2,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Total Users',
      value: stats?.total_users || 0,
      icon: Users,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      title: 'Appointments (Month)',
      value: stats?.appointments_this_month || 0,
      icon: Calendar,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      title: 'Active Errors',
      value: stats?.active_errors || 0,
      icon: AlertTriangle,
      color: stats?.active_errors ? 'text-red-500' : 'text-green-500',
      bg: stats?.active_errors ? 'bg-red-500/10' : 'bg-green-500/10',
    },
    {
      title: 'MRR',
      value: formatCurrency(stats?.mrr_cents || 0),
      icon: DollarSign,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
  ];

  const alertIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    error: ShieldAlert,
    gdpr: FileWarning,
    security: Key,
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{card.title}</CardTitle>
                <div className={cn('p-1.5 rounded-md', card.bg)}>
                  <Icon className={cn('h-3.5 w-3.5', card.color)} />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Appointments Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appointments (Last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {appointmentsData && appointmentsData.length > 0 ? (
              <ChartContainer config={{ count: { label: 'Appointments', color: 'hsl(var(--chart-1))' } }} className="h-[250px]">
                <LineChart data={appointmentsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                No appointment data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Phone Usage Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Phone Usage (Last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {phoneData && phoneData.length > 0 ? (
              <ChartContainer config={{
                calls: { label: 'Calls', color: 'hsl(var(--chart-2))' },
                minutes: { label: 'Minutes', color: 'hsl(var(--chart-3))' },
              }} className="h-[250px]">
                <BarChart data={phoneData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="calls" fill="var(--color-calls)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="minutes" fill="var(--color-minutes)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                No phone usage data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Errors Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">System Errors Trend (Last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {errorsTrend && errorsTrend.length > 0 ? (
              <ChartContainer config={{
                critical: { label: 'Critical', color: '#ef4444' },
                high: { label: 'High', color: '#f97316' },
                medium: { label: 'Medium', color: '#eab308' },
                low: { label: 'Low', color: '#6b7280' },
              }} className="h-[250px]">
                <BarChart data={errorsTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="critical" stackId="a" fill="var(--color-critical)" />
                  <Bar dataKey="high" stackId="a" fill="var(--color-high)" />
                  <Bar dataKey="medium" stackId="a" fill="var(--color-medium)" />
                  <Bar dataKey="low" stackId="a" fill="var(--color-low)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                No error trend data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts && alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const AlertIcon = alertIcons[alert.type] || AlertTriangle;
                return (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <AlertIcon className={cn(
                        'h-5 w-5',
                        alert.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'
                      )} />
                      <div>
                        <p className="text-sm font-medium">{alert.title}</p>
                        <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'} className="text-xs mt-1">
                          {alert.severity}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (alert.type === 'error') navigate('/admin/system');
                        else if (alert.type === 'gdpr') navigate('/admin/compliance');
                        else if (alert.type === 'security') navigate('/admin/compliance');
                      }}
                    >
                      View <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active alerts. All systems operational.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
