import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { EnhancedAppointmentBooking } from "@/components/booking/EnhancedAppointmentBooking";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModernLoadingSpinner } from "@/components/enhanced/ModernLoadingSpinner";
import { BusinessSelectionForPatients } from "@/components/BusinessSelectionForPatients";
import { useToast } from "@/hooks/use-toast";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

export default function SmartBookAppointment() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { businessId: contextBusinessId, loading: businessLoading } = useBusinessContext();
  const [effectiveBusinessId, setEffectiveBusinessId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { ConfirmationDialog } = useUnsavedChanges({
    hasUnsavedChanges: false, // Smart booking handles its own state
  });

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!businessLoading) {
      const stored = sessionStorage.getItem('selected_business_id');
      setEffectiveBusinessId(contextBusinessId || stored);
    }
  }, [contextBusinessId, businessLoading]);

  if (loading || businessLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <ModernLoadingSpinner variant="overlay" message="Loading..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p>Please log in to book an appointment.</p>
            <Button onClick={() => navigate('/login')} className="mt-4">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Require business selection before booking flow
  if (!effectiveBusinessId) {
    return (
      <>
        <ConfirmationDialog />
        <div className="p-4 md:p-6">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Select Clinic to Continue</CardTitle>
              <CardDescription>Choose where you want to book your appointment.</CardDescription>
            </CardHeader>
            <CardContent>
              <BusinessSelectionForPatients
                selectedBusinessId={effectiveBusinessId || undefined}
                onSelectBusiness={(id, name) => {
                  localStorage.setItem('selected_business_id', id);
                  setEffectiveBusinessId(id);
                  toast({ title: 'Clinic selected', description: name });
                }}
              />
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <ConfirmationDialog />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4 md:p-6">
        <EnhancedAppointmentBooking
          user={user}
          onComplete={() => {
            toast({
              title: "Success!",
              description: "Your appointment has been booked successfully",
            });
            navigate('/dashboard');
          }}
          onCancel={() => navigate('/')}
        />
      </div>
    </>
  );
}
