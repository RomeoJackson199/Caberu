import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Globe,
  Clock,
  Users,
  Heart,
  Shield,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState, useRef, useCallback } from "react";
import { useLanguage } from "@/hooks/useLanguage";

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
}

interface TeamMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  specialization: string | null;
}

interface BusinessProfileDefaultProps {
  business: BusinessData;
  services: ServiceData[];
  team: TeamMember[];
}

const MAX_VISIBLE_SERVICES = 6;

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h${mins}`;
  if (hours > 0) return `${hours}h`;
  return `${mins} min`;
}

function formatPrice(cents: number, language: string): string {
  const locale = language === "nl" ? "nl-BE" : language === "fr" ? "fr-BE" : "en-BE";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function BusinessProfileDefault({
  business,
  services,
  team,
}: BusinessProfileDefaultProps) {
  const { t, language } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const teamCarouselRef = useRef<HTMLDivElement>(null);
  const servicesCarouselRef = useRef<HTMLDivElement>(null);

  const heroTitle = business.tagline || `${t.bp_heroTitlePrefix} ${business.name}`;
  const heroSubtitle = business.description || t.bp_defaultSubtitle;
  const aboutContent = business.description || t.bp_defaultAbout(business.name);
  const showServices = services.length > 0;
  const visibleServices = services.slice(0, MAX_VISIBLE_SERVICES);
  const hasMoreServices = services.length > MAX_VISIBLE_SERVICES;

  const loginLink = `/login?business=${encodeURIComponent(business.slug)}`;

  const scrollToBooking = () => {
    const el = document.getElementById("booking-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const scrollCarousel = useCallback((ref: React.RefObject<HTMLDivElement | null>, direction: "left" | "right") => {
    if (!ref.current) return;
    const scrollAmount = 340;
    ref.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  }, []);

  const hasContactInfo =
    business.phone || business.email || business.address || business.website;
  const locationString = [business.address, business.city, business.country]
    .filter(Boolean)
    .join(", ");

  const navLinks = [
    ...(showServices ? [{ href: "#services", label: "Services" }] : []),
    ...(team.length > 0 ? [{ href: "#team", label: t.bp_navTeam }] : []),
    { href: "#about", label: t.bp_navAbout },
    ...(hasContactInfo ? [{ href: "#contact", label: t.bp_navContact }] : []),
  ];

  const valuePropItems = [
    { icon: Heart, title: t.bp_valueProp1Title, desc: t.bp_valueProp1Desc },
    { icon: Shield, title: t.bp_valueProp2Title, desc: t.bp_valueProp2Desc },
    { icon: Sparkles, title: t.bp_valueProp3Title, desc: t.bp_valueProp3Desc },
  ];

  function translateRole(role: string): string {
    switch (role) {
      case "dentist": return t.bp_roleDentist;
      case "admin": return t.bp_roleAdmin;
      case "staff": return t.bp_roleStaff;
      default: return role;
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
          <Link to={`/${business.slug}`} className="flex items-center gap-3 shrink-0">
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt={business.name}
                className="h-9 w-9 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">
                {getInitials(business.name)}
              </div>
            )}
            <span className="text-lg font-semibold tracking-tight hidden sm:inline">
              {business.name}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button onClick={scrollToBooking} size="sm" className="hidden sm:inline-flex">
              {t.bp_bookAppointment}
            </Button>
            <Button onClick={scrollToBooking} size="sm" className="sm:hidden">
              <Calendar className="h-4 w-4" />
            </Button>
            <button
              className="md:hidden p-2 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-blue-500/[0.03]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/[0.06] via-transparent to-transparent" />

        <div className="relative container mx-auto px-4 lg:px-8 py-20 md:py-28 lg:py-36">
          <div className="mx-auto max-w-3xl text-center">
            {business.logo_url && (
              <div className="mb-8 inline-flex">
                <img
                  src={business.logo_url}
                  alt={business.name}
                  className="h-20 w-20 rounded-2xl object-cover shadow-xl ring-4 ring-background"
                />
              </div>
            )}

            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              {heroTitle}
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-muted-foreground md:text-xl max-w-2xl mx-auto">
              {heroSubtitle}
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-base px-8 shadow-lg shadow-primary/20" asChild>
                <Link to={loginLink}>
                  <Calendar className="mr-2 h-5 w-5" />
                  {t.bp_bookAppointment}
                </Link>
              </Button>
              {business.phone && (
                <Button variant="outline" size="lg" className="text-base px-8" asChild>
                  <a href={`tel:${business.phone}`}>
                    <Phone className="mr-2 h-5 w-5" />
                    {t.bp_callUs}
                  </a>
                </Button>
              )}
            </div>

            {business.city && (
              <p className="mt-8 text-sm text-muted-foreground/70 flex items-center justify-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {business.city}{business.country ? `, ${business.country}` : ""}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="border-b bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8 py-12 md:py-16">
          <div className="grid gap-8 sm:grid-cols-3">
            {valuePropItems.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center text-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Carousel */}
      {showServices && (
        <section id="services" className="py-20 md:py-24 overflow-hidden">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="flex items-end justify-between mb-14">
              <div>
                <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">{t.bp_servicesLabel}</p>
                <h2 className="text-3xl font-bold sm:text-4xl">
                  {t.bp_servicesTitle}
                </h2>
                <p className="mt-4 text-muted-foreground text-lg max-w-xl">
                  {t.bp_servicesDesc}
                </p>
              </div>

              {services.length > 3 && (
                <div className="hidden md:flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => scrollCarousel(servicesCarouselRef, "left")}
                    className="flex h-10 w-10 items-center justify-center rounded-full border bg-background hover:bg-muted transition-colors"
                    aria-label="Previous"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => scrollCarousel(servicesCarouselRef, "right")}
                    className="flex h-10 w-10 items-center justify-center rounded-full border bg-background hover:bg-muted transition-colors"
                    aria-label="Next"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>

            <div
              ref={servicesCarouselRef}
              className={cn(
                "flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide",
                services.length <= 3 && "md:grid md:overflow-visible",
                services.length === 1 && "md:grid-cols-1 max-w-sm mx-auto",
                services.length === 2 && "md:grid-cols-2 max-w-2xl mx-auto",
                services.length === 3 && "md:grid-cols-3 max-w-5xl mx-auto",
              )}
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {visibleServices.map((service) => (
                <Link key={service.id} to={loginLink} className="block shrink-0 w-[300px] md:w-auto snap-start">
                  <Card className="group relative overflow-hidden border hover:border-primary/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors truncate">
                            {service.name}
                          </h3>
                          {service.description && (
                            <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                              {service.description}
                            </p>
                          )}
                        </div>
                        {service.price_cents > 0 && (
                          <span className="shrink-0 font-semibold text-primary text-lg">
                            {formatPrice(service.price_cents, language)}
                          </span>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t flex items-center justify-between">
                        {service.duration_minutes ? (
                          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDuration(service.duration_minutes)}
                          </span>
                        ) : (
                          <span />
                        )}
                        <span className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          {t.bp_bookVerb}
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}

              {/* "Show more" card at the end if there are more services */}
              {hasMoreServices && (
                <Link to={loginLink} className="block shrink-0 w-[300px] md:w-auto snap-start">
                  <Card className="group h-full border border-dashed hover:border-primary/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex items-center justify-center min-h-[160px]">
                    <CardContent className="p-6 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/15 transition-colors">
                          <ArrowRight className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold group-hover:text-primary transition-colors">
                            {t.bp_viewAllServices}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t.bp_moreServices(services.length - MAX_VISIBLE_SERVICES)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Meet Our Dentists — Horizontal Carousel */}
      {team.length > 0 && (
        <section id="team" className="py-20 md:py-24 bg-muted/30 overflow-hidden">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="flex items-end justify-between mb-14">
              <div>
                <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">{t.bp_teamLabel}</p>
                <h2 className="text-3xl font-bold sm:text-4xl">
                  {t.bp_teamTitle}
                </h2>
                <p className="mt-4 text-muted-foreground text-lg max-w-xl">
                  {t.bp_teamDesc}
                </p>
              </div>

              {/* Carousel nav arrows — only show if more than 3 members */}
              {team.length > 3 && (
                <div className="hidden md:flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => scrollCarousel(teamCarouselRef, "left")}
                    className="flex h-10 w-10 items-center justify-center rounded-full border bg-background hover:bg-muted transition-colors"
                    aria-label="Previous"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => scrollCarousel(teamCarouselRef, "right")}
                    className="flex h-10 w-10 items-center justify-center rounded-full border bg-background hover:bg-muted transition-colors"
                    aria-label="Next"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Carousel container */}
            <div
              ref={teamCarouselRef}
              className={cn(
                "flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide",
                team.length <= 3 && "md:grid md:overflow-visible",
                team.length === 1 && "md:grid-cols-1 max-w-sm mx-auto",
                team.length === 2 && "md:grid-cols-2 max-w-2xl mx-auto",
                team.length === 3 && "md:grid-cols-3 max-w-4xl mx-auto",
              )}
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {team.map((member) => (
                <Card
                  key={member.id}
                  className="shrink-0 w-[280px] md:w-auto snap-start overflow-hidden border hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
                >
                  <CardContent className="p-0">
                    {/* Avatar area */}
                    <div className="relative h-48 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center overflow-hidden">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.full_name || t.bp_teamMemberFallback}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                            <Users className="h-10 w-10 text-primary" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-5">
                      <h3 className="font-semibold text-lg">
                        {member.full_name || t.bp_teamMemberFallback}
                      </h3>
                      {member.specialization && (
                        <p className="text-sm font-medium text-primary mt-1">
                          {member.specialization}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        {translateRole(member.role)}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors"
                        asChild
                      >
                        <Link to={loginLink}>
                          <Calendar className="mr-2 h-3.5 w-3.5" />
                          {t.bp_bookAppointment}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About Section */}
      <section id="about" className={cn("py-20 md:py-24 px-4 lg:px-8", team.length === 0 && "bg-muted/30")}>
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-[1fr,1.5fr] gap-12 items-center">
            <div>
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">{t.bp_aboutLabel}</p>
              <h2 className="text-3xl font-bold sm:text-4xl">
                {business.name}
              </h2>
              {business.city && (
                <p className="mt-2 text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {business.city}{business.country ? `, ${business.country}` : ""}
                </p>
              )}
            </div>
            <div className="text-muted-foreground leading-relaxed text-base whitespace-pre-line">
              {aboutContent}
            </div>
          </div>
        </div>
      </section>

      {/* Booking / CTA Section */}
      <section
        id="booking-section"
        className="relative py-20 md:py-24 px-4 lg:px-8 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-primary/[0.03] to-blue-500/[0.04]" />
        <div className="relative container mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-8">
            <Calendar className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold sm:text-4xl mb-4">
            {t.bp_ctaTitle}
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-lg mx-auto">
            {t.bp_ctaDesc(business.name)}
            {business.phone && t.bp_ctaCallDesc}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-base px-8 shadow-lg shadow-primary/20" asChild>
              <Link to={loginLink}>
                <Calendar className="mr-2 h-5 w-5" />
                {t.bp_bookAppointment}
              </Link>
            </Button>
            {business.phone && (
              <Button variant="outline" size="lg" className="text-base px-8" asChild>
                <a href={`tel:${business.phone}`}>
                  <Phone className="mr-2 h-5 w-5" />
                  {business.phone}
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      {hasContactInfo && (
        <section id="contact" className="py-20 md:py-24 px-4 lg:px-8 border-t">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Contact</p>
              <h2 className="text-3xl font-bold sm:text-4xl">{t.bp_contactTitle}</h2>
              <p className="mt-4 text-muted-foreground text-lg">
                {t.bp_contactDesc}
              </p>
            </div>
            <div className={cn(
              "grid gap-5 sm:grid-cols-2",
              [business.phone, business.email, locationString, business.website].filter(Boolean).length > 2 && "lg:grid-cols-4"
            )}>
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-8 hover:border-primary/30 hover:shadow-lg transition-all text-center group"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                    <Phone className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{t.bp_contactPhone}</p>
                    <p className="text-sm text-muted-foreground mt-1">{business.phone}</p>
                  </div>
                </a>
              )}
              {business.email && (
                <a
                  href={`mailto:${business.email}`}
                  className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-8 hover:border-primary/30 hover:shadow-lg transition-all text-center group"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Email</p>
                    <p className="text-sm text-muted-foreground mt-1">{business.email}</p>
                  </div>
                </a>
              )}
              {locationString && (
                <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{t.bp_contactAddress}</p>
                    <p className="text-sm text-muted-foreground mt-1">{locationString}</p>
                  </div>
                </div>
              )}
              {business.website && (
                <a
                  href={business.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-8 hover:border-primary/30 hover:shadow-lg transition-all text-center group"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                    <Globe className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{t.bp_contactWebsite}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t.bp_contactVisitSite}</p>
                  </div>
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t bg-card/50 py-10 px-4 lg:px-8">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              {business.logo_url ? (
                <img
                  src={business.logo_url}
                  alt={business.name}
                  className="h-8 w-8 rounded-lg object-cover"
                />
              ) : (
                <Building2 className="h-6 w-6 text-muted-foreground" />
              )}
              <span className="font-semibold">{business.name}</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {business.phone && (
                <a href={`tel:${business.phone}`} className="hover:text-foreground transition-colors">
                  {business.phone}
                </a>
              )}
              {business.email && (
                <a href={`mailto:${business.email}`} className="hover:text-foreground transition-colors">
                  {business.email}
                </a>
              )}
              {locationString && <span>{locationString}</span>}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>
              &copy; {new Date().getFullYear()} {business.name}. {t.bp_footerRights}
            </p>
            <p className="text-xs text-muted-foreground/60">
              {t.bp_footerPoweredBy}{" "}
              <Link to="/" className="hover:text-primary transition-colors font-medium">
                Caberu
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
