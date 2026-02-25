import { useState, useEffect } from "react";
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
import { FloatingChatBubble } from "@/components/chat/FloatingChatBubble";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { TestimonialsSection } from "@/components/homepage/TestimonialsSection";
import { FAQSection } from "@/components/homepage/FAQSection";
import { ContactForm } from "@/components/homepage/ContactForm";
import { PremiumHeroSection } from "@/components/homepage/PremiumHeroSection";
import { FeatureSection } from "@/components/homepage/feature-section";
// import { VideoShowcase } from "@/components/homepage/VideoShowcase";
const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDemoTour, setShowDemoTour] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
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
        <PremiumHeroSection />

        {/* Video Showcase */}
        {/* <VideoShowcase /> */}

        {/* Enhanced Feature Section */}
        <FeatureSection />

        {/* Interactive Features Grid */}
        <InteractiveBentoGrid />

        {/* Testimonials */}
        <TestimonialsSection />

        {/* Results */}
        <ResultsSection />

        {/* FAQ */}
        <FAQSection />

        {/* Pricing */}
        <PricingSection />

        {/* CTA Section */}
        <section className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden bg-slate-900">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-tight">
              Transform Your Practice Today
            </h2>
            <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
              Join hundreds of forward-thinking dentists who have switched to Caberu for a more efficient, patient-centric practice.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="h-16 px-10 text-lg bg-white text-slate-900 hover:bg-slate-100 rounded-full shadow-2xl font-bold transition-all hover:scale-105" onClick={() => navigate('/signup')}>
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="h-16 px-10 text-lg border-2 border-white bg-transparent text-white hover:bg-white hover:text-slate-900 rounded-full font-semibold transition-all" onClick={() => setShowContactForm(true)}>
                Contact Sales
              </Button>
            </div>
            <p className="mt-8 text-sm text-slate-500">
              No credit card required • Cancel anytime
            </p>
          </div>
        </section>
      </main>

      <Footer />

      <DemoTourFlow isOpen={showDemoTour} onClose={() => setShowDemoTour(false)} />

      <ContactForm open={showContactForm} onOpenChange={setShowContactForm} />

      <FloatingChatBubble />
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav variant="default" />
    </div>;
};
export default Index;