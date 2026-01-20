import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSystemStats } from '@/hooks/useSuperAdmin';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { DiagnosticsCard } from './DiagnosticsCard';
import { QuickActionsCard } from './QuickActionsCard';
import {
  Building2,
  Users,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Activity,
  Shield,
} from 'lucide-react';

export function OverviewTab() {
  const { data: stats, isLoading } = useSystemStats();

  const statCards = [
    {
      title: 'Total Businesses',
      value: stats?.total_businesses || 0,
      description: `${stats?.active_businesses || 0} active`,
      icon: Building2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Total Users',
      value: stats?.total_users || 0,
      description: `+${stats?.users_joined_this_month || 0} this month`,
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Total Appointments',
      value: stats?.total_appointments || 0,
      description: `${stats?.appointments_today || 0} today`,
      icon: Calendar,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'System Errors',
      value: stats?.unresolved_errors || 0,
      description: `${stats?.critical_errors || 0} critical`,
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'Monthly Growth',
      value: stats?.businesses_created_this_month || 0,
      description: 'New businesses',
      icon: TrendingUp,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: 'System Health',
      value: stats?.critical_errors === 0 ? 'Good' : 'Issues',
      description: stats?.critical_errors === 0 ? 'All systems operational' : 'Attention needed',
      icon: Activity,
      color: stats?.critical_errors === 0 ? 'text-green-500' : 'text-yellow-500',
      bgColor: stats?.critical_errors === 0 ? 'bg-green-500/10' : 'bg-yellow-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">System Overview</h2>
        <p className="text-muted-foreground">
          Real-time statistics and platform health metrics
        </p>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Diagnostics */}
      <DiagnosticsCard />

      {/* Admin Actions and Quick Navigation */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Quick Actions */}
        <QuickActionsCard />

        {/* Quick Navigation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-500" />
              Quick Navigation
            </CardTitle>
            <CardDescription>
              Jump to administrative sections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 grid-cols-2">
              <a
                href="#businesses"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector('[value="businesses"]')?.dispatchEvent(new Event('click', { bubbles: true }));
                }}
                className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
              >
                <Building2 className="h-5 w-5 mb-2 text-blue-500" />
                <h3 className="font-semibold text-sm">Businesses</h3>
                <p className="text-xs text-muted-foreground">
                  View & create
                </p>
              </a>
              <a
                href="#users"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector('[value="users"]')?.dispatchEvent(new Event('click', { bubbles: true }));
                }}
                className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
              >
                <Users className="h-5 w-5 mb-2 text-green-500" />
                <h3 className="font-semibold text-sm">Users</h3>
                <p className="text-xs text-muted-foreground">
                  Search & view
                </p>
              </a>
              <a
                href="#errors"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector('[value="errors"]')?.dispatchEvent(new Event('click', { bubbles: true }));
                }}
                className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
              >
                <AlertTriangle className="h-5 w-5 mb-2 text-red-500" />
                <h3 className="font-semibold text-sm">Errors</h3>
                <p className="text-xs text-muted-foreground">
                  Monitor issues
                </p>
              </a>
              <a
                href="#audit"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector('[value="audit"]')?.dispatchEvent(new Event('click', { bubbles: true }));
                }}
                className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
              >
                <Shield className="h-5 w-5 mb-2 text-purple-500" />
                <h3 className="font-semibold text-sm">Audit Logs</h3>
                <p className="text-xs text-muted-foreground">
                  Track actions
                </p>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
