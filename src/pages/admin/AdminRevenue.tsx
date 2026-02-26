import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { DollarSign, CreditCard, Calculator, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useAdminBusinesses,
  useAdminSubscriptionPlans,
  useAdminUpdateSubscriptionPlan,
  useAdminPlatformRevenue,
} from '@/hooks/useAdminData';
import { PRICING_TIERS, COST_STRUCTURE } from '@/types/admin-dashboard';

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('de-BE', { style: 'currency', currency: 'EUR' }).format(cents / 100);

export default function AdminRevenue() {
  const { data: businesses } = useAdminBusinesses();
  const { data: plans, isLoading: plansLoading } = useAdminSubscriptionPlans();
  const { data: revenue, isLoading: revenueLoading } = useAdminPlatformRevenue();
  const updatePlan = useAdminUpdateSubscriptionPlan();

  // MRR calculation
  const planCounts: Record<string, number> = {};
  let totalMrr = 0;
  businesses?.forEach((b) => {
    if (b.subscription_status === 'active' && b.subscription_plan) {
      const plan = b.subscription_plan.toLowerCase();
      planCounts[plan] = (planCounts[plan] || 0) + 1;
      if (PRICING_TIERS[plan]) totalMrr += PRICING_TIERS[plan];
      else totalMrr += PRICING_TIERS.starter;
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Revenue & Billing</h2>
        <p className="text-sm text-muted-foreground">Subscription overview and margin analysis. Promo codes & coupons are managed via Stripe Dashboard.</p>
      </div>

      {/* MRR Overview Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{formatCurrency(totalMrr)}</div>
          </CardContent>
        </Card>
        {Object.entries(PRICING_TIERS).map(([tier, price]) => (
          <Card key={tier}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground capitalize">{tier}</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{planCounts[tier] || 0}</div>
              <p className="text-xs text-muted-foreground">{formatCurrency(price)}/mo each</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Margin Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4" />Cost Structure</CardTitle>
          <CardDescription>Belgian market unit costs for margin analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="p-3 border rounded-lg">
              <p className="text-sm font-medium">ElevenLabs Voice</p>
              <p className="text-2xl font-bold">{formatCurrency(COST_STRUCTURE.elevenlabs_voice_per_minute)}</p>
              <p className="text-xs text-muted-foreground">per minute</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="text-sm font-medium">ElevenLabs Text</p>
              <p className="text-2xl font-bold">{formatCurrency(COST_STRUCTURE.elevenlabs_text_per_message)}</p>
              <p className="text-xs text-muted-foreground">per message</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="text-sm font-medium">Twilio Belgium</p>
              <p className="text-2xl font-bold">{formatCurrency(COST_STRUCTURE.twilio_belgium_inbound_per_minute)}</p>
              <p className="text-xs text-muted-foreground">per minute inbound</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="text-sm font-medium">Phone Number</p>
              <p className="text-2xl font-bold">{formatCurrency(COST_STRUCTURE.phone_number_monthly)}</p>
              <p className="text-xs text-muted-foreground">per month per number</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="text-sm font-medium">WhatsApp (Meta)</p>
              <p className="text-2xl font-bold">Free</p>
              <p className="text-xs text-muted-foreground">service messages</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
          <TabsTrigger value="promo">Promo Codes</TabsTrigger>
          <TabsTrigger value="revenue">Platform Revenue</TabsTrigger>
        </TabsList>

        {/* Subscription Plans */}
        <TabsContent value="plans">
          <Card>
            <CardContent className="pt-6">
              {plansLoading ? <div className="flex justify-center py-8"><LoadingSpinner /></div> : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plan</TableHead>
                        <TableHead>Monthly</TableHead>
                        <TableHead>Yearly</TableHead>
                        <TableHead>Customer Limit</TableHead>
                        <TableHead>Email Limit</TableHead>
                        <TableHead>Phone Min/Day</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead>Stripe ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans && plans.length > 0 ? plans.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell className="font-medium capitalize">{plan.name}</TableCell>
                          <TableCell>{plan.price_monthly ? formatCurrency(plan.price_monthly) : 'N/A'}</TableCell>
                          <TableCell>{plan.price_yearly ? formatCurrency(plan.price_yearly) : 'N/A'}</TableCell>
                          <TableCell>{plan.customer_limit ?? 'Unlimited'}</TableCell>
                          <TableCell>{plan.email_limit_monthly ?? 'Unlimited'}</TableCell>
                          <TableCell>{plan.phone_minutes_daily ?? 'N/A'}</TableCell>
                          <TableCell>
                            <Switch
                              checked={plan.is_active}
                              onCheckedChange={(checked) =>
                                updatePlan.mutate({ planId: plan.id, updates: { is_active: checked } })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-xs font-mono">{plan.stripe_product_id?.slice(0, 12) || 'N/A'}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No plans found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Promo Codes — now managed via Stripe */}
        <TabsContent value="promo">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Promo Codes & Coupons</CardTitle>
              <CardDescription>
                Promotion codes are now managed directly in the Stripe Dashboard for better tracking, analytics, and native checkout integration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-6 bg-muted/30 rounded-lg border border-border/60 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Create and manage coupons, promotion codes, and discounts directly in Stripe.
                  Customers can apply promo codes during checkout automatically.
                </p>
                <Button
                  variant="outline"
                  onClick={() => window.open('https://dashboard.stripe.com/coupons', '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Stripe Coupons Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Platform Revenue */}
        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Platform Revenue Data</CardTitle>
              <CardDescription>Daily revenue and cost data per business</CardDescription>
            </CardHeader>
            <CardContent>
              {revenueLoading ? <div className="flex justify-center py-8"><LoadingSpinner /></div> : (
                revenue && revenue.length > 0 ? (
                  <div className="border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Business</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Subscription Revenue</TableHead>
                          <TableHead>Overage Revenue</TableHead>
                          <TableHead>Total Revenue</TableHead>
                          <TableHead>Total Cost</TableHead>
                          <TableHead>Margin</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {revenue.map((r) => {
                          const margin = (r.total_revenue_cents || 0) - (r.total_cost_cents || 0);
                          return (
                            <TableRow key={r.id}>
                              <TableCell className="text-xs font-mono">{r.business_id?.slice(0, 8)}...</TableCell>
                              <TableCell>{r.revenue_date}</TableCell>
                              <TableCell>{formatCurrency(r.subscription_revenue_cents || 0)}</TableCell>
                              <TableCell>{formatCurrency(r.overage_revenue_cents || 0)}</TableCell>
                              <TableCell className="font-medium">{formatCurrency(r.total_revenue_cents || 0)}</TableCell>
                              <TableCell>{formatCurrency(r.total_cost_cents || 0)}</TableCell>
                              <TableCell className={cn('font-medium', margin >= 0 ? 'text-green-600' : 'text-red-600')}>
                                {formatCurrency(margin)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No revenue data recorded yet. Data will appear when platform_revenue table is populated.</p>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
