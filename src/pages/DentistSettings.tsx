import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Calendar, Palette, Shield, User, LogOut, Mail, HelpCircle, UserCog, CheckCircle2 } from "lucide-react";
import { EnhancedAvailabilitySettings } from "@/components/enhanced/EnhancedAvailabilitySettings";
import DentistAdminBranding from "./DentistAdminBranding";
import DentistAdminSecurity from "./DentistAdminSecurity";
import DentistAdminProfile from "./DentistAdminProfile";
import DentistAdminUsers from "./DentistAdminUsers";
import { useCurrentDentist } from "@/hooks/useCurrentDentist";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrentBusinessId } from "@/lib/businessUtils";
import { logger } from '@/lib/logger';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
    if (tabParam && ['profile', 'appointments', 'schedule', 'branding', 'security', 'staff', 'support'].includes(tabParam)) {
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

  return (
    <div className="container max-w-6xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-3 flex-col sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <SettingsIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">A simpler control center for your practice, appointments, and team</p>
          </div>
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground bg-muted/50 border rounded-lg px-3 py-2">
          Quick tip: finish appointments and schedule first, then polish branding and permissions.
        </div>
      </div>

      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-primary/5">
        <CardContent className="p-4 sm:p-6 grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Practice basics</h3>
            <p className="text-sm text-muted-foreground">Keep your public profile lean and accurate for patients.</p>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Appointments</h3>
            <p className="text-sm text-muted-foreground">Control approvals, rules, and availability before inviting patients.</p>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Team, brand & access</h3>
            <p className="text-sm text-muted-foreground">Manage roles, visual identity, and safety without digging through menus.</p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
          <TabsTrigger value="profile" className="gap-2 text-left flex-col items-start">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="font-semibold">Profile</span>
            </div>
            <span className="text-[11px] text-muted-foreground">Contact details & clinic bio</span>
          </TabsTrigger>
          <TabsTrigger value="appointments" className="gap-2 text-left flex-col items-start">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-semibold">Appointments</span>
            </div>
            <span className="text-[11px] text-muted-foreground">Approvals & booking rules</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2 text-left flex-col items-start">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="font-semibold">Availability</span>
            </div>
            <span className="text-[11px] text-muted-foreground">Working hours & breaks</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2 text-left flex-col items-start">
            <div className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              <span className="font-semibold">Team & access</span>
            </div>
            <span className="text-[11px] text-muted-foreground">Roles, invites, permissions</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2 text-left flex-col items-start">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="font-semibold">Branding</span>
            </div>
            <span className="text-[11px] text-muted-foreground">Logo, patient emails & AI tone</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 text-left flex-col items-start">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="font-semibold">Security</span>
            </div>
            <span className="text-[11px] text-muted-foreground">Access control & danger zone</span>
          </TabsTrigger>
          <TabsTrigger value="support" className="gap-2 text-left flex-col items-start">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              <span className="font-semibold">Support</span>
            </div>
            <span className="text-[11px] text-muted-foreground">Help channels & tips</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <DentistAdminProfile />
        </TabsContent>

        <TabsContent value="appointments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appointment preferences</CardTitle>
              <CardDescription>Keep booking rules close to scheduling instead of hiding them in your profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="require-approval">Require approval before confirming</Label>
                  <p className="text-sm text-muted-foreground">
                    Approve new patient requests manually to avoid double booking or prep issues.
                  </p>
                </div>
                <Switch
                  id="require-approval"
                  checked={requireApproval}
                  disabled={appointmentLoading || savingAppointments}
                  onCheckedChange={setRequireApproval}
                />
              </div>
              <div className="flex justify-end">
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
                  className="min-w-[120px]"
                >
                  {savingAppointments ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Schedule & Availability</CardTitle>
              <CardDescription>
                Manage your working hours, breaks, and time off
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnhancedAvailabilitySettings dentistId={dentistId} />
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

        <TabsContent value="support" className="space-y-6">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <HelpCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Contact Support</CardTitle>
                  <CardDescription>
                    Need help? We're here for you
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  If you have any questions, issues, or need assistance with the platform, our support team is ready to help.
                </p>
                
                <div className="bg-background/50 border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Mail className="h-4 w-4 text-primary" />
                    <span>Email Support</span>
                  </div>
                  <a 
                    href="mailto:romeo@caberu.be"
                    className="block text-primary hover:text-primary-glow transition-colors font-medium text-lg"
                  >
                    romeo@caberu.be
                  </a>
                  <p className="text-sm text-muted-foreground">
                    We typically respond within 24 hours during business days
                  </p>
                </div>

                <Button 
                  onClick={() => window.location.href = 'mailto:romeo@caberu.be'}
                  className="w-full gap-2 bg-gradient-to-r from-primary to-primary-glow"
                  size="lg"
                >
                  <Mail className="h-5 w-5" />
                  Send Email
                </Button>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-3">Common Topics</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Account and billing questions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Technical support and troubleshooting</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Feature requests and feedback</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Data migration and import assistance</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
