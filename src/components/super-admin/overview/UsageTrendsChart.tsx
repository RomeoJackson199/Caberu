import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format, subDays } from 'date-fns';

export function UsageTrendsChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-usage-trends'],
    queryFn: async () => {
      const fromDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');

      // Fetch phone usage aggregated by day
      const { data: phoneData } = await supabase
        .from('phone_usage')
        .select('created_at, duration_seconds')
        .gte('created_at', fromDate);

      // Fetch communication logs for WhatsApp
      const { data: commData } = await supabase
        .from('communication_logs')
        .select('created_at, channel')
        .eq('channel', 'whatsapp')
        .gte('created_at', fromDate);

      // Aggregate by date
      const byDate: Record<string, { voiceMinutes: number; whatsappMessages: number }> = {};

      (phoneData || []).forEach((p) => {
        const date = format(new Date(p.created_at), 'yyyy-MM-dd');
        if (!byDate[date]) byDate[date] = { voiceMinutes: 0, whatsappMessages: 0 };
        byDate[date].voiceMinutes += (p.duration_seconds || 0) / 60;
      });

      (commData || []).forEach((c) => {
        const date = format(new Date(c.created_at), 'yyyy-MM-dd');
        if (!byDate[date]) byDate[date] = { voiceMinutes: 0, whatsappMessages: 0 };
        byDate[date].whatsappMessages += 1;
      });

      // Fill 30 days
      const result = [];
      for (let i = 29; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        const entry = byDate[date] || { voiceMinutes: 0, whatsappMessages: 0 };
        result.push({
          date,
          label: format(new Date(date), 'MMM dd'),
          voiceMinutes: Math.round(entry.voiceMinutes * 10) / 10,
          whatsappMessages: entry.whatsappMessages,
        });
      }

      return result;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          Usage Trends (30 days)
        </CardTitle>
        <CardDescription>Voice minutes and WhatsApp messages across all practices</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : data && data.some((d) => d.voiceMinutes > 0 || d.whatsappMessages > 0) ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" className="text-xs" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis className="text-xs" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="voiceMinutes" name="Voice (min)" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="whatsappMessages" name="WhatsApp" stroke="#25D366" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No usage data yet</p>
            <p className="text-xs">Data will populate as practices use voice and messaging</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
