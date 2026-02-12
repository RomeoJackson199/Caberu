import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarSign } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

type TimeRange = '7d' | '30d' | '90d';

export function RevenueChart() {
  const [range, setRange] = useState<TimeRange>('30d');

  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-revenue-chart', range],
    queryFn: async () => {
      const fromDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

      const { data: revenue, error } = await supabase
        .from('platform_revenue')
        .select('revenue_date, subscription_revenue_cents, overage_revenue_cents, total_cost_cents')
        .gte('revenue_date', fromDate)
        .order('revenue_date', { ascending: true });

      if (error) throw error;

      // Aggregate by date
      const byDate: Record<string, { date: string; revenue: number; costs: number; margin: number }> = {};

      (revenue || []).forEach((r) => {
        const key = r.revenue_date;
        if (!byDate[key]) {
          byDate[key] = { date: key, revenue: 0, costs: 0, margin: 0 };
        }
        byDate[key].revenue += (r.subscription_revenue_cents + r.overage_revenue_cents) / 100;
        byDate[key].costs += r.total_cost_cents / 100;
      });

      // Fill in dates with no data
      const result = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        const entry = byDate[date] || { date, revenue: 0, costs: 0, margin: 0 };
        entry.margin = entry.revenue - entry.costs;
        result.push({
          ...entry,
          label: format(new Date(date), days <= 7 ? 'EEE' : 'MMM dd'),
        });
      }

      return result;
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              Revenue Overview
            </CardTitle>
            <CardDescription>Revenue vs. costs over time</CardDescription>
          </div>
          <div className="flex gap-1">
            {(['7d', '30d', '90d'] as TimeRange[]).map((r) => (
              <Button
                key={r}
                variant={range === r ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setRange(r)}
                className="text-xs h-7 px-2"
              >
                {r}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : data && data.length > 0 && data.some((d) => d.revenue > 0) ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" className="text-xs" tick={{ fontSize: 11 }} />
              <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => `€${v}`} />
              <Tooltip
                formatter={(value: number | undefined) => `€${(value ?? 0).toFixed(2)}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="costs" name="Costs" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No revenue data yet</p>
            <p className="text-xs">Revenue will appear as practices are billed</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
