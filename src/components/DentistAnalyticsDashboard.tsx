import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useToast } from '@/hooks/use-toast';
import {
  TrendingUp,
  Calendar,
  Star,
  Users,
  Activity,
  BarChart3,
  Trophy,
  Download,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { PractitionerPicker, TeamQuickStats, PractitionerComparisonCard } from '@/components/admin';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [selectedPractitioner, setSelectedPractitioner] = useState<string | 'all'>('all');
  const [viewMode, setViewMode] = useState<'individual' | 'leaderboard' | 'comparison'>('individual');
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
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

      // Get all dentist IDs for batch query
      const dentistIds = (dentists || []).map((d: any) => d.id);

      // OPTIMIZED: Batch fetch ALL appointments for ALL dentists in one query
      let appointmentsQuery = supabase
        .from('secure_appointments_view')
        .select('id, status, dentist_id')
        .in('dentist_id', dentistIds)
        .eq('business_id', businessId);

      if (timeRange !== 'all') {
        appointmentsQuery = appointmentsQuery.gte('appointment_date', dateFilter.toISOString().split('T')[0]);
      }

      const { data: allAppointments } = await appointmentsQuery;

      // Aggregate appointments by dentist in-memory (much faster than N queries)
      const appointmentsByDentist = new Map<string, { total: number; confirmed: number; completed: number; cancelled: number }>();
      
      // Initialize all dentists
      dentistIds.forEach(id => {
        appointmentsByDentist.set(id, { total: 0, confirmed: 0, completed: 0, cancelled: 0 });
      });

      // Count appointments
      (allAppointments || []).forEach((apt: any) => {
        const stats = appointmentsByDentist.get(apt.dentist_id);
        if (stats) {
          stats.total++;
          if (apt.status === 'confirmed') stats.confirmed++;
          if (apt.status === 'completed') stats.completed++;
          if (apt.status === 'cancelled') stats.cancelled++;
        }
      });

      // Build analytics data from dentists + aggregated counts
      const analyticsData: DentistAnalytics[] = (dentists || []).map((dentist: any) => {
        const profile = Array.isArray(dentist.profiles) ? dentist.profiles[0] : dentist.profiles;
        const stats = appointmentsByDentist.get(dentist.id) || { total: 0, confirmed: 0, completed: 0, cancelled: 0 };

        return {
          dentist_id: dentist.id,
          dentist_name: `Dr ${profile?.first_name || ''} ${profile?.last_name || ''}`,
          total_appointments: stats.total,
          confirmed_appointments: stats.confirmed,
          completed_appointments: stats.completed,
          cancelled_appointments: stats.cancelled,
          average_rating: dentist.average_rating || 0,
          total_ratings: dentist.total_ratings || 0,
          communication_score: dentist.communication_score || 0,
          expertise_score: dentist.expertise_score || 0,
          wait_time_score: dentist.wait_time_score || 0,
          is_active: dentist.is_active,
        };
      });

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

  // Filter analytics based on selected practitioner
  const filteredAnalytics = useMemo(() => {
    if (selectedPractitioner === 'all') return analytics;
    return analytics.filter(a => a.dentist_id === selectedPractitioner);
  }, [analytics, selectedPractitioner]);

  // Leaderboard sorted by different metrics
  const leaderboard = useMemo(() => {
    return [...analytics].sort((a, b) => b.total_appointments - a.total_appointments);
  }, [analytics]);

  const totalStats = {
    totalAppointments: filteredAnalytics.reduce((sum, d) => sum + d.total_appointments, 0),
    totalCompleted: filteredAnalytics.reduce((sum, d) => sum + d.completed_appointments, 0),
    totalCancelled: filteredAnalytics.reduce((sum, d) => sum + d.cancelled_appointments, 0),
    avgRating: filteredAnalytics.length > 0
      ? filteredAnalytics.reduce((sum, d) => sum + d.average_rating, 0) / filteredAnalytics.length
      : 0,
  };

  const handleExportCSV = () => {
    const headers = ['Practitioner', 'Total Appointments', 'Completed', 'Cancelled', 'Completion Rate', 'Rating'];
    const rows = analytics.map(d => [
      d.dentist_name,
      d.total_appointments,
      d.completed_appointments,
      d.cancelled_appointments,
      d.total_appointments > 0 ? ((d.completed_appointments / d.total_appointments) * 100).toFixed(1) + '%' : '0%',
      d.average_rating.toFixed(1),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `practitioner-analytics-${timeRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleComparison = (id: string) => {
    setComparisonIds(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : prev.length < 3 ? [...prev, id] : prev
    );
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
      {/* Header with Team Stats */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold">Practitioner Analytics</h2>
            <p className="text-muted-foreground">Performance metrics and insights</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <PractitionerPicker
              selectedId={selectedPractitioner}
              onSelect={setSelectedPractitioner}
              showAll={true}
              label="Filter by"
            />
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
        <TeamQuickStats />
      </div>

      {/* Time Range Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground mr-2">Period:</span>
        {(['7days', '30days', '90days', 'all'] as const).map((range) => (
          <Badge
            key={range}
            variant={timeRange === range ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setTimeRange(range)}
          >
            {range === 'all' ? 'All Time' : range.replace('days', ' Days')}
          </Badge>
        ))}
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
            <p className="text-xs text-muted-foreground">
              {selectedPractitioner === 'all' ? 'Across all practitioners' : 'Selected practitioner'}
            </p>
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
            <p className="text-xs text-muted-foreground">
              {selectedPractitioner === 'all' ? 'Team average' : 'Individual rating'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Practitioners</CardTitle>
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

      {/* View Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
        <TabsList>
          <TabsTrigger value="individual">Individual</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="comparison">Compare</TabsTrigger>
        </TabsList>

        {/* Individual Performance Tab */}
        <TabsContent value="individual" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Individual Performance</span>
              </CardTitle>
              <CardDescription>Detailed breakdown by practitioner</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {filteredAnalytics.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                    <p>No analytics data available</p>
                  </div>
                ) : (
                  filteredAnalytics.map((dentist) => (
                    <div key={dentist.dentist_id} className="border rounded-lg p-4 space-y-4 bg-card">
                      {/* Dentist Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
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
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span>Performance Leaderboard</span>
              </CardTitle>
              <CardDescription>Practitioners ranked by total appointments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.map((dentist, index) => (
                  <div
                    key={dentist.dentist_id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      index === 0 ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' :
                      index === 1 ? 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700' :
                      index === 2 ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800' :
                      'bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-orange-500 text-white' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{dentist.dentist_name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <span>{dentist.total_appointments} appointments</span>
                          {dentist.average_rating > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {dentist.average_rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {dentist.total_appointments > 0 
                          ? Math.round((dentist.completed_appointments / dentist.total_appointments) * 100)
                          : 0}%
                      </div>
                      <div className="text-xs text-muted-foreground">Completion</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Practitioners to Compare</CardTitle>
              <CardDescription>Choose up to 3 practitioners for side-by-side comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {analytics.map((dentist) => (
                  <Badge
                    key={dentist.dentist_id}
                    variant={comparisonIds.includes(dentist.dentist_id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleComparison(dentist.dentist_id)}
                  >
                    {dentist.dentist_name}
                    {comparisonIds.includes(dentist.dentist_id) && ' ✓'}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {comparisonIds.length >= 2 && (
            <PractitionerComparisonCard
              practitionerIds={comparisonIds}
              timeRange={timeRange === 'all' ? '90days' : timeRange}
            />
          )}

          {comparisonIds.length < 2 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Select at least 2 practitioners to compare
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
