import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePracticeDetail } from '@/hooks/useAdminDashboard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Building2,
  Users,
  Calendar,
  Phone,
  MessageSquare,
  Shield,
  Clock,
  Mail,
  Key,
} from 'lucide-react';

interface PracticeDetailPanelProps {
  businessId: string;
  onBack: () => void;
}

export function PracticeDetailPanel({ businessId, onBack }: PracticeDetailPanelProps) {
  const { data: practice, isLoading } = usePracticeDetail(businessId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!practice) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Practice not found
      </div>
    );
  }

  const tierLabel = practice.subscription_plan?.includes('enterprise')
    ? 'Enterprise'
    : practice.subscription_plan?.includes('professional')
    ? 'Professional'
    : 'Starter';

  const tierColor =
    tierLabel === 'Enterprise'
      ? 'bg-purple-500/10 text-purple-600 border-purple-500/20'
      : tierLabel === 'Professional'
      ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      : 'bg-green-500/10 text-green-600 border-green-500/20';

  const statusBadge = practice.subscription_status === 'active' || !practice.subscription_status
    ? <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>
    : practice.subscription_status === 'trialing'
    ? <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Trial</Badge>
    : <Badge variant="destructive">Suspended</Badge>;

  const stats = [
    { label: 'Staff Members', value: practice.staff_count, icon: Users, color: 'text-blue-500' },
    { label: 'Patients', value: practice.patient_count, icon: Users, color: 'text-green-500' },
    { label: 'Total Appointments', value: practice.total_appointments, icon: Calendar, color: 'text-purple-500' },
    { label: 'This Month', value: practice.appointments_this_month, icon: Calendar, color: 'text-orange-500' },
    { label: 'Voice Min (month)', value: practice.voice_minutes_this_month?.toFixed(1) || '0', icon: Phone, color: 'text-teal-500' },
    { label: 'WhatsApp (month)', value: practice.whatsapp_this_month, icon: MessageSquare, color: 'text-green-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {practice.business_name}
          </h2>
          <p className="text-sm text-muted-foreground">/{practice.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={tierColor}>{tierLabel}</Badge>
          {statusBadge}
        </div>
      </div>

      {/* Owner Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Practice Info</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Owner</p>
            <p className="font-medium">{practice.owner_name}</p>
            <p className="text-xs text-muted-foreground">{practice.owner_email}</p>
          </div>
          <div>
            <p className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Created</p>
            <p className="font-medium">{formatDistanceToNow(new Date(practice.created_at), { addSuffix: true })}</p>
          </div>
          <div>
            <p className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Last Activity</p>
            <p className="font-medium">
              {practice.last_activity
                ? formatDistanceToNow(new Date(practice.last_activity), { addSuffix: true })
                : 'Never'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground flex items-center gap-1"><Key className="h-3 w-3" /> Encryption</p>
            <p className="font-medium flex items-center gap-1">
              <Shield className={`h-3 w-3 ${practice.encryption_key_active ? 'text-green-500' : 'text-red-500'}`} />
              {practice.encryption_key_active ? 'Active' : 'Missing'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
