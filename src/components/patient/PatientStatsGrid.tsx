import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Activity, Heart } from "lucide-react";
import { AnimatedStatCard } from "@/components/ui/page-enhancements";
import { motion } from "framer-motion";

interface PatientStats {
  upcomingAppointments: number;
  totalAppointments: number;
  activePrescriptions: number;
}

interface PatientStatsGridProps {
  stats: PatientStats;
  loading?: boolean;
}

/**
 * Patient statistics grid component
 * Displays upcoming appointments, total visits, and active prescriptions
 */
export function PatientStatsGrid({ stats, loading = false }: PatientStatsGridProps) {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <AnimatedStatCard
        title="Upcoming"
        value={stats.upcomingAppointments}
        icon={Calendar}
        gradient="from-blue-500 to-cyan-500"
        suffix=" Appointments"
      />
      <AnimatedStatCard
        title="Total Visits"
        value={stats.totalAppointments}
        icon={Activity}
        gradient="from-purple-500 to-pink-500"
        suffix=" All time"
      />
      <AnimatedStatCard
        title="Active"
        value={stats.activePrescriptions}
        icon={Heart}
        gradient="from-green-500 to-emerald-500"
        suffix=" Prescriptions"
      />
    </div>
  );
}

export default PatientStatsGrid;
