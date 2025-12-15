import { motion } from "framer-motion";
import { format } from "date-fns";
import {
    CheckCircle2,
    Clock,
    ChevronRight,
    Stethoscope,
    MoreVertical,
    Activity,
    Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TreatmentPlan {
    id: string;
    title: string;
    status: string;
    diagnosis?: string;
    description?: string;
    start_date?: string;
    target_completion_date?: string;
    total_appointments?: number; // Optional if we want to pass stats
    completed_appointments?: number;
}

interface EnhancedTreatmentPlanCardProps {
    plan: TreatmentPlan;
    isActive: boolean;
    onClick: () => void;
    onEdit?: (plan: TreatmentPlan) => void;
    onDelete?: (planId: string) => void;
    onComplete?: (planId: string) => void;
}

export function EnhancedTreatmentPlanCard({
    plan,
    isActive,
    onClick,
    onEdit,
    onDelete,
    onComplete
}: EnhancedTreatmentPlanCardProps) {
    // Calculate mock progress or use real if available
    const progress = plan.total_appointments && plan.total_appointments > 0
        ? Math.round(((plan.completed_appointments || 0) / plan.total_appointments) * 100)
        : 0;

    return (
        <motion.div
            layoutId={`plan-${plan.id}`}
            onClick={onClick}
            className={cn(
                "group relative overflow-hidden rounded-xl border transition-all duration-300 cursor-pointer",
                isActive
                    ? "bg-white border-violet-200 shadow-md ring-1 ring-violet-100"
                    : "bg-white/50 border-slate-200 hover:bg-white hover:border-violet-200/50 hover:shadow-sm"
            )}
        >
            {/* Active Indicator Bar */}
            {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-500 to-fuchsia-500" />
            )}

            <div className="p-4 pl-5">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 mr-3">
                        <h3 className={cn(
                            "font-semibold text-base truncate transition-colors",
                            isActive ? "text-slate-900" : "text-slate-700 group-hover:text-slate-900"
                        )}>
                            {plan.title}
                        </h3>
                        {plan.diagnosis && (
                            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                                <Stethoscope className="h-3 w-3 text-violet-400" />
                                {plan.diagnosis}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        {/* Status Badge */}
                        <div className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider border",
                            plan.status === 'active'
                                ? "bg-violet-50 text-violet-700 border-violet-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-100"
                        )}>
                            {plan.status}
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 text-slate-400 hover:text-slate-600">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(plan); }}>
                                    Edit Plan
                                </DropdownMenuItem>
                                {plan.status === 'active' && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onComplete?.(plan.id); }}>
                                        Mark Completed
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem className="text-rose-600" onClick={(e) => { e.stopPropagation(); onDelete?.(plan.id); }}>
                                    Delete Plan
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                    {plan.target_completion_date && (
                        <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>{format(new Date(plan.target_completion_date), 'MMM yyyy')}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-slate-400" />
                        <span>{plan.completed_appointments || 0}/{plan.total_appointments || 0} Visits</span>
                    </div>
                </div>

                {/* Progress Bar (if active) */}
                {plan.status === 'active' && (
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                            <span>Progress</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
