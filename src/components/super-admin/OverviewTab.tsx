import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSystemStats } from '@/hooks/useSuperAdmin';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Building2,
  Users,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Activity,
  UserPlus,
  RefreshCw,
  Database,
  Shield,
} from 'lucide-react';

export function OverviewTab() {
  const { data: stats, isLoading } = useSystemStats();

  const { toast } = useToast();
  const [superAdminEmail, setSuperAdminEmail] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const handleGrantSuperAdmin = async () => {
    if (!superAdminEmail.trim()) {
      toast({ title: 'Error', description: 'Please enter an email address', variant: 'destructive' });
      return;
    }
    
    setIsGranting(true);
    try {
      const { data, error } = await supabase.functions.invoke('make-super-admin', {
        body: { email: superAdminEmail.trim() }
      });
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: data.message || `${superAdminEmail} is now a super admin`,
      });
      setSuperAdminEmail('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to grant super admin',
        variant: 'destructive'
      });
    } finally {
      setIsGranting(false);
    }
  };

  const handleHealthCheck = async () => {
    setIsCheckingHealth(true);
    try {
      const { data, error } = await supabase.functions.invoke('health-check');
      
      if (error) throw error;
      
      if (data.healthy) {
        toast({
          title: 'System Healthy',
          description: `Database latency: ${data.db_latency_ms}ms`,
        });
      } else {
        toast({
          title: 'System Issues Detected',
          description: data.error || 'Check system logs',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Health Check Failed',
        description: error.message || 'Could not reach health endpoint',
        variant: 'destructive'
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const statCards = [
    {
      title: 'Total Businesses',
      value: stats?.total_businesses || 0,
      description: `${stats?.active_businesses || 0} active`,
      icon: Building2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Total Users',
      value: stats?.total_users || 0,
      description: `+${stats?.users_joined_this_month || 0} this month`,
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Total Appointments',
      value: stats?.total_appointments || 0,
      description: `${stats?.appointments_today || 0} today`,
      icon: Calendar,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'System Errors',
      value: stats?.unresolved_errors || 0,
      description: `${stats?.critical_errors || 0} critical`,
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'Monthly Growth',
      value: stats?.businesses_created_this_month || 0,
      description: 'New businesses',
      icon: TrendingUp,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: 'System Health',
      value: stats?.critical_errors === 0 ? 'Good' : 'Issues',
      description: stats?.critical_errors === 0 ? 'All systems operational' : 'Attention needed',
      icon: Activity,
      color: stats?.critical_errors === 0 ? 'text-green-500' : 'text-yellow-500',
      bgColor: stats?.critical_errors === 0 ? 'bg-green-500/10' : 'bg-yellow-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">System Overview</h2>
        <p className="text-muted-foreground">
          Real-time statistics and platform health metrics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Admin Action Buttons */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Grant Super Admin */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-500" />
              Grant Super Admin
            </CardTitle>
            <CardDescription>
              Grant super admin privileges to a user by email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="superAdminEmail">User Email</Label>
              <Input
                id="superAdminEmail"
                type="email"
                placeholder="user@example.com"
                value={superAdminEmail}
                onChange={(e) => setSuperAdminEmail(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleGrantSuperAdmin}
              disabled={isGranting || !superAdminEmail.trim()}
              className="w-full gap-2"
              variant="destructive"
            >
              {isGranting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Grant Super Admin Access
            </Button>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-green-500" />
              System Health Check
            </CardTitle>
            <CardDescription>
              Run diagnostics on the system infrastructure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Check database connectivity, edge function availability, and system latency.
            </p>
            <Button 
              onClick={handleHealthCheck}
              disabled={isCheckingHealth}
              className="w-full gap-2"
              variant="outline"
            >
              {isCheckingHealth ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              Run Health Check
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Navigation</CardTitle>
          <CardDescription>Jump to administrative sections</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            <a
              href="#businesses"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector('[value="businesses"]')?.dispatchEvent(new Event('click', { bubbles: true }));
              }}
              className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
            >
              <Building2 className="h-5 w-5 mb-2 text-blue-500" />
              <h3 className="font-semibold">Manage Businesses</h3>
              <p className="text-sm text-muted-foreground">
                View and create businesses
              </p>
            </a>
            <a
              href="#users"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector('[value="users"]')?.dispatchEvent(new Event('click', { bubbles: true }));
              }}
              className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
            >
              <Users className="h-5 w-5 mb-2 text-green-500" />
              <h3 className="font-semibold">Manage Users</h3>
              <p className="text-sm text-muted-foreground">
                Search and view all users
              </p>
            </a>
            <a
              href="#errors"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector('[value="errors"]')?.dispatchEvent(new Event('click', { bubbles: true }));
              }}
              className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
            >
              <AlertTriangle className="h-5 w-5 mb-2 text-red-500" />
              <h3 className="font-semibold">Review Errors</h3>
              <p className="text-sm text-muted-foreground">
                Monitor system issues
              </p>
            </a>
            <a
              href="#audit"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector('[value="audit"]')?.dispatchEvent(new Event('click', { bubbles: true }));
              }}
              className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
            >
              <Shield className="h-5 w-5 mb-2 text-purple-500" />
              <h3 className="font-semibold">View Audit Logs</h3>
              <p className="text-sm text-muted-foreground">
                Track admin actions
              </p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
