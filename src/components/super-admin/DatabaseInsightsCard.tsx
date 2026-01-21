import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatDistanceToNow } from 'date-fns';
import {
  Database,
  RefreshCw,
  Table,
  AlertTriangle,
  Shield,
  HardDrive,
  Users,
  Calendar,
  Building2,
} from 'lucide-react';

interface TableStats {
  name: string;
  icon: React.ElementType;
  color: string;
}

interface SystemError {
  id: string;
  error_type: string;
  error_message: string;
  severity: string;
  created_at: string;
  resolved: boolean;
}

const KEY_TABLES: TableStats[] = [
  { name: 'profiles', icon: Users, color: 'text-blue-500' },
  { name: 'businesses', icon: Building2, color: 'text-green-500' },
  { name: 'appointments', icon: Calendar, color: 'text-purple-500' },
  { name: 'dentists', icon: Users, color: 'text-orange-500' },
  { name: 'system_errors', icon: AlertTriangle, color: 'text-red-500' },
];

export function DatabaseInsightsCard() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch table counts
  const { data: tableCounts, isLoading: countsLoading, refetch: refetchCounts } = useQuery({
    queryKey: ['super-admin-table-counts'],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      
      await Promise.all(
        KEY_TABLES.map(async (table) => {
          try {
            const { count, error } = await supabase
              .from(table.name as 'profiles' | 'businesses' | 'appointments' | 'dentists' | 'system_errors')
              .select('*', { count: 'exact', head: true });
            
            if (!error) {
              counts[table.name] = count || 0;
            }
          } catch {
            counts[table.name] = 0;
          }
        })
      );
      
      return counts;
    },
  });

  // Fetch recent errors
  const { data: recentErrors, isLoading: errorsLoading, refetch: refetchErrors } = useQuery({
    queryKey: ['super-admin-recent-errors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_errors')
        .select('id, error_type, error_message, severity, created_at, resolved')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data as SystemError[];
    },
  });

  // Fetch storage buckets
  const { data: storageBuckets, isLoading: storageLoading, refetch: refetchStorage } = useQuery({
    queryKey: ['super-admin-storage-buckets'],
    queryFn: async () => {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) throw error;
      return data;
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchCounts(), refetchErrors(), refetchStorage()]);
    setIsRefreshing(false);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Medium</Badge>;
      default:
        return <Badge variant="secondary">Low</Badge>;
    }
  };

  const isLoading = countsLoading || errorsLoading || storageLoading;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              Database Insights
            </CardTitle>
            <CardDescription>
              Table metrics, errors, and storage overview
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Table Row Counts */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Table className="h-4 w-4" />
            Table Statistics
          </h4>
          {countsLoading ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner size="sm" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {KEY_TABLES.map((table) => {
                const Icon = table.icon;
                return (
                  <div
                    key={table.name}
                    className="p-3 border rounded-lg flex items-center gap-3"
                  >
                    <div className="p-2 rounded-lg bg-accent">
                      <Icon className={`h-4 w-4 ${table.color}`} />
                    </div>
                    <div>
                      <p className="text-lg font-bold">
                        {tableCounts?.[table.name]?.toLocaleString() || 0}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {table.name.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Storage Buckets */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Storage Buckets
          </h4>
          {storageLoading ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner size="sm" />
            </div>
          ) : storageBuckets && storageBuckets.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {storageBuckets.map((bucket) => (
                <Badge key={bucket.id} variant="outline" className="gap-1">
                  <HardDrive className="h-3 w-3" />
                  {bucket.name}
                  {bucket.public && (
                    <span className="text-green-500 ml-1">•</span>
                  )}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No storage buckets configured</p>
          )}
        </div>

        {/* Recent Errors */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Recent Errors
          </h4>
          {errorsLoading ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner size="sm" />
            </div>
          ) : recentErrors && recentErrors.length > 0 ? (
            <div className="space-y-2">
              {recentErrors.map((error) => (
                <div
                  key={error.id}
                  className={`p-3 border rounded-lg ${error.resolved ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">
                          {error.error_type}
                        </p>
                        {getSeverityBadge(error.severity)}
                        {error.resolved && (
                          <Badge variant="outline" className="text-green-600">Resolved</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {error.error_message}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(error.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent errors 🎉
            </p>
          )}
        </div>

        {/* RLS Status Note */}
        <div className="p-4 bg-accent/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Row-Level Security</span>
          </div>
          <p className="text-xs text-muted-foreground">
            RLS policies are enforced on all tables. Use the Diagnostics card to run a full RLS test.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
