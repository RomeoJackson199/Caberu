import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Users, TrendingUp, AlertTriangle, CheckCircle, Calendar as CalendarIcon } from "lucide-react";
import { getCurrentBusinessId } from "@/lib/businessScopedSupabase";
import { checkDentistCapacity } from "@/lib/smartScheduling";
import { format } from "date-fns";
import { logger } from "@/lib/logger";

interface DentistCapacity {
  dentist_id: string;
  dentist_name: string;
  total_slots: number;
  booked_slots: number;
  available_slots: number;
  capacity_percentage: number;
  is_near_capacity: boolean;
  is_overbooked: boolean;
}

export const CapacityDashboard = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [capacities, setCapacities] = useState<DentistCapacity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCapacities();
  }, [selectedDate]);

  const fetchCapacities = async () => {
    setLoading(true);
    try {
      const businessId = await getCurrentBusinessId();

      // Get all active dentists
      const { data: dentists, error: dentistsError } = await supabase
        .from('dentists')
        .select(`
          id,
          profiles:profile_id (
            first_name,
            last_name
          )
        `)
        .eq('business_id', businessId)
        .eq('is_active', true);

      if (dentistsError || !dentists) {
        logger.error('Error fetching dentists:', dentistsError);
        return;
      }

      // Get capacity for each dentist
      const capacityPromises = dentists.map(async (dentist) => {
        const capacity = await checkDentistCapacity(dentist.id, selectedDate);
        const profile = dentist.profiles as any;

        return {
          dentist_id: dentist.id,
          dentist_name: `Dr. ${profile?.first_name} ${profile?.last_name}`,
          total_slots: capacity?.total_slots ?? 0,
          booked_slots: capacity?.booked_slots ?? 0,
          available_slots: capacity?.available_slots ?? 0,
          capacity_percentage: capacity?.capacity_percentage ?? 0,
          is_near_capacity: capacity?.is_near_capacity ?? false,
          is_overbooked: capacity?.is_overbooked ?? false,
        };
      });

      const capacityData = await Promise.all(capacityPromises);
      setCapacities(capacityData.filter(c => c.total_slots > 0));
    } catch (error) {
      logger.error('Error fetching capacities:', error);
    } finally {
      setLoading(false);
    }
  };

  const overallStats = capacities.reduce(
    (acc, capacity) => ({
      totalSlots: acc.totalSlots + capacity.total_slots,
      bookedSlots: acc.bookedSlots + capacity.booked_slots,
      availableSlots: acc.availableSlots + capacity.available_slots,
      nearCapacity: acc.nearCapacity + (capacity.is_near_capacity ? 1 : 0),
      overbooked: acc.overbooked + (capacity.is_overbooked ? 1 : 0)
    }),
    { totalSlots: 0, bookedSlots: 0, availableSlots: 0, nearCapacity: 0, overbooked: 0 }
  );

  const overallPercentage = overallStats.totalSlots > 0
    ? (overallStats.bookedSlots / overallStats.totalSlots) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Capacity Management</h2>
          <p className="text-muted-foreground">
            Monitor dentist availability and workload distribution
          </p>
        </div>
        <Button onClick={fetchCapacities} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {/* Date Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Select Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="rounded-md border w-fit"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Viewing capacity for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </p>
        </CardContent>
      </Card>

      {/* Overall Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalSlots}</div>
            <p className="text-xs text-muted-foreground">
              Total appointment slots
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilization</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(overallPercentage)}%</div>
            <Progress value={overallPercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.availableSlots}</div>
            <p className="text-xs text-muted-foreground">
              Open slots remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overallStats.nearCapacity + overallStats.overbooked}
            </div>
            <p className="text-xs text-muted-foreground">
              Near capacity or overbooked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Individual Dentist Capacities */}
      <Card>
        <CardHeader>
          <CardTitle>Dentist Workload</CardTitle>
          <CardDescription>
            Current capacity and availability for each dentist
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {capacities.map((capacity) => (
              <div
                key={capacity.dentist_id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{capacity.dentist_name}</h4>
                    {capacity.is_overbooked && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Overbooked
                      </Badge>
                    )}
                    {capacity.is_near_capacity && !capacity.is_overbooked && (
                      <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Near Capacity
                      </Badge>
                    )}
                    {!capacity.is_near_capacity && !capacity.is_overbooked && (
                      <Badge variant="outline" className="border-green-500 text-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Available
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {capacity.booked_slots} / {capacity.total_slots} booked
                    </span>
                    <span>
                      {capacity.available_slots} available
                    </span>
                    <span className="font-semibold">
                      {Math.round(capacity.capacity_percentage)}% capacity
                    </span>
                  </div>
                </div>
                <div className="w-48">
                  <Progress
                    value={capacity.capacity_percentage}
                    className="h-3"
                  />
                </div>
              </div>
            ))}

            {capacities.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                No capacity data available for this date
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {overallStats.overbooked > 0 && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Capacity Alert
            </CardTitle>
          </CardHeader>
          <CardContent className="text-yellow-800">
            <p className="mb-2">
              {overallStats.overbooked} dentist(s) are overbooked for this date.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Consider redistributing appointments to dentists with availability</li>
              <li>Review emergency slot reservations</li>
              <li>Contact patients to reschedule non-urgent appointments</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
