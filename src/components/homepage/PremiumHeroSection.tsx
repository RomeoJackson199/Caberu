import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Play } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { HowItWorksFeature } from "@/components/homepage/HowItWorksPopup";

interface PremiumHeroSectionProps {
  onOpenHowItWorks?: (feature?: HowItWorksFeature) => void;
}

export function PremiumHeroSection({ onOpenHowItWorks }: PremiumHeroSectionProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Full-bleed atmospheric background */}
      <div className="absolute inset-0 bg-[#0a0e1a]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,_rgba(37,99,235,0.25),_transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_80%,_rgba(14,165,233,0.12),_transparent_60%)]" />
      
      {/* Subtle grain texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-5 sm:px-8 text-center">
        {/* Brand name — hero-level signal */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1
            className="font-bold tracking-tight leading-none select-none"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <span
              className={`block bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent ${
                isMobile ? "text-[4.5rem]" : "text-[8rem] lg:text-[10rem]"
              }`}
            >
              Caberu
            </span>
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className={`text-blue-300/90 font-medium tracking-wide uppercase ${
            isMobile ? "text-xs mt-3" : "text-sm mt-4"
          }`}
          style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.2em" }}
        >
          The AI layer for healthcare practices
        </motion.p>

        {/* Supporting sentence */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={`text-slate-400 leading-relaxed max-w-xl mx-auto ${
            isMobile ? "text-base mt-5" : "text-lg mt-6"
          }`}
        >
          Keep your phone number. Keep your software. Caberu sits on top — handling calls,
          patient summaries, calendar sync, and SMS reminders automatically.
        </motion.p>

        {/* CTA group */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className={`flex gap-4 justify-center ${isMobile ? "flex-col mt-8 px-4" : "flex-row mt-10"}`}
        >
          <Button
            size="lg"
            onClick={() => onOpenHowItWorks?.("phone")}
            className={`group bg-blue-600 hover:bg-blue-500 text-white border-0 font-semibold transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.3)] ${
              isMobile ? "h-14 text-base rounded-2xl w-full" : "h-14 px-8 text-base rounded-xl"
            }`}
          >
            See how it works
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/demo/dentist")}
            className={`group border-white/15 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/25 transition-all ${
              isMobile ? "h-14 text-base rounded-2xl w-full" : "h-14 px-8 text-base rounded-xl"
            }`}
          >
            <Play className="w-4 h-4 mr-2" />
            Watch demo
          </Button>
        </motion.div>

        {/* Minimal trust line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className={`flex items-center justify-center gap-6 text-slate-500 ${
            isMobile ? "text-xs mt-8 gap-4" : "text-sm mt-12"
          }`}
        >
          <span>🇪🇺 GDPR Compliant</span>
          <span className="w-px h-3 bg-slate-700" />
          <span>🔒 EU Data Storage</span>
          <span className="w-px h-3 bg-slate-700" />
          <span>✓ End-to-End Encrypted</span>
        </motion.div>
      </div>

      {/* Bottom fade into next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50 to-transparent" />
    </section>
  );
}
