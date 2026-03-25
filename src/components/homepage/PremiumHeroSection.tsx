import { useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Play,
  CheckCircle2,
  Sparkles,
  PhoneForwarded,
  MessageSquare,
  Calendar,
  FileText
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { HowItWorksFeature } from "@/components/homepage/HowItWorksPopup";

// Floating orb component for visual interest
const FloatingOrb = ({
  delay,
  duration,
  size,
  color,
  top,
  left
}: {
  delay: number;
  duration: number;
  size: number;
  color: string;
  top: string;
  left: string;
}) => (
  <motion.div
    className="absolute rounded-full blur-3xl opacity-30"
    style={{
      width: size,
      height: size,
      background: color,
      top,
      left,
    }}
    animate={{
      y: [0, -30, 0],
      x: [0, 20, 0],
      scale: [1, 1.1, 1],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

// Animated feature card that floats in the hero
const FloatingFeatureCard = ({
  icon: Icon,
  label,
  delay,
  position
}: {
  icon: typeof PhoneForwarded;
  label: string;
  delay: number;
  position: { top?: string; bottom?: string; left?: string; right?: string };
}) => (
  <motion.div
    className="absolute hidden lg:flex items-center gap-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl px-4 py-2 shadow-2xl"
    style={position}
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.5 }}
  >
    <motion.div
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 3, repeat: Infinity, delay }}
    >
      <div className="w-8 h-8 rounded-lg bg-blue-500/30 flex items-center justify-center">
        <Icon className="w-4 h-4 text-blue-300" />
      </div>
    </motion.div>
    <span className="text-white/80 text-sm font-medium">{label}</span>
    <CheckCircle2 className="w-4 h-4 text-green-400" />
  </motion.div>
);

