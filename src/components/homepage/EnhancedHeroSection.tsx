import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Calendar, 
  Shield, 
  Clock, 
  Users, 
  Star,
  ArrowRight,
  CheckCircle,
  Sparkles,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedAuthForm } from '@/components/auth/EnhancedAuthForm';
import { PWAManager } from '@/components/pwa/PWAManager';
import { AccessibilityManager } from '@/components/accessibility/AccessibilityManager';

interface EnhancedHeroSectionProps {
  className?: string;
}

export const EnhancedHeroSection: React.FC<EnhancedHeroSectionProps> = ({ className }) => {
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);

  const features = [
    {
      icon: Calendar,
      title: "Smart Booking",
      description: "AI-powered appointment scheduling that works around your schedule"
    },
    {
      icon: Shield,
      title: "GDPR Compliant",
      description: "Your health data is protected with enterprise-grade security"
    },
    {
      icon: Clock,
      title: "24/7 Access",
      description: "Book appointments and access your records anytime, anywhere"
    },
    {
      icon: Users,
      title: "Expert Care",
      description: "Connect with qualified dental professionals in your area"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      location: "Brussels, Belgium",
      rating: 5,
      text: "Caberu made booking my emergency appointment so easy. The AI chat understood exactly what I needed."
    },
    {
      name: "Michael Chen",
      location: "Antwerp, Belgium", 
      rating: 5,
      text: "Finally, a dental platform that actually works! No more phone calls during business hours."
    },
    {
      name: "Emma Rodriguez",
      location: "Ghent, Belgium",
      rating: 5,
      text: "The reminders and follow-up care tracking have been game-changing for our family's dental health."
    }
  ];

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Add sticky auth CTA visibility tracking
    const handleScroll = () => {
      const heroHeight = window.innerHeight;
      const scrolled = window.scrollY > heroHeight * 0.7;
      document.body.classList.toggle('show-sticky-auth', scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (showAuthForm) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="w-full max-w-md">
          <Button
            variant="ghost"
            onClick={() => setShowAuthForm(false)}
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            ← Back to homepage
          </Button>
          <EnhancedAuthForm 
            onSuccess={() => setShowAuthForm(false)}
            showNextParam={true}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <PWAManager />
      <AccessibilityManager />
      
      <section className={cn(
        "relative min-h-screen flex items-center justify-center overflow-hidden",
        "bg-gradient-to-br from-primary/5 via-background to-secondary/5",
        className
      )}>
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/2 w-96 h-96 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-gradient-to-tr from-secondary/20 to-primary/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="container mx-auto px-4 py-12 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div className={cn(
              "space-y-8 text-center lg:text-left transition-all duration-1000",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}>
              <div className="space-y-4">
                <Badge variant="secondary" className="inline-flex items-center gap-2 px-4 py-2">
                  <Sparkles className="w-4 h-4" />
                  Trusted by 10,000+ patients across Belgium
                </Badge>
                
                <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                  Your{" "}
                  <span className="bg-gradient-primary bg-clip-text text-transparent">
                    Smart Dental
                  </span>
                  {" "}Assistant
                </h1>
                
                <p className="text-xl text-muted-foreground max-w-2xl">
                  Book appointments instantly with AI-powered scheduling. 
                  Access your dental records, get personalized care recommendations, 
                  and never miss another appointment.
                </p>
              </div>

              {/* Feature highlights */}
              <div className="grid sm:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-all duration-500",
                      "hover:bg-accent/50 cursor-default",
                      currentFeature === index && "bg-accent/50 scale-105"
                    )}
                  >
                    <div className="p-2 rounded-full bg-primary/10">
                      <feature.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-sm">{feature.title}</div>
                      <div className="text-xs text-muted-foreground">{feature.description}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  size="lg"
                  onClick={() => setShowAuthForm(true)}
                  className="h-14 px-8 text-lg font-medium bg-gradient-primary hover:opacity-90 transition-all duration-200 transform hover:scale-105"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 px-8 text-lg border-2 hover:bg-accent"
                  onClick={() => {
                    const featuresSection = document.getElementById('features');
                    featuresSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Learn More
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="flex items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  GDPR Compliant
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  ISO 27001 Certified
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  4.9/5 Rating
                </div>
              </div>
            </div>

            {/* Right Column - Testimonials & Demo */}
            <div className={cn(
              "space-y-6 transition-all duration-1000 delay-300",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}>
              {/* Testimonial carousel */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center">What our patients say</h3>
                <div className="grid gap-4">
                  {testimonials.slice(0, 2).map((testimonial, index) => (
                    <Card key={index} className="glass-card border-border/20">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-1 mb-2">
                              {[...Array(testimonial.rating)].map((_, i) => (
                                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              "{testimonial.text}"
                            </p>
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="font-medium text-sm">{testimonial.name}</div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="w-3 h-3" />
                                  {testimonial.location}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-accent/20">
                  <div className="text-2xl font-bold text-primary">10K+</div>
                  <div className="text-xs text-muted-foreground">Happy Patients</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-accent/20">
                  <div className="text-2xl font-bold text-primary">500+</div>
                  <div className="text-xs text-muted-foreground">Dental Clinics</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-accent/20">
                  <div className="text-2xl font-bold text-primary">99.9%</div>
                  <div className="text-xs text-muted-foreground">Uptime</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Auth CTA */}
        <div 
          id="sticky-auth-cta"
          className="fixed bottom-6 right-6 z-50 opacity-0 transform translate-y-full transition-all duration-300 pointer-events-none"
        >
          <Button
            onClick={() => setShowAuthForm(true)}
            className="h-12 px-6 shadow-elegant bg-gradient-primary hover:opacity-90 pointer-events-auto"
          >
            Sign In
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </section>

      <style>{`
        .show-sticky-auth #sticky-auth-cta {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
      `}</style>
    </>
  );
};
