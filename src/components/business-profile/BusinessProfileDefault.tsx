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
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

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

interface HomepageSettings {
  hero_title: string;
  hero_subtitle: string;
  hero_image_url: string | null;
  show_services: boolean;
  show_about: boolean;
  about_title: string;
  about_content: string;
  cta_text: string;
  cta_link: string;
  is_active: boolean;
}

interface BusinessProfileDefaultProps {
  business: BusinessData;
  services: ServiceData[];
  team: TeamMember[];
  homepageSettings: HomepageSettings | null;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}min`;
  if (hours > 0) return `${hours}h`;
  return `${mins}min`;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-BE", {
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
  homepageSettings,
}: BusinessProfileDefaultProps) {
  const heroTitle =
    homepageSettings?.hero_title || `Welcome to ${business.name}`;
  const heroSubtitle =
    homepageSettings?.hero_subtitle ||
    business.tagline ||
    business.description ||
    "Your trusted dental care provider";
  const ctaText = homepageSettings?.cta_text || "Book an Appointment";
  const showServices =
    homepageSettings?.show_services !== false && services.length > 0;
  const showAbout = homepageSettings?.show_about !== false;
  const aboutTitle = homepageSettings?.about_title || `About ${business.name}`;
  const aboutContent =
    homepageSettings?.about_content ||
    business.description ||
    `${business.name} is committed to providing exceptional dental care in a comfortable and welcoming environment. Our experienced team uses the latest technology to deliver the best results for every patient.`;
  const heroImage = homepageSettings?.hero_image_url;
  const scrollToBooking = () => {
    const el = document.getElementById("booking-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const hasContactInfo =
    business.phone || business.email || business.address || business.website;
  const locationString = [business.address, business.city, business.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt={business.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm"
              >
                {getInitials(business.name)}
              </div>
            )}
            <span className="text-lg font-bold">{business.name}</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {showServices && (
              <a
                href="#services"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Services
              </a>
            )}
            {team.length > 0 && (
              <a
                href="#team"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Team
              </a>
            )}
            {showAbout && (
              <a
                href="#about"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                About
              </a>
            )}
            {hasContactInfo && (
              <a
                href="#contact"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact
              </a>
            )}
          </nav>
          <Button onClick={scrollToBooking} size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            {ctaText}
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {heroImage && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})` }}
          >
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          </div>
        )}
        <div
          className={cn(
            "relative container mx-auto px-4 py-24 md:py-32 lg:py-40",
            !heroImage && "bg-gradient-to-b from-primary/5 via-background to-background"
          )}
        >
          <div className="mx-auto max-w-3xl text-center">
            {business.logo_url && (
              <img
                src={business.logo_url}
                alt={business.name}
                className="mx-auto mb-8 h-20 w-20 rounded-2xl object-cover shadow-lg"
              />
            )}
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              {heroTitle}
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto">
              {heroSubtitle}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button onClick={scrollToBooking} size="lg" className="text-base px-8">
                <Calendar className="mr-2 h-5 w-5" />
                {ctaText}
              </Button>
              {business.phone && (
                <Button variant="outline" size="lg" className="text-base px-8" asChild>
                  <a href={`tel:${business.phone}`}>
                    <Phone className="mr-2 h-5 w-5" />
                    Call Us
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Info Bar */}
      {hasContactInfo && (
        <section className="border-y bg-muted/30">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-sm text-muted-foreground">
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  {business.phone}
                </a>
              )}
              {business.email && (
                <a
                  href={`mailto:${business.email}`}
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  {business.email}
                </a>
              )}
              {locationString && (
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {locationString}
                </span>
              )}
              {business.website && (
                <a
                  href={business.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  Website
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Services Section */}
      {showServices && (
        <section id="services" className="py-20 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold sm:text-4xl">Our Services</h2>
              <p className="mt-3 text-muted-foreground text-lg">
                Quality dental care tailored to your needs
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <Card
                  key={service.id}
                  className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-lg">{service.name}</h3>
                      {service.price_cents > 0 && (
                        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                          {formatPrice(service.price_cents)}
                        </span>
                      )}
                    </div>
                    {service.description && (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {service.description}
                      </p>
                    )}
                    {service.duration_minutes && (
                      <div className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDuration(service.duration_minutes)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Team Section */}
      {team.length > 0 && (
        <section id="team" className="py-20 px-4 bg-muted/30">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold sm:text-4xl">Meet Our Team</h2>
              <p className="mt-3 text-muted-foreground text-lg">
                Experienced professionals dedicated to your care
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {team.map((member) => (
                <Card key={member.id} className="text-center overflow-hidden">
                  <CardContent className="p-6">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.full_name || "Team member"}
                        className="mx-auto h-24 w-24 rounded-full object-cover mb-4"
                      />
                    ) : (
                      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 mb-4">
                        <Users className="h-10 w-10 text-primary" />
                      </div>
                    )}
                    <h3 className="font-semibold text-lg">
                      {member.full_name || "Team Member"}
                    </h3>
                    {member.specialization && (
                      <p className="text-sm text-primary mt-1">
                        {member.specialization}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1 capitalize">
                      {member.role}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About Section */}
      {showAbout && (
        <section id="about" className={cn("py-20 px-4", team.length === 0 && "bg-muted/30")}>
          <div className="container mx-auto max-w-3xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold sm:text-4xl">{aboutTitle}</h2>
            </div>
            <div className="prose prose-lg mx-auto text-muted-foreground whitespace-pre-line text-center">
              {aboutContent}
            </div>
          </div>
        </section>
      )}

      {/* Booking / CTA Section */}
      <section
        id="booking-section"
        className="py-20 px-4 bg-primary/5 border-t"
      >
        <div className="container mx-auto max-w-2xl text-center">
          <Calendar className="mx-auto h-12 w-12 text-primary mb-6" />
          <h2 className="text-3xl font-bold sm:text-4xl mb-4">
            Ready to Book?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Schedule your appointment with {business.name} today.
            {business.phone && " Or give us a call — we're happy to help."}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-base px-8" asChild>
              <Link to={`/clinic/${business.slug}`}>
                <Calendar className="mr-2 h-5 w-5" />
                {ctaText}
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
        <section id="contact" className="py-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold sm:text-4xl">Get in Touch</h2>
              <p className="mt-3 text-muted-foreground text-lg">
                We&apos;d love to hear from you
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="flex flex-col items-center gap-3 rounded-xl border p-6 hover:bg-muted/50 transition-colors text-center"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">
                      {business.phone}
                    </p>
                  </div>
                </a>
              )}
              {business.email && (
                <a
                  href={`mailto:${business.email}`}
                  className="flex flex-col items-center gap-3 rounded-xl border p-6 hover:bg-muted/50 transition-colors text-center"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">
                      {business.email}
                    </p>
                  </div>
                </a>
              )}
              {locationString && (
                <div className="flex flex-col items-center gap-3 rounded-xl border p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {locationString}
                    </p>
                  </div>
                </div>
              )}
              {business.website && (
                <a
                  href={business.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-3 rounded-xl border p-6 hover:bg-muted/50 transition-colors text-center"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Website</p>
                    <p className="text-sm text-muted-foreground">Visit Site</p>
                  </div>
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t bg-card py-8 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt={business.name}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <Building2 className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="font-semibold">{business.name}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} {business.name}. All rights
            reserved.
          </p>
          <p className="mt-2 text-xs text-muted-foreground/60">
            Powered by{" "}
            <Link to="/" className="hover:text-primary transition-colors">
              Caberu
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
