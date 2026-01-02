import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useIsSuperAdmin } from '@/hooks/useSuperAdmin';
import { Shield, AlertCircle, LogOut } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Import tab components
import { OverviewTab } from '@/components/super-admin/OverviewTab';
import { BusinessesTab } from '@/components/super-admin/BusinessesTab';
import { UsersTab } from '@/components/super-admin/UsersTab';
import { ErrorsTab } from '@/components/super-admin/ErrorsTab';
import { AuditLogsTab } from '@/components/super-admin/AuditLogsTab';
import { EmailTestTab } from '@/components/super-admin/EmailTestTab';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { data: isSuperAdmin, isLoading, error } = useIsSuperAdmin();
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully',
      });
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      navigate('/');
    }
  }, [isSuperAdmin, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to verify super admin status. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500 rounded-lg">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
            <p className="text-muted-foreground">
              System oversight and management
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleSignOut}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      {/* Warning Banner */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You have super admin privileges. All actions are logged and audited. Use with caution.
        </AlertDescription>
      </Alert>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="businesses">Businesses</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="email">Email Test</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="businesses" className="space-y-4">
          <BusinessesTab />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UsersTab />
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <ErrorsTab />
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <EmailTestTab />
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <AuditLogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
