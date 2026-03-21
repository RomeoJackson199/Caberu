import {
  Phone,
  Calendar,
  Bell,
  MessageCircle,
  Users,
  CreditCard,
  LayoutDashboard,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { HowItWorksFeature } from "@/components/homepage/HowItWorksPopup";

interface FeatureItemProps {
  title: string;
  description: string;
  icon: React.ElementType;
  delay?: number;
  featured?: boolean;
  featureId?: HowItWorksFeature;
  onOpenHowItWorks?: (feature: HowItWorksFeature) => void;
}

const FeatureItem = ({ title, description, icon: Icon, delay = 0, featured, featureId, onOpenHowItWorks }: FeatureItemProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className={`group ${featured ? "md:col-span-2" : ""}`}
  >
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
        <Icon className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
      </div>
      <div>
        <h3
          className="text-base font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {title}
        </h3>
        <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
        {featureId && onOpenHowItWorks && (
          <button
            onClick={() => onOpenHowItWorks(featureId)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            Learn more <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  </motion.div>
);

interface InteractiveBentoGridProps {
  onOpenHowItWorks?: (feature: HowItWorksFeature) => void;
}

export const InteractiveBentoGrid = ({ onOpenHowItWorks }: InteractiveBentoGridProps) => {
  return (
    <section className="py-24 md:py-32 px-5 sm:px-8 bg-slate-50" id="features">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p
            className="text-blue-600 font-medium text-sm tracking-wide uppercase mb-3"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            All features
          </p>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Everything Caberu adds
            <br />
            on top of your setup
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12">
          <FeatureItem
            title="AI Phone Forwarding"
            description="Keep your number. When you don't pick up, Caberu's AI answers — capturing symptoms, booking appointments, and sending you a summary."
            icon={Phone}
            featureId="phone"
            onOpenHowItWorks={onOpenHowItWorks}
            delay={0.05}
          />
          <FeatureItem
            title="Google Calendar Sync"
            description="2-way sync — appointments booked in Caberu appear instantly in Google Calendar, and changes there flow straight back."
            icon={Calendar}
            delay={0.1}
          />
          <FeatureItem
            title="Automated Reminders"
            description="SMS and email reminders at 48h, 24h, and 2h before appointments. Reduce no-shows by up to 35%."
            icon={Bell}
            featureId="sms"
            onOpenHowItWorks={onOpenHowItWorks}
            delay={0.15}
          />
          <FeatureItem
            title="SMS Communications"
            description="Outbound SMS reminders and post-visit follow-ups. 98% open rate, fully automated."
            icon={MessageCircle}
            featureId="sms"
            onOpenHowItWorks={onOpenHowItWorks}
            delay={0.2}
          />
          <FeatureItem
            title="Patient Records"
            description="Complete digital health records, treatment history, prescriptions, and documents — all GDPR compliant."
            icon={Users}
            delay={0.25}
          />
          <FeatureItem
            title="Billing & Payments"
            description="Integrated payment processing, invoice generation, insurance tracking, and automated payment reminders."
            icon={CreditCard}
            delay={0.3}
          />
          <FeatureItem
            title="Patient Portal"
            description="Self-service portal for patients to book, view records, pay bills, and message providers."
            icon={LayoutDashboard}
            delay={0.35}
          />
        </div>
      </div>
    </section>
  );
};
