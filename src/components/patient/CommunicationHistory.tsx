import { format } from "date-fns";
import { Mail, Phone, MessageSquare, Bell, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useCommunicationLogs, CommunicationLog } from "@/hooks/useCommunicationLogs";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface CommunicationHistoryProps {
  patientId: string;
  businessId: string;
  limit?: number;
}

const channelConfig = {
  email: { icon: Mail, color: 'text-blue-500', bg: 'bg-blue-100' },
  sms: { icon: MessageSquare, color: 'text-green-500', bg: 'bg-green-100' },
  phone: { icon: Phone, color: 'text-amber-500', bg: 'bg-amber-100' },
  'in-app': { icon: Bell, color: 'text-purple-500', bg: 'bg-purple-100' },
};

export function CommunicationHistory({ patientId, businessId, limit = 10 }: CommunicationHistoryProps) {
  const { logs, isLoading } = useCommunicationLogs({ patientId, businessId, limit });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-3/4 mb-1" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No communication history</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {logs.map((log) => {
        const config = channelConfig[log.channel] || channelConfig.email;
        const Icon = config.icon;
        const DirectionIcon = log.direction === 'outbound' ? ArrowUpRight : ArrowDownLeft;
        
        return (
          <div
            key={log.id}
            className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center relative", config.bg)}>
              <Icon className={cn("h-4 w-4", config.color)} />
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center",
                log.direction === 'outbound' ? 'bg-blue-500' : 'bg-green-500'
              )}>
                <DirectionIcon className="h-2 w-2 text-white" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {log.subject || `${log.channel.charAt(0).toUpperCase() + log.channel.slice(1)} ${log.direction}`}
                </p>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {format(new Date(log.created_at), 'MMM d, h:mm a')}
                </span>
              </div>
              {log.content && (
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                  {log.content}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded capitalize",
                  log.status === 'sent' && "bg-emerald-100 text-emerald-700",
                  log.status === 'delivered' && "bg-blue-100 text-blue-700",
                  log.status === 'failed' && "bg-red-100 text-red-600",
                  log.status === 'initiated' && "bg-amber-100 text-amber-700",
                )}>
                  {log.status}
                </span>
                <span className="text-[10px] text-slate-400 capitalize">
                  {log.direction}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
