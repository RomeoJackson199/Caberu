import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUsageAlerts, UsageAlert } from '@/hooks/useAdminDashboard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Bell, AlertTriangle, CreditCard, Zap, Server } from 'lucide-react';

const alertIcons: Record<string, React.ElementType> = {
  usage: Zap,
  billing: CreditCard,
  error: AlertTriangle,
  system: Server,
};

const severityStyles: Record<string, string> = {
  critical: 'border-red-500/30 bg-red-500/5',
  warning: 'border-yellow-500/30 bg-yellow-500/5',
  info: 'border-blue-500/30 bg-blue-500/5',
};

interface AlertsPanelProps {
  onNavigate?: (tab: string) => void;
}

export function AlertsPanel({ onNavigate }: AlertsPanelProps) {
  const { data: alerts, isLoading } = useUsageAlerts();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-yellow-500" />
          Alerts
          {alerts && alerts.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {alerts.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Issues requiring attention</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : alerts && alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const Icon = alertIcons[alert.type] || AlertTriangle;
              return (
                <div
                  key={alert.id}
                  className={`p-4 border rounded-lg ${severityStyles[alert.severity] || ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Icon className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{alert.title}</p>
                        {alert.description && (
                          <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                        )}
                      </div>
                    </div>
                    {alert.action && onNavigate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs shrink-0"
                        onClick={() => {
                          if (alert.type === 'error') onNavigate('errors');
                          else if (alert.type === 'billing') onNavigate('businesses');
                        }}
                      >
                        {alert.action}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No active alerts</p>
            <p className="text-xs">Everything is running smoothly</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
