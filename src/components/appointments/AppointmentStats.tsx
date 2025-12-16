import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  DollarSign,
  Target
} from 'lucide-react';
import { formatClinicTime } from '@/lib/timezone';
import { Appointment } from './AppointmentManager';

interface AppointmentStatsProps {
  appointments: Appointment[];
  dentistId: string;
}

export const AppointmentStats: React.FC<AppointmentStatsProps> = ({ appointments }) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  // Calculate statistics
  const stats = {
    total: appointments.length,
    today: appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      return aptDate >= todayStart && aptDate < todayEnd && apt.status !== 'cancelled';
    }).length,
    upcoming: appointments.filter(apt => 
      new Date(apt.appointment_date) >= todayStart && 
      apt.status !== 'cancelled' && 
      apt.status !== 'completed'
    ).length,
    urgent: appointments.filter(apt => 
      apt.urgency === 'high' && 
      new Date(apt.appointment_date) >= todayStart &&
      apt.status !== 'cancelled'
    ).length,
    pending: appointments.filter(apt => apt.status === 'pending').length,
    completed: appointments.filter(apt => apt.status === 'completed').length,
    cancelled: appointments.filter(apt => apt.status === 'cancelled').length,
    revenue: appointments
      .filter(apt => apt.status === 'completed')
      .reduce((sum, apt) => {
        // Estimate revenue based on urgency
        const rates: Record<string, number> = { emergency: 300, high: 200, medium: 150, low: 100 };
        return sum + (rates[apt.urgency] || 100);
      }, 0),
  };

  const completionRate = stats.total > 0 ? 
    Math.round((stats.completed / (stats.completed + stats.cancelled)) * 100) || 0 : 0;

  const nextAppointment = appointments
    .filter(apt => 
      new Date(apt.appointment_date) > now && 
      apt.status !== 'cancelled'
    )
    .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())[0];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.today}</div>
          <p className="text-xs text-muted-foreground">
            {stats.pending > 0 && `${stats.pending} pending`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.upcoming}</div>
          {nextAppointment && (
            <p className="text-xs text-muted-foreground">
              Next: {formatClinicTime(nextAppointment.appointment_date, 'HH:mm')}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Urgent Cases</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
          <p className="text-xs text-muted-foreground">
            High priority appointments
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completionRate}%</div>
          <p className="text-xs text-muted-foreground">
            {stats.completed} completed, {stats.cancelled} cancelled
          </p>
        </CardContent>
      </Card>

      {/* Revenue Card - spans 2 columns on larger screens */}
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenue (Estimated)</CardTitle>
          <DollarSign className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">€{stats.revenue}</div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
            <span>{stats.completed} completed appointments</span>
            <Badge variant="outline" className="text-xs">
              Avg: €{stats.completed > 0 ? Math.round(stats.revenue / stats.completed) : 0}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Status Summary - spans 2 columns */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pending</span>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                {stats.pending}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Confirmed</span>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {appointments.filter(apt => apt.status === 'confirmed').length}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Completed</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {stats.completed}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Cancelled</span>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                {stats.cancelled}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};