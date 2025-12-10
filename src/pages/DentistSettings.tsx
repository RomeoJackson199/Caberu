import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Calendar, Palette, Shield, User, LogOut, Mail, HelpCircle, UserCog, CheckCircle2, Briefcase, CreditCard } from "lucide-react";
import { EnhancedAvailabilitySettings } from "@/components/enhanced/EnhancedAvailabilitySettings";
import DentistAdminBranding from "./DentistAdminBranding";
import DentistAdminSecurity from "./DentistAdminSecurity";
import DentistAdminProfile from "./DentistAdminProfile";
import DentistAdminUsers from "./DentistAdminUsers";
import { ServiceManager } from "@/components/services/ServiceManager";
import { useCurrentDentist } from "@/hooks/useCurrentDentist";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrentBusinessId } from "@/lib/businessUtils";
import { logger } from '@/lib/logger';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CancelSubscriptionSection } from "@/components/settings/CancelSubscriptionSection";

export default function DentistSettings() {
  const { dentistId } = useCurrentDentist();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("appointments");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requireApproval, setRequireApproval] = useState(false);
  const [appointmentLoading, setAppointmentLoading] = useState(true);
  const [savingAppointments, setSavingAppointments] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['profile', 'services', 'appointments', 'schedule', 'branding', 'security', 'staff', 'support'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!dentistId) return;

    const loadAppointmentSettings = async () => {
      setAppointmentLoading(true);
      try {
        const { data, error } = await supabase
          .from('dentists')
          .select('require_appointment_approval')
          .eq('id', dentistId)
          .single();

        if (error) throw error;
        setRequireApproval(data?.require_appointment_approval || false);
      } catch (error) {
        logger.error('Failed to load appointment settings', error);
        toast({
          title: "Couldn't load appointment settings",
          description: "Please refresh the page or try again in a moment.",
          variant: "destructive",
        });
      } finally {
        setAppointmentLoading(false);
      }
    };

    loadAppointmentSettings();
  }, [dentistId, toast]);

  const handleLeaveClinic = async () => {
    try {
      const businessId = await getCurrentBusinessId();
      const { data, error } = await supabase.rpc('leave_clinic', { p_business_id: businessId });
      if (error) throw error;

      const remaining = (data as any)?.remaining_businesses ?? null;
      const businessDeleted = (data as any)?.business_deleted ?? false;

      if (businessDeleted) {
        toast({
          title: "Business deleted",
          description: "You were the last member. The business has been permanently deleted.",
          variant: "default",
        });
      } else {
        toast({
          title: "Left clinic",
          description: remaining === 0
            ? "You left the clinic and your provider role was removed."
            : "You left the clinic. You still belong to other clinics.",
        });
      }

      // Navigate home to update role and UI
      navigate('/', { replace: true });
      window.location.reload(); // Force reload to ensure clean state
    } catch (error) {
      logger.error('Error leaving clinic:', error);
      toast({
        title: "Error",
        description: "Failed to leave clinic. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!dentistId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`?tab=${value}`, { replace: true });
  };

  return (
    <div className="container max-w-6xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <SettingsIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 sm:space-y-6">
        <TabsList className="flex flex-wrap w-full gap-1">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Services
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2">
            <Calendar className="h-4 w-4" />
            Availability
          </TabsTrigger>
          <TabsTrigger value="appointments" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Appointments
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2">
            <UserCog className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <DentistAdminProfile />
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <ServiceManager />
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Schedule & Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedAvailabilitySettings dentistId={dentistId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appointment preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border rounded-lg p-4">
                <div className="space-y-1">
                  <Label htmlFor="require-approval">Require approval before confirming</Label>
                  <p className="text-sm text-muted-foreground">
                    Approve new patient requests to prevent double booking or missing prep time.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="require-approval"
                    checked={requireApproval}
                    disabled={appointmentLoading || savingAppointments}
                    onCheckedChange={setRequireApproval}
                  />
                  <span className="text-sm text-muted-foreground">
                    {requireApproval ? 'Manual review required' : 'Requests auto-confirmed'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-muted-foreground">Save changes so patients see the right booking rules immediately.</p>
                <Button
                  onClick={async () => {
                    if (!dentistId) return;
                    setSavingAppointments(true);
                    const { error } = await supabase
                      .from('dentists')
                      .update({ require_appointment_approval: requireApproval })
                      .eq('id', dentistId);

                    if (error) {
                      toast({
                        title: "Couldn't save appointment settings",
                        description: error.message || "Try again in a moment.",
                        variant: "destructive",
                      });
                    } else {
                      toast({
                        title: "Appointment rules updated",
                        description: "Patients will see the new approval rules immediately.",
                      });
                    }
                    setSavingAppointments(false);
                  }}
                  disabled={appointmentLoading || savingAppointments}
                  className="min-w-[140px]"
                >
                  {savingAppointments ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Staff Management</CardTitle>
              <CardDescription>
                Manage your team members and their access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DentistAdminUsers />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-6">
          <DentistAdminBranding />
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <CancelSubscriptionSection />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <DentistAdminSecurity />

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that affect your clinic membership
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={handleLeaveClinic}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Leave Clinic
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                You will lose access to all clinic data and appointments.
                <br />
                <strong>Warning:</strong> If you are the last member, the entire business will be permanently deleted.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
