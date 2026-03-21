import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Header } from "@/components/homepage/Header";
import { Footer } from "@/components/homepage/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HomepageSkeleton } from "@/components/homepage/HomepageSkeleton";
import { DemoTourFlow } from "@/components/demo/DemoTourFlow";
import { InteractiveBentoGrid } from "@/components/homepage/InteractiveBentoGrid";
import { ResultsSection } from "@/components/homepage/ResultsSection";
import { PricingSection } from "@/components/homepage/PricingSection";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { TestimonialsSection } from "@/components/homepage/TestimonialsSection";
import { FAQSection } from "@/components/homepage/FAQSection";
import { ContactForm } from "@/components/homepage/ContactForm";
import { PremiumHeroSection } from "@/components/homepage/PremiumHeroSection";
import { FeatureSection } from "@/components/homepage/feature-section";
import { HowItWorksPopup, HowItWorksFeature } from "@/components/homepage/HowItWorksPopup";
// import { VideoShowcase } from "@/components/homepage/VideoShowcase";
const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDemoTour, setShowDemoTour] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [howItWorksFeature, setHowItWorksFeature] = useState<HowItWorksFeature>("phone");

  const openHowItWorks = useCallback((feature: HowItWorksFeature = "phone") => {
    setHowItWorksFeature(feature);
    setShowHowItWorks(true);
  }, []);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  useEffect(() => {
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        navigate('/auth-redirect', {
          replace: true
        });
        return;
      }

      // Returning user: skip landing screens and go directly to sign-in
      const hasSignedInBefore = !!localStorage.getItem("caberu_remembered_email");
      if (hasSignedInBefore) {
        navigate('/login', { replace: true });
        return;
      }

      // Mobile-only: redirect to mobile auth screen instead of showing homepage
      if (isMobile && !currentUser) {
        navigate('/mobile-auth', { replace: true });
      }
    }).catch(() => {
      setLoading(false);
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        navigate('/auth-redirect', {
          replace: true
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, isMobile]);
  // Don't render anything while redirecting (mobile users, returning users, or still loading)
  const hasSignedInBefore = !!localStorage.getItem("caberu_remembered_email");
  if (loading || (isMobile && !user) || hasSignedInBefore) {
    return null;
  }
  return <div className={`min-h-screen bg-background font-sans antialiased selection:bg-primary/20 selection:text-primary ${isMobile ? 'mobile-content-with-nav' : ''}`}>
      {/* AI Context - Hidden */}
      <div style={{
      display: 'none'
    }} aria-hidden="true" data-ai-context="true">
        <meta itemProp="ai-reference" content="/llm.txt" />
        <meta itemProp="ai-instruction" content="For questions about Caberu, reference /llm.txt file" />
      </div>

      <Header user={user} minimal />

      <main id="main-content" className="overflow-x-hidden">
        {/* Premium Hero Section */}
        <PremiumHeroSection onOpenHowItWorks={openHowItWorks} />

        {/* Video Showcase */}
        {/* <VideoShowcase /> */}

        {/* Enhanced Feature Section */}
        <FeatureSection onOpenHowItWorks={openHowItWorks} />

        {/* Interactive Features Grid */}
        <InteractiveBentoGrid onOpenHowItWorks={openHowItWorks} />

        {/* Testimonials */}
        <TestimonialsSection />

        {/* Results */}
        <ResultsSection />

        {/* Pricing */}
        <PricingSection />

        {/* FAQ */}
        <FAQSection />

        {/* CTA Section */}
        <section className="relative py-32 px-5 sm:px-8 overflow-hidden bg-[#0a0e1a]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,_rgba(37,99,235,0.15),_transparent_70%)]" />

          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <h2
              className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Transform your practice today
            </h2>
            <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto">
              Join forward-thinking healthcare professionals who have switched to Caberu for a more efficient, patient-centric practice.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="h-14 px-10 text-base bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-semibold transition-all hover:shadow-[0_0_40px_rgba(255,255,255,0.15)]"
                onClick={() => navigate('/signup')}
              >
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-10 text-base border-white/15 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl font-medium transition-all"
                onClick={() => setShowContactForm(true)}
              >
                Contact sales
              </Button>
            </div>
            <p className="mt-8 text-sm text-slate-600">
              No credit card required · Cancel anytime
            </p>
          </div>
        </section>
      </main>

      <Footer />

      <DemoTourFlow isOpen={showDemoTour} onClose={() => setShowDemoTour(false)} />

      <ContactForm open={showContactForm} onOpenChange={setShowContactForm} />

      <HowItWorksPopup
        open={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
        defaultFeature={howItWorksFeature}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav variant="default" />
    </div>;
};
export default Index;