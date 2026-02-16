import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { BusinessProfileDefault } from "@/components/business-profile/BusinessProfileDefault";

interface BusinessData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tagline: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  created_at: string;
}

interface ServiceData {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  price_cents: number;
  is_active: boolean;
}

interface TeamMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  specialization: string | null;
}

export default function BusinessProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    loadBusinessProfile(slug);
  }, [slug]);

  const loadBusinessProfile = async (businessSlug: string) => {
    try {
      // Case-insensitive slug lookup
      const normalizedSlug = businessSlug.toLowerCase();

      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("*")
        .ilike("slug", normalizedSlug)
        .single();

      if (businessError || !businessData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setBusiness(businessData);

      // Fetch services and team members in parallel
      const [servicesResult, teamResult] = await Promise.all([
        supabase
          .from("business_services")
          .select("*")
          .eq("business_id", businessData.id)
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("business_members")
          .select("id, role, profile_id")
          .eq("business_id", businessData.id)
          .in("role", ["dentist", "admin"]),
      ]);

      if (servicesResult.data) {
        setServices(servicesResult.data);
      }

      // Fetch profile details for team members
      if (teamResult.data && teamResult.data.length > 0) {
        const profileIds = teamResult.data.map((m) => m.profile_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, specialization")
          .in("id", profileIds);

        if (profiles) {
          const teamMembers = teamResult.data.map((member) => {
            const profile = profiles.find((p) => p.id === member.profile_id);
            return {
              id: member.id,
              full_name: profile?.full_name ?? null,
              avatar_url: profile?.avatar_url ?? null,
              role: member.role,
              specialization: profile?.specialization ?? null,
            };
          });
          setTeam(teamMembers);
        }
      }

      setLoading(false);
    } catch {
      setNotFound(true);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (notFound || !business) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          The business you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          Go to Homepage
        </Link>
      </div>
    );
  }

  return (
    <BusinessProfileDefault
      business={business}
      services={services}
      team={team}
    />
  );
}
