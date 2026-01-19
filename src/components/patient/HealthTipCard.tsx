import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Heart, Sparkles } from "lucide-react";

interface HealthTipCardProps {
  title?: string;
  tip?: string;
  variant?: 'dental' | 'general' | 'seasonal';
}

const DENTAL_TIPS = [
  "Remember to brush twice daily and floss at least once a day. Regular dental check-ups every 6 months help prevent serious dental issues.",
  "Use a soft-bristled toothbrush and replace it every 3-4 months for optimal cleaning.",
  "Drinking plenty of water throughout the day helps maintain oral hygiene and wash away food particles.",
  "Limit sugary snacks and acidic drinks to protect your tooth enamel.",
  "Consider using an antimicrobial mouthwash to help reduce plaque and prevent gingivitis.",
];

/**
 * Health tip card component for patient dashboard
 * Displays dental health tips with a gradient background
 */
export function HealthTipCard({ 
  title = "Dental Health Tip", 
  tip,
  variant = 'dental' 
}: HealthTipCardProps) {
  // Use provided tip or pick a random one
  const displayTip = tip || DENTAL_TIPS[Math.floor(Math.random() * DENTAL_TIPS.length)];

  const gradientStyles = {
    dental: "from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30",
    general: "from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30",
    seasonal: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30",
  };

  const iconColors = {
    dental: "text-blue-600",
    general: "text-green-600",
    seasonal: "text-amber-600",
  };

  return (
    <Card className={`bg-gradient-to-br ${gradientStyles[variant]} border-0`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Heart className={`h-5 w-5 ${iconColors[variant]}`} />
          <CardTitle className="text-lg">{title}</CardTitle>
          <Sparkles className={`h-4 w-4 ${iconColors[variant]} ml-auto`} />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {displayTip}
        </p>
      </CardContent>
    </Card>
  );
}

export default HealthTipCard;
