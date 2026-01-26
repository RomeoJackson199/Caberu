/**
 * Dashboard Stats - Compact inline stats chips for the dashboard header
 */

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar, 
  Clock, 
  CheckCircle,
  Users,
  TrendingUp
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { AnimatedCounter } from "@/components/ui/micro-interactions";

interface DashboardStatsProps {
  todayCount: number;
  pendingCount: number;
  weekCompleted: number;
  totalPatients: number;
  loading?: boolean;
  className?: string;
  onStatClick?: (stat: 'today' | 'pending' | 'week' | 'patients') => void;
}

interface StatChipProps {
  icon: React.ElementType;
  value: number;
  label: string;
  color: string;
  onClick?: () => void;
  delay?: number;
}

function StatChip({ icon: Icon, value, label, color, onClick, delay = 0 }: StatChipProps) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.2 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        "bg-card border shadow-sm",
        "hover:shadow-md transition-all duration-200",
        "cursor-pointer"
      )}
    >
      <div className={cn("p-1.5 rounded-md", color)}>
        <Icon className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-bold text-lg tabular-nums">
          <AnimatedCounter value={value} duration={0.8} />
        </span>
        <span className="text-xs text-muted-foreground hidden sm:inline">{label}</span>
      </div>
    </motion.button>
  );
}

export function DashboardStats({ 
  todayCount, 
  pendingCount, 
  weekCompleted, 
  totalPatients,
  loading,
  className,
  onStatClick
}: DashboardStatsProps) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-24" />
        ))}
      </div>
    );
  }

  const stats = [
    {
      icon: Calendar,
      value: todayCount,
      label: t.today || "Today",
      color: "bg-blue-500",
      key: 'today' as const,
    },
    {
      icon: Clock,
      value: pendingCount,
      label: t.pending || "Pending",
      color: "bg-amber-500",
      key: 'pending' as const,
    },
    {
      icon: CheckCircle,
      value: weekCompleted,
      label: t.thisWeek || "This Week",
      color: "bg-emerald-500",
      key: 'week' as const,
    },
    {
      icon: Users,
      value: totalPatients,
      label: t.patient || "Patients",
      color: "bg-purple-500",
      key: 'patients' as const,
    },
  ];

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {stats.map((stat, index) => (
        <StatChip
          key={stat.key}
          icon={stat.icon}
          value={stat.value}
          label={stat.label}
          color={stat.color}
          delay={index * 0.05}
          onClick={() => onStatClick?.(stat.key)}
        />
      ))}
    </div>
  );
}

/**
 * Compact version for very small screens
 */
export function CompactStats({ 
  todayCount, 
  pendingCount, 
  weekCompleted, 
  totalPatients,
  loading,
  className 
}: Omit<DashboardStatsProps, 'onStatClick'>) {
  if (loading) {
    return <Skeleton className="h-6 w-48" />;
  }

  return (
    <motion.div 
      className={cn("flex items-center gap-2 text-sm text-muted-foreground flex-wrap", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <span className="flex items-center gap-1">
        <Calendar className="h-3.5 w-3.5" />
        <strong className="text-foreground">{todayCount}</strong> today
      </span>
      <span className="text-border">•</span>
      <span className="flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" />
        <strong className="text-foreground">{pendingCount}</strong> pending
      </span>
      <span className="text-border">•</span>
      <span className="flex items-center gap-1">
        <CheckCircle className="h-3.5 w-3.5" />
        <strong className="text-foreground">{weekCompleted}</strong> completed
      </span>
    </motion.div>
  );
}
