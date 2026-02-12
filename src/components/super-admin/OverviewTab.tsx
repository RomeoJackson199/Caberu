import { useAdminDashboardStats } from '@/hooks/useAdminDashboard';
import { KPICards } from './overview/KPICards';
import { RevenueChart } from './overview/RevenueChart';
import { UsageTrendsChart } from './overview/UsageTrendsChart';
import { ActivityFeed } from './overview/ActivityFeed';
import { AlertsPanel } from './overview/AlertsPanel';
import { QuickActionsCard } from './QuickActionsCard';
import { DiagnosticsCard } from './DiagnosticsCard';

interface OverviewTabProps {
  onNavigate?: (tab: string) => void;
}

export function OverviewTab({ onNavigate }: OverviewTabProps) {
  const { data: stats, isLoading } = useAdminDashboardStats();

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <KPICards stats={stats} isLoading={isLoading} />

      {/* Revenue + Usage Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RevenueChart />
        <UsageTrendsChart />
      </div>

      {/* Activity Feed + Alerts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ActivityFeed />
        <AlertsPanel onNavigate={onNavigate} />
      </div>

      {/* Quick Actions + Diagnostics */}
      <div className="grid gap-4 lg:grid-cols-3">
        <QuickActionsCard />
        <div className="lg:col-span-2">
          <DiagnosticsCard />
        </div>
      </div>
    </div>
  );
}
