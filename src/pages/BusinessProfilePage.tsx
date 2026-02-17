import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { BusinessProfileDefault } from "@/components/business-profile/BusinessProfileDefault";
import { upsertMetaTag, setCanonical, setJsonLd } from "@/lib/seo";
import { setPageLanguage, clearPageLanguage } from "@/hooks/useLanguage";
import type { Language } from "@/lib/translations";

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
  default_language: string | null;
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

function applyBusinessSEO(business: BusinessData, services: ServiceData[], team: TeamMember[]) {
  const title = `${business.name} — ${business.tagline || "Cabinet Dentaire"} | Caberu`;
  const description =
    business.description?.slice(0, 155) ||
    `${business.name}${business.city ? ` à ${business.city}` : ""} — Prenez rendez-vous en ligne. Soins dentaires de qualité pour toute la famille.`;

  document.title = title;
  upsertMetaTag("description", description);
  upsertMetaTag("og:title", title);
  upsertMetaTag("og:description", description);
  upsertMetaTag("og:type", "business.business");
  upsertMetaTag("og:url", `${window.location.origin}/${business.slug}`);
  if (business.logo_url) {
    upsertMetaTag("og:image", business.logo_url);
  }
  upsertMetaTag("og:image:alt", `${business.name} — Cabinet Dentaire`);
  upsertMetaTag("twitter:title", title);
  upsertMetaTag("twitter:description", description);
  if (business.logo_url) {
    upsertMetaTag("twitter:image", business.logo_url);
  }

  setCanonical(`${window.location.origin}/${business.slug}`);

  // Build DentalClinic / MedicalBusiness structured data
  const locationString = [business.address, business.city, business.country].filter(Boolean).join(", ");

  const structuredData: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Dentist",
    name: business.name,
    description: business.description || description,
    url: `${window.location.origin}/${business.slug}`,
    ...(business.logo_url && { image: business.logo_url }),
    ...(business.phone && { telephone: business.phone }),
    ...(business.email && { email: business.email }),
    ...(business.website && { sameAs: [business.website] }),
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      ...(business.address && { streetAddress: business.address }),
      ...(business.city && { addressLocality: business.city }),
      ...(business.country && { addressCountry: business.country }),
    },
    ...(locationString && { areaServed: { "@type": "Place", name: locationString } }),
  };

  // Add services as hasOfferCatalog
  if (services.length > 0) {
    structuredData.hasOfferCatalog = {
      "@type": "OfferCatalog",
      name: "Services Dentaires",
      itemListElement: services.map((s) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "MedicalProcedure",
          name: s.name,
          ...(s.description && { description: s.description }),
        },
        ...(s.price_cents > 0 && {
          price: (s.price_cents / 100).toFixed(2),
          priceCurrency: "EUR",
        }),
      })),
    };
  }

  // Add team as employees
  if (team.length > 0) {
    structuredData.employee = team
      .filter((m) => m.full_name)
      .map((m) => ({
        "@type": "Person",
        name: m.full_name,
        ...(m.specialization && { jobTitle: m.specialization }),
        ...(m.avatar_url && { image: m.avatar_url }),
      }));
  }

  setJsonLd(structuredData);
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

  // Apply the business's default language for all visitors on this page.
  // Uses setPageLanguage (not changeLanguage) so the visitor's personal
  // language preference stored in localStorage is never overwritten.
  // clearPageLanguage on unmount releases the lock so other pages restore
  // the visitor's own preference.
  useEffect(() => {
    if (business?.default_language) {
      setPageLanguage(business.default_language as Language);
    }
    return () => clearPageLanguage();
  }, [business?.default_language]);

  const loadBusinessProfile = async (businessSlug: string) => {
    try {
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

      const loadedServices = servicesResult.data || [];
      setServices(loadedServices);

      let loadedTeam: TeamMember[] = [];
      if (teamResult.data && teamResult.data.length > 0) {
        const profileIds = teamResult.data.map((m) => m.profile_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, specialization")
          .in("id", profileIds);

        if (profiles) {
          loadedTeam = teamResult.data.map((member) => {
            const profile = profiles.find((p) => p.id === member.profile_id);
            return {
              id: member.id,
              full_name: profile?.full_name ?? null,
              avatar_url: profile?.avatar_url ?? null,
              role: member.role,
              specialization: profile?.specialization ?? null,
            };
          });
          setTeam(loadedTeam);
        }
      }

      // Apply SEO after all data is loaded
      applyBusinessSEO(businessData, loadedServices, loadedTeam);

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
