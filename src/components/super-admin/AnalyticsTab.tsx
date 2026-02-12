import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { usePracticeList } from '@/hooks/useAdminDashboard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  DollarSign,
  Download,
  TrendingUp,
  Calculator,
  Building2,
} from 'lucide-react';

const TIER_COLORS = ['hsl(var(--primary))', '#10b981', '#8b5cf6'];
const TIER_PRICES = { Starter: 24900, Professional: 49900, Enterprise: 99900 };
const TIER_COSTS = { Starter: 5000, Professional: 12000, Enterprise: 25000 }; // Estimated monthly platform costs per tier

export function AnalyticsTab() {
  const { data: practices, isLoading } = usePracticeList();

  // Tier breakdown
  const tierBreakdown = (() => {
    if (!practices) return [];
    const counts: Record<string, number> = { Starter: 0, Professional: 0, Enterprise: 0 };
    practices.forEach((p) => {
      const plan = p.subscription_plan || '';
      if (plan.includes('enterprise')) counts.Enterprise++;
      else if (plan.includes('professional')) counts.Professional++;
      else counts.Starter++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  // Per-tier profitability
  const profitability = tierBreakdown.map((tier) => {
    const price = TIER_PRICES[tier.name as keyof typeof TIER_PRICES] || 0;
    const cost = TIER_COSTS[tier.name as keyof typeof TIER_COSTS] || 0;
    const revenue = (price * tier.value) / 100;
    const costs = (cost * tier.value) / 100;
    const margin = revenue - costs;
    const marginPct = revenue > 0 ? Math.round((margin / revenue) * 100) : 0;
    return {
      tier: tier.name,
      practices: tier.value,
      revenue,
      costs,
      margin,
      marginPct,
    };
  });

  const totalRevenue = profitability.reduce((s, p) => s + p.revenue, 0);
  const totalCosts = profitability.reduce((s, p) => s + p.costs, 0);
  const totalMargin = totalRevenue - totalCosts;

  // Export CSV
  const handleExportCSV = () => {
    if (!practices) return;
    const headers = ['Name', 'Plan', 'Status', 'Members', 'Patients', 'Appointments', 'Created'];
    const rows = practices.map((p) => [
      p.name,
      p.subscription_plan || 'starter',
      p.subscription_status || 'active',
      p.members_count,
      p.patients_count,
      p.appointments_count,
      p.created_at,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `practices-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><LoadingSpinner /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Usage & Billing Analytics</h2>
          <p className="text-sm text-muted-foreground">Platform-wide financial overview</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Revenue KPIs */}
      <div className="grid gap-3 grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">€{totalRevenue.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Monthly Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calculator className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">€{totalCosts.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Estimated Costs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">€{totalMargin.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">
                  Margin ({totalRevenue > 0 ? Math.round((totalMargin / totalRevenue) * 100) : 0}%)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Distribution + Profitability */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tier Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {tierBreakdown.some((t) => t.value > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={tierBreakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {tierBreakdown.map((_, i) => (
                      <Cell key={i} fill={TIER_COLORS[i % TIER_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">No practices yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Per-Tier Profitability</CardTitle>
          </CardHeader>
          <CardContent>
            {profitability.some((p) => p.practices > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={profitability}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="tier" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `€${v}`} />
                  <Tooltip
                    formatter={(v: number | undefined) => `€${(v ?? 0).toFixed(0)}`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="costs" name="Costs" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} opacity={0.7} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Practice Table with margin */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Practice Profitability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {profitability.map((p) => (
              <div key={p.tier} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{p.tier}</Badge>
                  <span className="text-sm">{p.practices} practice{p.practices !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">€{p.revenue.toFixed(0)} rev</span>
                  <span className="text-muted-foreground">€{p.costs.toFixed(0)} cost</span>
                  <Badge className={p.marginPct >= 50 ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'}>
                    {p.marginPct}% margin
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
