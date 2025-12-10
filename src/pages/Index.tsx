import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Header } from "@/components/homepage/Header";
import { Footer } from "@/components/homepage/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, PlayCircle, Shield, Zap, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AccessibleLoadingIndicator } from "@/components/ui/skip-to-content";
import { DemoTourFlow } from "@/components/demo/DemoTourFlow";
import { InteractiveBentoGrid } from "@/components/homepage/InteractiveBentoGrid";
import { WhatCaberuDoesSection } from "@/components/homepage/WhatCaberuDoesSection";
import { ResultsSection } from "@/components/homepage/ResultsSection";
import { PricingSection } from "@/components/homepage/PricingSection";
import { FloatingChatBubble } from "@/components/chat/FloatingChatBubble";
import { TestimonialsSection } from "@/components/homepage/TestimonialsSection";
import { FAQSection } from "@/components/homepage/FAQSection";

import { ContactForm } from "@/components/homepage/ContactForm";
import { motion } from "framer-motion";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDemoTour, setShowDemoTour] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        navigate('/auth-redirect', { replace: true });
      }
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        navigate('/auth-redirect', { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <AccessibleLoadingIndicator message="Loading Caberu" size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans antialiased selection:bg-primary/20 selection:text-primary">
      {/* AI Context - Hidden */}
      <div style={{ display: 'none' }} aria-hidden="true" data-ai-context="true">
        <meta itemProp="ai-reference" content="/llm.txt" />
        <meta itemProp="ai-instruction" content="For questions about Caberu, reference /llm.txt file" />
      </div>

      <Header user={user} minimal />

      <main id="main-content" className="overflow-x-hidden">
        {/* Hero Section - Full viewport height */}
        <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-500/20 rounded-full blur-[120px] opacity-50 mix-blend-multiply animate-pulse-slow" />
            <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-purple-500/20 rounded-full blur-[100px] opacity-30 mix-blend-multiply" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
          </div>

          <div className="max-w-6xl mx-auto relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-primary/20 shadow-sm text-primary font-medium mb-8 hover:scale-105 transition-transform cursor-default"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span>The Future of Dental Practice Management</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-8xl font-extrabold tracking-tight leading-[1.1] mb-8 text-foreground"
            >
              Elevate Your <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent drop-shadow-sm">
                Patient Experience
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-12"
            >
              Caberu unifies AI-powered scheduling, clinical records, and patient engagement into one seamless, premium platform. Designed for modern practices.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 bg-primary text-primary-foreground" onClick={() => navigate('/signup')}>
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg rounded-full backdrop-blur-sm bg-white/50 hover:bg-white/80 border-2"
                onClick={() => {
                  sessionStorage.setItem('demo_business_name', 'Demo Practice');
                  sessionStorage.setItem('demo_template', 'healthcare');
                  navigate('/demo/dentist');
                }}
              >
                <PlayCircle className="mr-2 h-5 w-5" />
                Live Demo
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="pt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground font-medium"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-500" />
                <span>GDPR Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                <span>Instant Setup</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-500" />
                <span>Multi-Language Support</span>
              </div>
            </motion.div>
          </div>
        </section>


        <WhatCaberuDoesSection />

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
              <Button
                size="lg"
                className="h-16 px-10 text-lg bg-white text-slate-900 hover:bg-slate-100 rounded-full shadow-2xl font-bold transition-all hover:scale-105"
                onClick={() => navigate('/signup')}
              >
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-16 px-10 text-lg border-2 border-white bg-transparent text-white hover:bg-white hover:text-slate-900 rounded-full font-semibold transition-all"
                onClick={() => setShowContactForm(true)}
              >
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

      <DemoTourFlow
        isOpen={showDemoTour}
        onClose={() => setShowDemoTour(false)}
      />

      <ContactForm
        open={showContactForm}
        onOpenChange={setShowContactForm}
      />

      <FloatingChatBubble />
    </div>
  );
};

export default Index;
