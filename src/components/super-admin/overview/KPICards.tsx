import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminDashboardStats } from '@/hooks/useAdminDashboard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Building2,
  Users,
  DollarSign,
  Phone,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardsProps {
  stats: AdminDashboardStats | undefined;
  isLoading: boolean;
}

export function KPICards({ stats, isLoading }: KPICardsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('de-BE', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100);
  };

  const cards = [
    {
      title: 'Total Practices',
      value: stats?.total_practices || 0,
      sub: `${stats?.active_practices || 0} active · ${stats?.trial_practices || 0} trial`,
      icon: Building2,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Total Patients',
      value: (stats?.total_patients || 0).toLocaleString(),
      sub: 'Across all practices',
      icon: Users,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      title: 'MRR',
      value: formatCurrency(stats?.mrr_cents || 0),
      sub: `${stats?.active_practices || 0} paying practices`,
      icon: DollarSign,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      title: 'Calls Today',
      value: stats?.active_calls_today || 0,
      sub: `${(stats?.voice_minutes_today || 0).toFixed(1)} min used`,
      icon: Phone,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      title: 'WhatsApp Today',
      value: stats?.whatsapp_messages_today || 0,
      sub: 'Messages sent',
      icon: MessageSquare,
      color: 'text-teal-500',
      bg: 'bg-teal-500/10',
    },
    {
      title: 'New Signups',
      value: stats?.new_signups_this_week || 0,
      sub: 'This week',
      icon: TrendingUp,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
    },
    {
      title: 'Unresolved Errors',
      value: stats?.unresolved_errors || 0,
      sub: stats?.unresolved_errors === 0 ? 'All clear' : 'Needs attention',
      icon: AlertTriangle,
      color: stats?.unresolved_errors ? 'text-red-500' : 'text-green-500',
      bg: stats?.unresolved_errors ? 'bg-red-500/10' : 'bg-green-500/10',
    },
    {
      title: 'System Health',
      value: stats?.unresolved_errors === 0 ? 'Healthy' : 'Degraded',
      sub: stats?.unresolved_errors === 0 ? 'All systems operational' : `${stats?.unresolved_errors} issues`,
      icon: Activity,
      color: stats?.unresolved_errors === 0 ? 'text-green-500' : 'text-yellow-500',
      bg: stats?.unresolved_errors === 0 ? 'bg-green-500/10' : 'bg-yellow-500/10',
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={cn('p-1.5 rounded-md', card.bg)}>
                <Icon className={cn('h-3.5 w-3.5', card.color)} />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
