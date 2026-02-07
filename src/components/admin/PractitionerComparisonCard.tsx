import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface PractitionerStats {
  id: string;
  name: string;
  avatar_url: string | null;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  completionRate: number;
  cancellationRate: number;
  averageRating: number;
}

interface PractitionerComparisonCardProps {
  practitionerIds: string[];
  timeRange?: '7days' | '30days' | '90days';
}

export function PractitionerComparisonCard({
  practitionerIds,
  timeRange = '30days',
}: PractitionerComparisonCardProps) {
  const [practitioners, setPractitioners] = useState<PractitionerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const { businessId } = useBusinessContext();

  useEffect(() => {
    if (businessId && practitionerIds.length > 0) {
      fetchComparisonData();
    }
  }, [businessId, practitionerIds, timeRange]);

  const fetchComparisonData = async () => {
    try {
      setLoading(true);

      // Calculate date filter
      let days = 30;
      if (timeRange === '7days') days = 7;
      if (timeRange === '90days') days = 90;
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

      // Fetch dentist info
      const { data: dentists } = await supabase
        .from('dentists')
        .select(`
          id,
          average_rating,
          profiles (
            first_name,
            last_name,
            avatar_url
          )
        `)
        .in('id', practitionerIds);

      if (!dentists) {
        setPractitioners([]);
        return;
      }

      // OPTIMIZED: Batch fetch ALL appointments for ALL selected practitioners in one query
      const { data: allAppointments } = await supabase
        .from('appointments_decrypted')
        .select('id, status, dentist_id')
        .in('dentist_id', practitionerIds)
        .eq('business_id', businessId)
        .gte('appointment_date', startDate);

      // Aggregate by dentist in-memory
      const statsByDentist = new Map<string, { total: number; completed: number; cancelled: number }>();
      
      practitionerIds.forEach(id => {
        statsByDentist.set(id, { total: 0, completed: 0, cancelled: 0 });
      });

      (allAppointments || []).forEach((apt: any) => {
        const stats = statsByDentist.get(apt.dentist_id);
        if (stats) {
          stats.total++;
          if (apt.status === 'completed') stats.completed++;
          if (apt.status === 'cancelled') stats.cancelled++;
        }
      });

      // Build practitioner stats from dentists + aggregated counts
      const stats: PractitionerStats[] = dentists.map((dentist: any) => {
        const profile = Array.isArray(dentist.profiles) ? dentist.profiles[0] : dentist.profiles;
        const aptStats = statsByDentist.get(dentist.id) || { total: 0, completed: 0, cancelled: 0 };

        return {
          id: dentist.id,
          name: `Dr ${profile?.first_name || ''} ${profile?.last_name || ''}`,
          avatar_url: profile?.avatar_url || null,
          totalAppointments: aptStats.total,
          completedAppointments: aptStats.completed,
          cancelledAppointments: aptStats.cancelled,
          completionRate: aptStats.total > 0 ? (aptStats.completed / aptStats.total) * 100 : 0,
          cancellationRate: aptStats.total > 0 ? (aptStats.cancelled / aptStats.total) * 100 : 0,
          averageRating: dentist.average_rating || 0,
        };
      });

      setPractitioners(stats);
    } catch (error) {
      console.error('Error fetching comparison data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWinner = (metric: keyof PractitionerStats, higherIsBetter = true) => {
    if (practitioners.length < 2) return null;
    const sorted = [...practitioners].sort((a, b) => {
      const aVal = a[metric] as number;
      const bVal = b[metric] as number;
      return higherIsBetter ? bVal - aVal : aVal - bVal;
    });
    return sorted[0]?.id;
  };

  const renderMetricRow = (
    label: string,
    metric: keyof PractitionerStats,
    format: (val: number) => string = (v) => v.toString(),
    higherIsBetter = true
  ) => {
    const winnerId = getWinner(metric, higherIsBetter);

    return (
      <div className="py-3 border-b last:border-b-0">
        <div className="text-sm font-medium text-muted-foreground mb-2">{label}</div>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${practitioners.length}, 1fr)` }}>
          {practitioners.map((p) => {
            const value = p[metric] as number;
            const isWinner = p.id === winnerId && practitioners.length > 1;
            
            return (
              <div
                key={p.id}
                className={`text-center p-2 rounded-lg transition-colors ${
                  isWinner ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                }`}
              >
                <div className={`text-lg font-bold ${isWinner ? 'text-primary' : ''}`}>
                  {format(value)}
                  {isWinner && <Trophy className="inline-block h-4 w-4 ml-1 text-yellow-500" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Practitioner Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (practitioners.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Practitioner Comparison</CardTitle>
          <CardDescription>Select practitioners to compare their performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No practitioners selected for comparison
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Practitioner Comparison
        </CardTitle>
        <CardDescription>
          Side-by-side performance metrics for the last {timeRange.replace('days', ' days')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Practitioner Headers */}
        <div
          className="grid gap-4 mb-4"
          style={{ gridTemplateColumns: `repeat(${practitioners.length}, 1fr)` }}
        >
          {practitioners.map((p) => (
            <div key={p.id} className="text-center">
              <Avatar className="h-12 w-12 mx-auto mb-2">
                <AvatarImage src={p.avatar_url || undefined} />
                <AvatarFallback>
                  {p.name.split(' ').slice(1).map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="font-medium text-sm truncate">{p.name}</div>
            </div>
          ))}
        </div>

        {/* Metrics */}
        <div className="space-y-1">
          {renderMetricRow('Total Appointments', 'totalAppointments', (v) => v.toString())}
          {renderMetricRow('Completed', 'completedAppointments', (v) => v.toString())}
          {renderMetricRow('Completion Rate', 'completionRate', (v) => `${v.toFixed(0)}%`)}
          {renderMetricRow('Cancellation Rate', 'cancellationRate', (v) => `${v.toFixed(0)}%`, false)}
          {renderMetricRow('Average Rating', 'averageRating', (v) => v.toFixed(1))}
        </div>
      </CardContent>
    </Card>
  );
}
