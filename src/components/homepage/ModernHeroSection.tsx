import { AppButton } from "@/components/ui/AppButton";
import { Calendar, Shield, Users, Brain, Star } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useNavigate } from "react-router-dom";
type HeroVariant = "default" | "ctaFocused";
interface ModernHeroSectionProps {
  onBookAppointment: () => void;
  onStartTriage: () => void;
  onOpenAIChat?: () => void;
  variant?: HeroVariant;
}
export function ModernHeroSection({
  onBookAppointment,
  onStartTriage,
  onOpenAIChat,
  variant = "default"
}: ModernHeroSectionProps) {
  const {
    t,
    language
  } = useLanguage();
  const navigate = useNavigate();
  const isCtaFocused = variant === "ctaFocused";
  return <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />

      <div className="container mx-auto px-8 md:px-16 xl:px-24 relative z-10 py-16 max-w-5xl">
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white mb-4">
              Every dental appointment should end cleanly.
            </h1>
            <p className="text-3xl md:text-4xl lg:text-5xl font-semibold text-blue-400">
              Caberu makes sure it does.
            </p>
          </div>

          <p className="text-xl md:text-2xl text-slate-300 leading-relaxed max-w-2xl">
            Notes done. Payments sent. Follow-ups scheduled.
            <br />
            <span className="text-slate-400">Automatically — after each appointment.</span>
          </p>

          <div className="pt-4">
            <AppButton 
              variant="gradient" 
              size="lg" 
              onClick={onOpenAIChat} 
              className="bg-blue-600 hover:bg-blue-500 text-white hover:scale-105 transition-all shadow-2xl border-0 h-14 px-8 text-lg font-semibold"
            >
              See how it works
            </AppButton>
          </div>
        </div>
      </div>
    </section>;
}