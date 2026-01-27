import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, Star, Clock, TrendingUp } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';

interface TeamStats {
  totalPractitioners: number;
  activePractitioners: number;
  todayAppointments: number;
  weekAppointments: number;
  pendingApprovals: number;
  averageRating: number;
}

interface TeamQuickStatsProps {
  className?: string;
}

export function TeamQuickStats({ className }: TeamQuickStatsProps) {
  const [stats, setStats] = useState<TeamStats>({
    totalPractitioners: 0,
    activePractitioners: 0,
    todayAppointments: 0,
    weekAppointments: 0,
    pendingApprovals: 0,
    averageRating: 0,
  });
  const [loading, setLoading] = useState(true);
  const { businessId } = useBusinessContext();

  useEffect(() => {
    if (businessId) {
      fetchStats();
    }
  }, [businessId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

      // Get practitioners count
      const { data: businessMembers } = await supabase
        .from('business_members')
        .select('profile_id')
        .eq('business_id', businessId)
        .in('role', ['dentist', 'admin', 'owner']);

      const profileIds = businessMembers?.map(m => m.profile_id) || [];

      // Get dentists with ratings
      const { data: dentists } = await supabase
        .from('dentists')
        .select('id, is_active, average_rating')
        .in('profile_id', profileIds);

      const totalPractitioners = dentists?.length || 0;
      const activePractitioners = dentists?.filter(d => d.is_active).length || 0;
      const ratings = dentists?.filter(d => d.average_rating > 0).map(d => d.average_rating) || [];
      const averageRating = ratings.length > 0 
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
        : 0;

      // Get today's appointments count
      const todayStr = format(today, 'yyyy-MM-dd');
      const { count: todayCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('scheduled_date', todayStr)
        .neq('status', 'cancelled');

      // Get week appointments count
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
      const { count: weekCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .gte('scheduled_date', weekStartStr)
        .lte('scheduled_date', weekEndStr)
        .neq('status', 'cancelled');

      // Get pending approvals
      const { count: pendingCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('status', 'pending');

      setStats({
        totalPractitioners,
        activePractitioners,
        todayAppointments: todayCount || 0,
        weekAppointments: weekCount || 0,
        pendingApprovals: pendingCount || 0,
        averageRating,
      });
    } catch (error) {
      console.error('Error fetching team stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 flex-wrap">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-8 w-24 bg-muted animate-pulse rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5">
          <Users className="h-3.5 w-3.5" />
          <span>{stats.activePractitioners}/{stats.totalPractitioners} Active</span>
        </Badge>

        <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5">
          <Calendar className="h-3.5 w-3.5" />
          <span>{stats.todayAppointments} Today</span>
        </Badge>

        <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>{stats.weekAppointments} This Week</span>
        </Badge>

        {stats.pendingApprovals > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1.5 px-3 py-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{stats.pendingApprovals} Pending</span>
          </Badge>
        )}

        {stats.averageRating > 0 && (
          <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            <span>{stats.averageRating.toFixed(1)} Avg Rating</span>
          </Badge>
        )}
      </div>
    </div>
  );
}
