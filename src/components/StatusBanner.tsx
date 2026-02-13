import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Info, XCircle, AlertOctagon, X } from 'lucide-react';
import { useState } from 'react';

export function StatusBanner() {
  const [dismissed, setDismissed] = useState(false);

  const { data: status } = useQuery({
    queryKey: ['platform-status-banner'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_status')
        .select('show_banner, banner_message, banner_severity, overall_status')
        .limit(1)
        .single();
      if (error) return null;
      return data;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  if (dismissed || !status?.show_banner || !status.banner_message) return null;

  const severityStyles: Record<string, { bg: string; icon: React.ReactNode }> = {
    info: {
      bg: 'bg-blue-600 text-white',
      icon: <Info className="h-4 w-4 shrink-0" />,
    },
    warning: {
      bg: 'bg-yellow-500 text-yellow-950',
      icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
    },
    error: {
      bg: 'bg-red-600 text-white',
      icon: <XCircle className="h-4 w-4 shrink-0" />,
    },
    critical: {
      bg: 'bg-red-700 text-white animate-pulse',
      icon: <AlertOctagon className="h-4 w-4 shrink-0" />,
    },
  };

  const style = severityStyles[status.banner_severity || 'info'] || severityStyles.info;

  return (
    <div className={`${style.bg} px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium relative z-50`}>
      {style.icon}
      <span>{status.banner_message}</span>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
