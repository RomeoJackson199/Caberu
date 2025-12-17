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
  }, [navigate]);
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <AccessibleLoadingIndicator message="Loading Caberu" size="lg" />
      </div>;
  }
  return <div className="min-h-screen bg-background font-sans antialiased selection:bg-primary/20 selection:text-primary">
      {/* AI Context - Hidden */}
      <div style={{
      display: 'none'
    }} aria-hidden="true" data-ai-context="true">
        <meta itemProp="ai-reference" content="/llm.txt" />
        <meta itemProp="ai-instruction" content="For questions about Caberu, reference /llm.txt file" />
      </div>

      <Header user={user} minimal />

      <main id="main-content" className="overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />

          <div className="container mx-auto px-8 md:px-16 xl:px-24 relative z-10 py-16 max-w-5xl">
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white mb-4">
                  Every dental appointment should end cleanly.
                </h1>
                <p className="text-3xl md:text-4xl lg:text-5xl font-semibold text-blue-400">
                  Caberu makes sure it does.
                </p>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-xl md:text-2xl text-slate-300 leading-relaxed max-w-2xl"
              >
                Notes done. Payments sent. Follow-ups scheduled.
                <br />
                <span className="text-slate-400">Automatically — after each appointment.</span>
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="pt-4"
              >
                <Button 
                  size="lg" 
                  onClick={() => {
                    sessionStorage.setItem('demo_business_name', 'Demo Practice');
                    sessionStorage.setItem('demo_template', 'healthcare');
                    navigate('/demo/dentist');
                  }} 
                  className="bg-blue-600 hover:bg-blue-500 text-white hover:scale-105 transition-all shadow-2xl border-0 h-14 px-8 text-lg font-semibold"
                >
                  See how it works
                </Button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Feature Cards Section */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <div className="text-center max-w-4xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                The Operating System That Closes Every Dental Appointment — Automatically
              </h2>
              <p className="text-xl text-slate-600">
                Caberu handles the admin after every visit so nothing is forgotten, delayed, or lost.
              </p>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Card 1 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="bg-slate-50 rounded-2xl p-8 border border-slate-200"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-6">
                  <Zap className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  Appointment Closure Automation
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Every appointment ends cleanly — without extra work. Caberu completes notes, creates the treatment summary, sends payment requests, and schedules follow-ups automatically. Dentists finish their day with nothing left undone.
                </p>
              </motion.div>

              {/* Card 2 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="bg-slate-50 rounded-2xl p-8 border border-slate-200"
              >
                <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mb-6">
                  <Shield className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  Payments & Follow-Up Handled for You
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  No more missed invoices or forgotten reminders. Invoices go out instantly, follow-ups are scheduled by default, and outstanding items stay visible until resolved. Practices get paid faster with zero chasing.
                </p>
              </motion.div>

              {/* Card 3 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="bg-slate-50 rounded-2xl p-8 border border-slate-200"
              >
                <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mb-6">
                  <Globe className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  Works With Your Existing Tools
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Caberu adds automation — not complexity. Keep your current PMS, imaging system, and workflows. Caberu sits on top as the layer that ensures consistency, compliance, and end-to-end closure after every appointment.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

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
    </div>;
};
export default Index;