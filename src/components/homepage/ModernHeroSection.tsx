import { HeroSection } from "./HeroSection";

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
  return (
    <HeroSection
      onBookAppointment={onBookAppointment}
      onStartTriage={onStartTriage}
    />
  );
}

export default ModernHeroSection;
