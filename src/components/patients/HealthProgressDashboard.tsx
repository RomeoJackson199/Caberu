import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Calendar, 
  Trophy, 
  Image as ImageIcon,
  CheckCircle,
  Clock,
  Award
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface HealthMetrics {
  totalAppointments: number;
  completedAppointments: number;
  upcomingAppointments: number;
  lastVisit: Date | null;
  treatmentPhotos: number;
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    achieved_at: string;
    milestone_type: string;
  }>;
}

export function HealthProgressDashboard() {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<HealthMetrics>({
    totalAppointments: 0,
    completedAppointments: 0,
    upcomingAppointments: 0,
    lastVisit: null,
    treatmentPhotos: 0,
    milestones: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealthMetrics();
  }, []);

  const fetchHealthMetrics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Fetch appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', profile.id);

      const completed = appointments?.filter(a => a.status === 'completed') || [];
      const upcoming = appointments?.filter(
        a => new Date(a.appointment_date) > new Date() && a.status !== 'cancelled'
      ) || [];
      
      const lastVisit = completed.length > 0
        ? new Date(Math.max(...completed.map(a => new Date(a.appointment_date).getTime())))
        : null;

      // Fetch treatment photos
      const { data: photos } = await supabase
        .from('treatment_photos')
        .select('id')
        .eq('patient_id', profile.id);

      // Fetch milestones
      const { data: milestones } = await supabase
        .from('health_milestones')
        .select('*')
        .eq('patient_id', profile.id)
        .order('achieved_at', { ascending: false })
        .limit(5);

      setMetrics({
        totalAppointments: appointments?.length || 0,
        completedAppointments: completed.length,
        upcomingAppointments: upcoming.length,
        lastVisit,
        treatmentPhotos: photos?.length || 0,
        milestones: milestones || [],
      });
    } catch (error) {
      console.error('Error fetching health metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load health progress",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const completionRate = metrics.totalAppointments > 0
    ? (metrics.completedAppointments / metrics.totalAppointments) * 100
    : 0;

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-8 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Your Dental Health Journey
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Treatment Progress</span>
              <span className="font-medium">{Math.round(completionRate)}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {metrics.totalAppointments}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Total Visits
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {metrics.completedAppointments}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Completed
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {metrics.upcomingAppointments}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Upcoming
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Visit */}
      {metrics.lastVisit && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Last Visit</p>
                  <p className="text-sm text-muted-foreground">
                    {format(metrics.lastVisit, 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {Math.floor((new Date().getTime() - metrics.lastVisit.getTime()) / (1000 * 60 * 60 * 24))} days ago
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Milestones */}
      {metrics.milestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Health Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.milestones.map((milestone) => (
                <div key={milestone.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Award className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{milestone.title}</h4>
                    {milestone.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {milestone.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(milestone.achieved_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Treatment Photos */}
      {metrics.treatmentPhotos > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Treatment Documentation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{metrics.treatmentPhotos} Photos</p>
                <p className="text-sm text-muted-foreground">
                  Before & after progress photos
                </p>
              </div>
              <Button variant="outline" size="sm">
                View Gallery
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {metrics.totalAppointments === 0 && (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">Start Your Health Journey</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Book your first appointment to begin tracking your dental health progress
            </p>
            <Button>Book Appointment</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
