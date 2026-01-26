import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useToast } from '@/hooks/use-toast';
import {
  TrendingUp,
  Calendar,
  Star,
  Users,
  DollarSign,
  Activity,
  Award,
  BarChart3
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

interface DentistAnalytics {
  dentist_id: string;
  dentist_name: string;
  total_appointments: number;
  confirmed_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  average_rating: number;
  total_ratings: number;
  communication_score: number;
  expertise_score: number;
  wait_time_score: number;
  is_active: boolean;
}

export const DentistAnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<DentistAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days' | 'all'>('30days');
  const { businessId } = useBusinessContext();
  const { toast } = useToast();

  useEffect(() => {
    if (businessId) {
      fetchAnalytics();
    }
  }, [businessId, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Get dentists for this business
      const { data: businessMembers, error: membersError } = await supabase
        .from('business_members')
        .select('profile_id')
        .eq('business_id', businessId)
        .in('role', ['dentist', 'admin', 'owner']);

      if (membersError) throw membersError;

      if (!businessMembers || businessMembers.length === 0) {
        setAnalytics([]);
        return;
      }

      const profileIds = businessMembers.map(m => m.profile_id);

      // Fetch dentists with their ratings
      const { data: dentists, error: dentistsError } = await supabase
        .from('dentists')
        .select(`
          id,
          is_active,
          average_rating,
          total_ratings,
          communication_score,
          expertise_score,
          wait_time_score,
          profiles (
            first_name,
            last_name
          )
        `)
        .in('profile_id', profileIds);

      if (dentistsError) throw dentistsError;

      // Calculate date filter
      let dateFilter = new Date();
      if (timeRange === '7days') {
        dateFilter.setDate(dateFilter.getDate() - 7);
      } else if (timeRange === '30days') {
        dateFilter.setDate(dateFilter.getDate() - 30);
      } else if (timeRange === '90days') {
        dateFilter.setDate(dateFilter.getDate() - 90);
      }

      // Fetch appointments for each dentist
      const analyticsData: DentistAnalytics[] = await Promise.all(
        (dentists || []).map(async (dentist) => {
          let query = supabase
            .from('appointments')
            .select('id, status')
            .eq('dentist_id', dentist.id)
            .eq('business_id', businessId);

          if (timeRange !== 'all') {
            query = query.gte('scheduled_date', dateFilter.toISOString().split('T')[0]);
          }

          const { data: appointments } = await query;

          const total = appointments?.length || 0;
          const confirmed = appointments?.filter(a => a.status === 'confirmed').length || 0;
          const completed = appointments?.filter(a => a.status === 'completed').length || 0;
          const cancelled = appointments?.filter(a => a.status === 'cancelled').length || 0;

          return {
            dentist_id: dentist.id,
            dentist_name: `Dr ${dentist.profiles.first_name} ${dentist.profiles.last_name}`,
            total_appointments: total,
            confirmed_appointments: confirmed,
            completed_appointments: completed,
            cancelled_appointments: cancelled,
            average_rating: dentist.average_rating || 0,
            total_ratings: dentist.total_ratings || 0,
            communication_score: dentist.communication_score || 0,
            expertise_score: dentist.expertise_score || 0,
            wait_time_score: dentist.wait_time_score || 0,
            is_active: dentist.is_active,
          };
        })
      );

      // Sort by total appointments
      analyticsData.sort((a, b) => b.total_appointments - a.total_appointments);

      setAnalytics(analyticsData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateUtilization = (total: number, maxExpected: number = 100) => {
    return Math.min((total / maxExpected) * 100, 100);
  };

  const totalStats = {
    totalAppointments: analytics.reduce((sum, d) => sum + d.total_appointments, 0),
    totalCompleted: analytics.reduce((sum, d) => sum + d.completed_appointments, 0),
    totalCancelled: analytics.reduce((sum, d) => sum + d.cancelled_appointments, 0),
    avgRating: analytics.length > 0
      ? analytics.reduce((sum, d) => sum + d.average_rating, 0) / analytics.length
      : 0,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dentist Analytics</h2>
          <p className="text-muted-foreground">Performance metrics and insights</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge
            variant={timeRange === '7days' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setTimeRange('7days')}
          >
            7 Days
          </Badge>
          <Badge
            variant={timeRange === '30days' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setTimeRange('30days')}
          >
            30 Days
          </Badge>
          <Badge
            variant={timeRange === '90days' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setTimeRange('90days')}
          >
            90 Days
          </Badge>
          <Badge
            variant={timeRange === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setTimeRange('all')}
          >
            All Time
          </Badge>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalAppointments}</div>
            <p className="text-xs text-muted-foreground">Across all dentists</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalStats.totalCompleted}</div>
            <p className="text-xs text-muted-foreground">
              {totalStats.totalAppointments > 0
                ? `${Math.round((totalStats.totalCompleted / totalStats.totalAppointments) * 100)}% completion rate`
                : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              {totalStats.avgRating.toFixed(1)}
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 ml-1" />
            </div>
            <p className="text-xs text-muted-foreground">Across all dentists</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Dentists</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.filter(d => d.is_active).length}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.length} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Individual Dentist Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Individual Performance</span>
          </CardTitle>
          <CardDescription>Detailed breakdown by dentist</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {analytics.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No analytics data available</p>
              </div>
            ) : (
              analytics.map((dentist) => (
                <div key={dentist.dentist_id} className="border rounded-lg p-4 space-y-4">
                  {/* Dentist Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-dental-primary/10 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-dental-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{dentist.dentist_name}</h3>
                        <Badge variant={dentist.is_active ? 'default' : 'secondary'} className="text-xs">
                          {dentist.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    {dentist.total_ratings > 0 && (
                      <div className="flex items-center space-x-1">
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{dentist.average_rating.toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">({dentist.total_ratings})</span>
                      </div>
                    )}
                  </div>

                  {/* Appointment Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-2xl font-bold">{dentist.total_appointments}</div>
                      <div className="text-xs text-muted-foreground">Total Appointments</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{dentist.completed_appointments}</div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{dentist.confirmed_appointments}</div>
                      <div className="text-xs text-muted-foreground">Confirmed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{dentist.cancelled_appointments}</div>
                      <div className="text-xs text-muted-foreground">Cancelled</div>
                    </div>
                  </div>

                  {/* Utilization */}
                  {timeRange !== 'all' && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Utilization Rate</span>
                        <span className="text-sm text-muted-foreground">
                          {calculateUtilization(dentist.total_appointments).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={calculateUtilization(dentist.total_appointments)} />
                    </div>
                  )}

                  {/* Rating Breakdown */}
                  {dentist.total_ratings > 0 && (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Communication</span>
                          <span className="text-xs font-medium">{dentist.communication_score.toFixed(1)}</span>
                        </div>
                        <Progress value={(dentist.communication_score / 5) * 100} className="h-1.5" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Expertise</span>
                          <span className="text-xs font-medium">{dentist.expertise_score.toFixed(1)}</span>
                        </div>
                        <Progress value={(dentist.expertise_score / 5) * 100} className="h-1.5" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Wait Time</span>
                          <span className="text-xs font-medium">{dentist.wait_time_score.toFixed(1)}</span>
                        </div>
                        <Progress value={(dentist.wait_time_score / 5) * 100} className="h-1.5" />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
