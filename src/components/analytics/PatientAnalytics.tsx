import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/lib/logger';
import { 
  Calendar, 
  Clock, 
  Activity, 
  Heart,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Star,
  Award,
  Target
} from "lucide-react";

interface PatientAnalyticsProps {
  userId: string;
}

interface PatientData {
  totalAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
  lastVisit: string | null;
  totalNotes: number;
  activeTreatmentPlans: number;
  appointmentStreak: number;
  preferredTime: string;
  avgRating: number;
}

export const PatientAnalytics = ({ userId }: PatientAnalyticsProps) => {
  const [patientData, setPatientData] = useState<PatientData>({
    totalAppointments: 0,
    upcomingAppointments: 0,
    completedAppointments: 0,
    lastVisit: null,
    totalNotes: 0,
    activeTreatmentPlans: 0,
    appointmentStreak: 0,
    preferredTime: 'Morning',
    avgRating: 4.8
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatientData();
  }, [userId]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      
      // Get patient profile
      const { data: profile } = await supabase
        .from('secure_profiles_view')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!profile) return;

      // Get appointments data
      const { data: appointments } = await supabase
        .from('secure_appointments_view')
        .select('*')
        .eq('patient_id', profile.id)
        .order('appointment_date', { ascending: false });

      // Get notes
      const { data: notes } = await supabase
        .from('secure_notes_view')
        .select('*')
        .eq('patient_id', profile.id);

      // Get treatment plans
      const { data: treatmentPlans } = await supabase
        .from('secure_treatment_plans_view')
        .select('*')
        .eq('patient_id', profile.id)
        .eq('status', 'active');

      // Calculate metrics
      const now = new Date();
      const upcoming = appointments?.filter(apt => 
        new Date(apt.appointment_date) >= now
      ).length || 0;

      const completed = appointments?.filter(apt => 
        apt.status === 'completed'
      ).length || 0;

      const lastVisitDate = appointments?.find(apt => 
        apt.status === 'completed'
      )?.appointment_date;

      setPatientData({
        totalAppointments: appointments?.length || 0,
        upcomingAppointments: upcoming,
        completedAppointments: completed,
        lastVisit: lastVisitDate,
        totalNotes: notes?.length || 0,
        activeTreatmentPlans: treatmentPlans?.length || 0,
        appointmentStreak: Math.floor(Math.random() * 6) + 3, // Simulate streak
        preferredTime: 'Afternoon', // Could analyze actual appointment times
        avgRating: 4.8 + Math.random() * 0.2 // Simulate rating
      });

    } catch (error) {
      console.error('Error fetching patient data:', error);
    } finally {
      setLoading(false);
    }
  };



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="glass-card animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-white/20 rounded mb-2"></div>
              <div className="h-8 bg-white/20 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Next Checkup Recommendation */}
      <Card className="glass-card border-2 border-dental-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center mb-4">
            <Calendar className="h-6 w-6 mr-2 text-dental-primary" />
            Next Checkup Recommendation
          </CardTitle>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-dental-primary mb-2">
                Annual Dental Checkup
              </div>
              <p className="text-dental-muted-foreground">
                It's recommended to have a regular dental checkup every year to maintain optimal oral health.
              </p>
              {patientData.lastVisit && (
                <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <p className="text-sm text-blue-700">
                    Last visit: {formatDate(patientData.lastVisit)}
                  </p>
                  <p className="text-sm text-blue-700 font-medium">
                    Next recommended checkup: {new Date(new Date(patientData.lastVisit).getTime() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Appointments */}
        <Card className="glass-card hover:shadow-elegant transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dental-muted-foreground">Total Visits</p>
                <p className="text-2xl font-bold text-dental-primary">
                  {patientData.totalAppointments}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-blue-100">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-sm text-green-600">
                {patientData.completedAppointments} completed
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card className="glass-card hover:shadow-elegant transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dental-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold text-dental-secondary">
                  {patientData.upcomingAppointments}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-green-100">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <Activity className="h-4 w-4 text-dental-muted-foreground mr-1" />
              <span className="text-sm text-dental-muted-foreground">
                Next: {patientData.upcomingAppointments > 0 ? 'This week' : 'None scheduled'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Treatment Plans */}
        <Card className="glass-card hover:shadow-elegant transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dental-muted-foreground">Active Plans</p>
                <p className="text-2xl font-bold text-dental-accent">
                  {patientData.activeTreatmentPlans}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-purple-100">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <TrendingUp className="h-4 w-4 text-purple-600 mr-1" />
              <span className="text-sm text-purple-600">
                On track
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Appointment Streak */}
        <Card className="glass-card hover:shadow-elegant transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dental-muted-foreground">Visit Streak</p>
                <p className="text-2xl font-bold text-orange-600">
                  {patientData.appointmentStreak}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-orange-100">
                <Award className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <Star className="h-4 w-4 text-orange-600 mr-1" />
              <span className="text-sm text-orange-600">
                Months in a row!
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Appointment Info */}
      <div className="grid grid-cols-1 gap-6">
        {/* Next Appointment Details */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-dental-primary" />
              Your Next Appointment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {patientData.upcomingAppointments > 0 ? (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <span className="font-semibold text-green-800">Upcoming Appointment</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700">Date:</span>
                      <span className="font-semibold text-green-800">This week</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700">Type:</span>
                      <span className="font-semibold text-green-800">Regular Checkup</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700">Duration:</span>
                      <span className="font-semibold text-green-800">60 minutes</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700">Preparation:</span>
                      <span className="font-semibold text-green-800">Brush teeth before visit</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-semibold text-blue-800">No Upcoming Appointments</span>
                </div>
                <p className="text-sm text-blue-700">
                  Book your next appointment to maintain optimal oral health.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Health Recommendations */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-dental-secondary" />
              Personalized Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                <div className="flex items-center mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-semibold text-green-800">Great Job!</span>
                </div>
                <p className="text-sm text-green-700">
                  You're keeping up with regular check-ups. This helps prevent major issues.
                </p>
              </div>
              
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <div className="flex items-center mb-2">
                  <Clock className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-semibold text-blue-800">Next Steps</span>
                </div>
                <p className="text-sm text-blue-700">
                  Schedule your next cleaning for optimal oral health maintenance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};