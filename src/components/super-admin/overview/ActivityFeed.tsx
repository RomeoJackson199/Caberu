import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRecentActivity, ActivityItem } from '@/hooks/useAdminDashboard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatDistanceToNow } from 'date-fns';
import { Activity, Building2, AlertTriangle, Calendar, CreditCard } from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  signup: Building2,
  error: AlertTriangle,
  appointment: Calendar,
  payment: CreditCard,
};

const colorMap: Record<string, string> = {
  signup: 'text-green-500 bg-green-500/10',
  error: 'text-red-500 bg-red-500/10',
  appointment: 'text-blue-500 bg-blue-500/10',
  payment: 'text-purple-500 bg-purple-500/10',
};

export function ActivityFeed() {
  const { data: activities, isLoading } = useRecentActivity();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          Recent Activity
        </CardTitle>
        <CardDescription>Latest platform events</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {activities.map((item) => {
              const Icon = iconMap[item.type] || Activity;
              const colors = colorMap[item.type] || 'text-muted-foreground bg-muted';
              return (
                <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className={`p-2 rounded-lg ${colors.split(' ')[1]}`}>
                    <Icon className={`h-4 w-4 ${colors.split(' ')[0]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                  {item.severity && (
                    <Badge
                      variant={item.severity === 'critical' ? 'destructive' : 'secondary'}
                      className="text-xs shrink-0"
                    >
                      {item.severity}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