// Trust badges component
const TrustBadges = ({ isMobile }: { isMobile: boolean }) => {
  const badges = [
    { text: "GDPR Compliant", icon: "🇪🇺" },
    { text: "EU Data Storage", icon: "🔒" },
    { text: "End-to-End Encrypted", icon: "✓" },
  ];

  return (
    <motion.div
      className={`flex flex-wrap gap-3 ${isMobile ? 'justify-center mt-6' : 'mt-8'}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
    >
      {badges.map((badge, i) => (
        <motion.div
          key={badge.text}
          className={`flex items-center gap-1.5 text-slate-400 ${isMobile ? 'text-xs' : 'text-sm'}`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 + i * 0.1 }}
        >
          <span>{badge.icon}</span>
          <span>{badge.text}</span>
        </motion.div>
      ))}
    </motion.div>
  );
};

// How it layers visual
const LayerPill = ({ label, sub, color }: { label: string; sub: string; color: string }) => (
  <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${color}`}>
    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
    <div>
      <div className="text-xs font-semibold">{label}</div>
      <div className="text-xs opacity-70">{sub}</div>
    </div>
  </div>
);

interface PremiumHeroSectionProps {
  onOpenHowItWorks?: (feature?: HowItWorksFeature) => void;
}

export function PremiumHeroSection({ onOpenHowItWorks }: PremiumHeroSectionProps) {
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const isMobile = useIsMobile();

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMobile) return;
    const { clientX, clientY, currentTarget } = e;
    const { width, height, left, top } = currentTarget.getBoundingClientRect();
    mouseX.set((clientX - left - width / 2) / 50);
    mouseY.set((clientY - top - height / 2) / 50);
  };

  const floatingCards = [
    { icon: PhoneForwarded, label: "AI Answered Call", position: { top: '20%', right: '10%' } },
    { icon: FileText, label: "Symptom Summary Ready", position: { top: '38%', right: '5%' } },
    { icon: Calendar, label: "Calendar Synced", position: { bottom: '30%', right: '15%' } },
    { icon: MessageSquare, label: "SMS Reminder Sent", position: { bottom: '15%', right: '8%' } },
  ];

  // Mobile Hero Layout
  if (isMobile) {
    return (
      <section className="relative min-h-[100svh] flex flex-col justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-16 pb-24">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        </div>

        <FloatingOrb delay={0} duration={8} size={150} color="#3b82f6" top="5%" left="-10%" />
        <FloatingOrb delay={2} duration={10} size={100} color="#8b5cf6" top="70%" left="80%" />

        <div className="relative z-10 px-5 flex-1 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-6"
          >
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-3 py-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-blue-300 text-xs font-medium">Works on top of your existing tools</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-center"
          >
            <h1 className="text-3xl font-bold leading-[1.15] tracking-tight">
              <span className="text-white">Your AI layer —</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                without changing a thing.
              </span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base text-slate-300 leading-relaxed max-w-sm mx-auto text-center mt-4"
          >
            Keep your phone number. Keep your software.
            <span className="block text-slate-400 mt-1 text-sm">Caberu sits on top and handles calls, summaries, Google Calendar sync, and SMS reminders.</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 grid grid-cols-2 gap-2"
          >
            <LayerPill label="Phone Forwarding" sub="AI picks up for you" color="border-blue-500/30 text-blue-300 bg-blue-500/10" />
            <LayerPill label="Patient Summaries" sub="Symptoms captured" color="border-purple-500/30 text-purple-300 bg-purple-500/10" />
            <LayerPill label="Google Calendar" sub="2-way sync" color="border-green-500/30 text-green-300 bg-green-500/10" />
            <LayerPill label="SMS Reminders" sub="Reduce no-shows" color="border-cyan-500/30 text-cyan-300 bg-cyan-500/10" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col gap-3 mt-8"
          >
            <Button
              size="lg"
              onClick={() => onOpenHowItWorks?.("phone")}
              className="w-full h-14 text-base font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-500/30"
            >
              <span className="flex items-center gap-2">
                See how it works
                <ArrowRight className="w-5 h-5" />
              </span>
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/demo/dentist')}
              className="w-full h-14 text-base font-medium border-slate-600 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 rounded-2xl"
            >
              <Play className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </motion.div>

          <TrustBadges isMobile={true} />
        </div>

        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 8, 0] }}
          transition={{
            opacity: { delay: 1 },
            y: { duration: 1.5, repeat: Infinity }
          }}
        >
          <div className="w-6 h-10 border-2 border-slate-600 rounded-full flex justify-center pt-2">
            <motion.div
              className="w-1 h-1 bg-slate-400 rounded-full"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>
    );
  }

  // Desktop Hero Layout
  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
      onMouseMove={handleMouseMove}
    >
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-900/30 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
      </div>

      <FloatingOrb delay={0} duration={8} size={400} color="#3b82f6" top="10%" left="-5%" />
      <FloatingOrb delay={2} duration={10} size={300} color="#8b5cf6" top="60%" left="70%" />
      <FloatingOrb delay={4} duration={6} size={200} color="#06b6d4" top="30%" left="50%" />

      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {floatingCards.map((card, i) => (
        <FloatingFeatureCard
          key={card.label}
          icon={card.icon}
          label={card.label}
          delay={1 + i * 0.2}
          position={card.position}
        />
      ))}

      <div className="container mx-auto px-6 md:px-12 lg:px-16 xl:px-24 relative z-10 py-20 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-blue-300 text-sm font-medium">Works on top of your existing tools</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] tracking-tight">
                <span className="text-white">Your AI layer —</span>
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  without changing a thing.
                </span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl md:text-2xl text-slate-300 leading-relaxed max-w-xl"
            >
              Keep your phone number. Keep your software.
              <span className="block text-slate-400 mt-2 text-lg">
                Caberu sits on top — handling calls, patient summaries, Google Calendar sync, and SMS reminders automatically.
              </span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 pt-4"
            >
              <Button
                size="lg"
                onClick={() => onOpenHowItWorks?.("phone")}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                className="group relative bg-blue-600 hover:bg-blue-500 text-white border-0 h-14 px-8 text-lg font-semibold overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.4)]"
              >
                <span className="relative z-10 flex items-center gap-2">
                  See how it works
                  <motion.span
                    animate={{ x: isHovering ? 5 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </motion.span>
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600"
                  style={{ backgroundSize: '200% 100%' }}
                  animate={{ backgroundPosition: isHovering ? '100% 0' : '0% 0' }}
                  transition={{ duration: 0.5 }}
                />
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/demo/dentist')}
                className="group h-14 px-8 text-lg font-medium border-slate-600 bg-transparent text-slate-300 hover:text-white hover:border-slate-400 hover:bg-white/5 transition-all"
              >
                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Watch Demo
              </Button>
            </motion.div>

            <TrustBadges isMobile={false} />
          </div>

          {/* Right side - Layer visual */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="hidden lg:block"
          >
            <div className="relative">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-white mb-1">Caberu sits on top</h3>
                  <p className="text-slate-400 text-sm">No migration. No disruption. Just results.</p>
                </div>

                {/* Visual stack */}
                <div className="space-y-3">
                  {/* Caberu layer */}
                  <motion.div
                    className="relative rounded-xl bg-gradient-to-r from-blue-600/30 to-cyan-600/20 border border-blue-500/40 p-4"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="text-white text-sm font-semibold">Caberu AI Layer</div>
                        <div className="text-blue-300 text-xs">Calls · Summaries · Calendar · SMS</div>
                      </div>
                      <div className="ml-auto">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      </div>
                    </div>
                  </motion.div>

                  {/* Arrow */}
                  <div className="flex justify-center">
                    <div className="text-slate-500 text-xs flex flex-col items-center gap-1">
                      <div className="w-px h-4 bg-slate-600" />
                      <span>works with</span>
                      <div className="w-px h-4 bg-slate-600" />
                    </div>
                  </div>

                  {/* Existing tools */}
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">Your existing tools</p>
                    {[
                      { label: "Your phone number", icon: "📞" },
                      { label: "Your practice software", icon: "🖥️" },
                      { label: "Your Google Calendar", icon: "📅" },
                    ].map((tool) => (
                      <div key={tool.label} className="flex items-center gap-2 text-slate-300 text-sm">
                        <span>{tool.icon}</span>
                        <span>{tool.label}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 ml-auto" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 text-center">
                  <p className="text-slate-400 text-xs">No migration needed — setup in under a day</p>
                </div>
              </div>

              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-2xl" />
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 10, 0] }}
        transition={{
          opacity: { delay: 1 },
          y: { duration: 2, repeat: Infinity }
        }}
      >
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <span className="text-xs uppercase tracking-widest">Scroll to explore</span>
          <div className="w-6 h-10 border-2 border-slate-600 rounded-full flex justify-center pt-2">
            <motion.div
              className="w-1.5 h-1.5 bg-slate-400 rounded-full"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
