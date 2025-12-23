/**
 * Premium Clinical Today Dashboard with modern UX
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, AlertCircle, BarChart3, Users, Plus, 
  Clock, MessageSquare, FileText, Activity,
  CheckCircle2, ChevronRight, Phone, Video,
  TrendingUp, TrendingDown, Zap, CreditCard, Bell,
  Play, ArrowUpRight, Timer, Sparkles, MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Enhanced stat card with trends
interface EnhancedStatCardProps {
  title: string;
  value: string | number;
  icon: typeof Calendar;
  gradient: string;
  trend?: { value: number; isPositive: boolean };
  subtitle?: string;
}

const EnhancedStatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  gradient, 
  trend,
  subtitle
}: EnhancedStatCardProps) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.98 }}
    className="cursor-pointer"
  >
    <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className={cn("absolute inset-0 opacity-10 bg-gradient-to-br", gradient)} />
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {trend && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs font-medium h-5",
                    trend.isPositive 
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  )}
                >
                  {trend.isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                  {Math.abs(trend.value)}%
                </Badge>
              )}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={cn("p-2.5 rounded-xl bg-gradient-to-br shadow-lg", gradient)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

// Appointment row with hover actions
interface AppointmentRowProps {
  time: string;
  endTime: string;
  patient: string;
  reason: string;
  status: 'completed' | 'in-progress' | 'upcoming' | 'cancelled';
  urgent?: boolean;
  isNext?: boolean;
}

const AppointmentRow = ({ 
  time, endTime, patient, reason, status, urgent, isNext 
}: AppointmentRowProps) => {
  const [hovered, setHovered] = useState(false);

  const statusStyles = {
    'completed': 'border-l-green-500 bg-green-50/30 dark:bg-green-950/10 opacity-70',
    'in-progress': 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20',
    'upcoming': isNext ? 'border-l-primary bg-primary/5' : 'border-l-transparent hover:border-l-muted-foreground/30',
    'cancelled': 'border-l-red-500 opacity-50 line-through'
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={cn(
        "relative flex items-center justify-between p-4 rounded-xl border-l-4 transition-all duration-200",
        "hover:shadow-md cursor-pointer group bg-card",
        statusStyles[status]
      )}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Time */}
        <div className="flex flex-col items-center min-w-[65px] text-center">
          <span className="text-sm font-semibold">{time}</span>
          <span className="text-xs text-muted-foreground">{endTime}</span>
        </div>

        {/* Avatar */}
        <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
          <AvatarFallback className={cn(
            "text-sm font-medium",
            urgent ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary"
          )}>
            {patient.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{patient}</span>
            {urgent && (
              <Badge variant="destructive" className="text-xs h-5">
                <AlertCircle className="w-3 h-3 mr-1" />
                Urgent
              </Badge>
            )}
            {status === 'in-progress' && (
              <Badge className="text-xs h-5 bg-blue-500">
                <Activity className="w-3 h-3 mr-1 animate-pulse" />
                In Progress
              </Badge>
            )}
            {isNext && status === 'upcoming' && (
              <Badge variant="outline" className="text-xs h-5 border-primary text-primary">
                Next Up
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{reason}</p>
        </div>
      </div>

      {/* Actions */}
      <AnimatePresence>
        {hovered && status === 'upcoming' ? (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex items-center gap-1"
          >
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <Phone className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <Video className="w-4 h-4" />
            </Button>
            <Button size="sm" className="h-8 ml-1">
              <Play className="w-3 h-3 mr-1" />
              Start
            </Button>
          </motion.div>
        ) : (
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Quick action button
const QuickActionBtn = ({ 
  icon: Icon, 
  label, 
  color 
}: { 
  icon: typeof Zap; 
  label: string; 
  color: string;
}) => (
  <motion.button
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.97 }}
    className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:shadow-md transition-all"
  >
    <div className={cn("p-2.5 rounded-lg", color)}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <span className="text-xs font-medium">{label}</span>
  </motion.button>
);

// Day progress bar
const DayProgressBar = () => {
  const progress = 65; // 65% of day complete
  return (
    <Card className="border-0 shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Day Progress</span>
          </div>
          <span className="text-sm text-primary font-medium">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>9:00 AM</span>
          <span>6:00 PM</span>
        </div>
      </CardContent>
    </Card>
  );
};

// Notifications widget
const NotificationsWidget = () => {
  const items = [
    { type: 'urgent', msg: "Sarah Johnson reported increased pain", time: "5m ago" },
    { type: 'info', msg: "Lab results ready for Mike Davis", time: "15m ago" },
    { type: 'success', msg: "Payment received from Emma Wilson", time: "1h ago" },
  ];

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </CardTitle>
          <Badge variant="secondary" className="text-xs h-5">3</Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="space-y-2">
          {items.map((n, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
              <div className={cn(
                "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                n.type === 'urgent' ? "bg-red-500" : n.type === 'success' ? "bg-green-500" : "bg-blue-500"
              )} />
              <div className="flex-1 min-w-0">
                <p className="text-xs leading-tight">{n.msg}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// AI Insights widget
const AIInsightsWidget = () => (
  <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 via-background to-purple-500/5">
    <CardHeader className="pb-2 px-4 pt-4">
      <CardTitle className="text-sm font-semibold flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        AI Insights
      </CardTitle>
    </CardHeader>
    <CardContent className="px-4 pb-4 pt-0 space-y-2">
      <div className="p-3 rounded-lg bg-background/80 border">
        <p className="text-xs font-medium">Scheduling optimization</p>
        <p className="text-xs text-muted-foreground mt-1">
          Move David's follow-up to 3:45 PM to reduce wait time by 15 min
        </p>
        <Button size="sm" variant="link" className="h-auto p-0 mt-1 text-xs text-primary">
          Apply →
        </Button>
      </div>
      <div className="p-3 rounded-lg bg-background/80 border">
        <p className="text-xs font-medium">Treatment reminder</p>
        <p className="text-xs text-muted-foreground mt-1">
          Emma Wilson needs a follow-up X-ray after today's procedure
        </p>
      </div>
    </CardContent>
  </Card>
);

export function DemoClinicalTodayEnhanced() {
  const [tab, setTab] = useState("today");

  const appointments: AppointmentRowProps[] = [
    { time: "9:00", endTime: "9:30", patient: "John Smith", reason: "Routine Checkup", status: 'completed' },
    { time: "10:00", endTime: "11:00", patient: "Sarah Johnson", reason: "Tooth Pain - Emergency", status: 'completed', urgent: true },
    { time: "11:30", endTime: "12:00", patient: "Mike Davis", reason: "Cleaning & Scaling", status: 'completed' },
    { time: "2:00", endTime: "3:30", patient: "Emma Wilson", reason: "Root Canal Treatment", status: 'in-progress', urgent: true },
    { time: "4:00", endTime: "4:30", patient: "David Brown", reason: "Post-op Follow-up", status: 'upcoming', isNext: true },
    { time: "5:00", endTime: "5:45", patient: "Lisa Taylor", reason: "Crown Fitting", status: 'upcoming' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold">Good afternoon, Dr. Smith</h1>
          <p className="text-muted-foreground text-sm">
            <span className="text-primary font-medium">6 appointments</span> today • 
            <span className="text-red-500 font-medium ml-1">2 urgent</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4" data-tour="stats-cards">
        <EnhancedStatCard
          title="Today's Appointments"
          value={12}
          icon={Calendar}
          gradient="from-blue-500 to-cyan-500"
          trend={{ value: 8, isPositive: true }}
          subtitle="3 completed"
        />
        <EnhancedStatCard
          title="Urgent Cases"
          value={3}
          icon={AlertCircle}
          gradient="from-red-500 to-orange-500"
          trend={{ value: 2, isPositive: false }}
          subtitle="Needs attention"
        />
        <EnhancedStatCard
          title="Completion Rate"
          value="94%"
          icon={CheckCircle2}
          gradient="from-green-500 to-emerald-500"
          trend={{ value: 5, isPositive: true }}
        />
        <EnhancedStatCard
          title="Revenue Today"
          value="€2,450"
          icon={CreditCard}
          gradient="from-purple-500 to-pink-500"
          trend={{ value: 12, isPositive: true }}
        />
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Appointments - 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <DayProgressBar />
          
          <Card className="border-0 shadow-lg" data-tour="appointments-list">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Schedule</CardTitle>
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList className="h-8">
                    <TabsTrigger value="today" className="text-xs px-3">Today</TabsTrigger>
                    <TabsTrigger value="week" className="text-xs px-3">Week</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[380px] pr-3">
                <div className="space-y-2">
                  {appointments.map((apt, i) => (
                    <AppointmentRow key={i} {...apt} />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="grid grid-cols-4 gap-2">
                <QuickActionBtn icon={Calendar} label="Book" color="bg-blue-500" />
                <QuickActionBtn icon={FileText} label="Note" color="bg-purple-500" />
                <QuickActionBtn icon={CreditCard} label="Invoice" color="bg-green-500" />
                <QuickActionBtn icon={MessageSquare} label="Message" color="bg-amber-500" />
              </div>
            </CardContent>
          </Card>

          <NotificationsWidget />
          <AIInsightsWidget />
        </div>
      </div>
    </div>
  );
}
