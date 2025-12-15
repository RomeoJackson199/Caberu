import { motion } from "framer-motion";
import { format } from "date-fns";
import {
    Clock,
    Check,
    X,
    CheckCircle2,
    User,
    CalendarDays
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EnhancedAppointmentCardProps {
    appointment: any;
    onClick: () => void;
    onConfirm?: (id: string, e: any) => void;
    onCancel?: (id: string, e: any) => void;
    showActions?: boolean;
}

const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
    pending: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    confirmed: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    completed: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
    cancelled: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
    in_progress: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
};

export function EnhancedAppointmentCard({
    appointment,
    onClick,
    onConfirm,
    onCancel,
    showActions = true
}: EnhancedAppointmentCardProps) {
    const status = statusConfig[appointment.status] || statusConfig.pending;
    const date = new Date(appointment.appointment_date);

    return (
        <Card
            className="group overflow-hidden border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300 cursor-pointer bg-white"
            onClick={onClick}
        >
            <CardContent className="p-0 flex items-stretch">
                {/* Date Column */}
                <div className={cn(
                    "w-20 flex flex-col items-center justify-center p-2 text-white shrink-0 transition-colors",
                    appointment.status === 'pending'
                        ? "bg-gradient-to-br from-amber-400 to-orange-500"
                        : appointment.status === 'completed'
                            ? "bg-slate-100 border-r border-slate-200 !text-slate-500" // Muted for completed
                            : "bg-gradient-to-br from-indigo-500 to-violet-600"
                )}>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">
                        {format(date, 'MMM')}
                    </span>
                    <span className="text-2xl font-bold leading-none my-0.5">
                        {format(date, 'd')}
                    </span>
                    <span className="text-[10px] opacity-80 font-medium">
                        {format(date, 'EEE')}
                    </span>
                </div>

                {/* Content */}
                <div className="flex-1 p-3 min-w-0 flex flex-col justify-center">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-slate-800 text-sm truncate group-hover:text-indigo-700 transition-colors">
                            {appointment.reason || "Appointment"}
                        </h4>
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 border", status.bg, status.text, status.border)}>
                            {appointment.status}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-1.5">
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {format(date, 'h:mm a')}
                        </div>
                        {appointment.duration_minutes && (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                {appointment.duration_minutes}m
                            </span>
                        )}
                    </div>

                    {appointment.patient_name && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <User className="h-3 w-3 text-slate-400" />
                            <span className="truncate">{appointment.patient_name}</span>
                        </div>
                    )}

                    {/* Quick Actions (only for pending/scheduled if relevant) */}
                    {showActions && appointment.status === 'pending' && (
                        <div className="flex gap-2 mt-2 pt-2 border-t border-slate-50">
                            <Button
                                size="sm"
                                className="h-7 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white px-2"
                                onClick={(e) => onConfirm?.(appointment.id, e)}
                            >
                                <Check className="h-3 w-3 mr-1" /> Confirm
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] border-rose-200 text-rose-600 hover:bg-rose-50 px-2"
                                onClick={(e) => onCancel?.(appointment.id, e)}
                            >
                                <X className="h-3 w-3 mr-1" /> Decline
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
