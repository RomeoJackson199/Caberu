import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSystemStats } from '@/hooks/useSuperAdmin';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { DiagnosticsCard } from './DiagnosticsCard';
import { QuickActionsCard } from './QuickActionsCard';
import { VoiceAIStatusCard } from './VoiceAIStatusCard';
import { EdgeFunctionTestPanel } from './EdgeFunctionTestPanel';
import { DatabaseInsightsCard } from './DatabaseInsightsCard';
import { LiveMonitoringCard } from './LiveMonitoringCard';
import {
  Building2,
  Users,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function OverviewTab() {
  const { data: stats, isLoading } = useSystemStats();

  const statCards = [
    {
      title: 'Businesses',
      value: stats?.total_businesses || 0,
      sub: `${stats?.active_businesses || 0} active`,
      icon: Building2,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Users',
      value: stats?.total_users || 0,
      sub: `+${stats?.users_joined_this_month || 0} this month`,
      icon: Users,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      title: 'Appointments',
      value: stats?.total_appointments || 0,
      sub: `${stats?.appointments_today || 0} today`,
      icon: Calendar,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      title: 'Errors',
      value: stats?.unresolved_errors || 0,
      sub: `${stats?.critical_errors || 0} critical`,
      icon: AlertTriangle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
    },
    {
      title: 'Growth',
      value: stats?.businesses_created_this_month || 0,
      sub: 'New businesses',
      icon: TrendingUp,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
    },
    {
      title: 'Health',
      value: stats?.critical_errors === 0 ? 'Good' : 'Issues',
      sub: stats?.critical_errors === 0 ? 'All systems operational' : 'Attention needed',
      icon: Activity,
      color: stats?.critical_errors === 0 ? 'text-green-500' : 'text-yellow-500',
      bg: stats?.critical_errors === 0 ? 'bg-green-500/10' : 'bg-yellow-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={cn('p-1.5 rounded-md', stat.bg)}>
                    <Icon className={cn('h-3.5 w-3.5', stat.color)} />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Actions + Diagnostics */}
      <div className="grid gap-4 lg:grid-cols-3">
        <QuickActionsCard />
        <div className="lg:col-span-2">
          <DiagnosticsCard />
        </div>
      </div>

      {/* Live Monitoring + Database */}
      <div className="grid gap-4 lg:grid-cols-2">
        <LiveMonitoringCard />
        <DatabaseInsightsCard />
      </div>

      {/* Voice AI + Edge Functions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <VoiceAIStatusCard />
        <EdgeFunctionTestPanel />
      </div>
    </div>
  );
}
