import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/auth/auth-form";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2 } from "lucide-react";
import { logger } from '@/lib/logger';
import { CustomizableHomepage } from "@/components/business/CustomizableHomepage";
import { changeLanguage } from "@/hooks/useLanguage";
import type { Language } from "@/lib/translations";

export default function BusinessPortal() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [homepageSettings, setHomepageSettings] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    checkBusinessAndAuth();
  }, [slug]);

  const checkBusinessAndAuth = async () => {
    try {
      // Check if business exists
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("*")
        .eq("slug", slug)
        .single();

      if (businessError || !businessData) {
        setError("Business not found");
        setLoading(false);
        return;
      }

      setBusiness(businessData);

      // Apply the business's default language for the public page
      if (businessData.default_language && !localStorage.getItem("preferred-language")) {
        changeLanguage(businessData.default_language as Language);
      }

      // Load homepage settings
      const { data: homepageData } = await supabase
        .from("homepage_settings")
        .select("*")
        .eq("business_id", businessData.id)
        .single();

      if (homepageData) {
        setHomepageSettings(homepageData);
      }

      // Load services
      const { data: servicesData } = await supabase
        .from("business_services")
        .select("*")
        .eq("business_id", businessData.id)
        .eq("is_active", true);

      if (servicesData) {
        setServices(servicesData);
      }

      // Check if user is authenticated
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser) {
        setUser(currentUser);
        // Set this business as current business
        await setBusinessContext(currentUser.id, businessData.id);
        
        // Get user's role to determine redirect
        const { data: profile } = await supabase
          .from("secure_profiles_view")
          .select("id")
          .eq("user_id", currentUser.id)
          .single();

        if (profile) {
          // Check if user is a member of this business
          const { data: membership } = await supabase
            .from("business_members")
            .select("role")
            .eq("business_id", businessData.id)
            .eq("profile_id", profile.id)
            .single();

          if (membership) {
            // Redirect to dentist portal if they're a business member
            navigate("/dentist", { replace: true });
          } else {
            // Otherwise, they're a patient - redirect to patient portal
            navigate("/patient", { replace: true });
          }
        }
      }

      setLoading(false);
    } catch (err) {
      console.error("Error checking business:", err);
      setError("An error occurred");
      setLoading(false);
    }
  };

  const setBusinessContext = async (userId: string, businessId: string) => {
    await supabase
      .from("session_business")
      .upsert({
        user_id: userId,
        business_id: businessId,
        updated_at: new Date().toISOString(),
      });
  };

  const handleAuthSuccess = async () => {
    // Reload to trigger the auth check and redirect
    window.location.reload();
  };

  const handleCTAClick = () => {
    // Trigger auth form display by scrolling to auth section or navigate
    const authSection = document.getElementById('auth-section');
    if (authSection) {
      authSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>
              {error || "Business not found"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // If homepage settings exist and is active, show customizable homepage
  if (homepageSettings && homepageSettings.is_active) {
    return (
      <>
        <CustomizableHomepage
          business={business}
          settings={homepageSettings}
          services={services}
          onCTAClick={handleCTAClick}
        />
        {/* Auth section for booking */}
        <div id="auth-section" className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-md">
            <Card className="border-2">
              <CardHeader className="text-center">
                <CardTitle>Sign In to Book</CardTitle>
                <CardDescription>
                  Create an account or sign in to book your appointment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AuthForm onSuccess={handleAuthSuccess} />
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  // Default auth-focused view if no custom homepage
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted">
      <div className="w-full max-w-md space-y-6">
        <Card className="border-2">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              {business.logo_url ? (
                <img 
                  src={business.logo_url} 
                  alt={business.name}
                  className="w-12 h-12 object-contain rounded-full"
                />
              ) : (
                <Building2 className="w-8 h-8 text-primary" />
              )}
            </div>
            <div>
              <CardTitle className="text-2xl">{business.name}</CardTitle>
              {business.tagline && (
                <CardDescription className="mt-2">
                  {business.tagline}
                </CardDescription>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6">
              <AlertDescription>
                Sign in or create an account to book appointments with {business.name}
              </AlertDescription>
            </Alert>
            <div className="text-center text-muted-foreground">Please sign in to continue</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

