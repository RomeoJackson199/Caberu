import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  PhoneForwarded,
  MessageSquare,
  Calendar,
  ArrowRight,
  Clock,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { HowItWorksFeature } from "@/components/homepage/HowItWorksPopup";

// ── Feature Row (editorial layout, no cards) ────────────────────────────────

interface FeatureRowProps {
  icon: typeof PhoneForwarded;
  featureId: HowItWorksFeature;
  title: string;
  description: string;
  benefits: string[];
  index: number;
  onOpenHowItWorks?: (feature: HowItWorksFeature) => void;
}

const FeatureRow = ({
  icon: Icon,
  featureId,
  title,
  description,
  benefits,
  index,
  onOpenHowItWorks,
}: FeatureRowProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const isReversed = index % 2 === 1;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`grid md:grid-cols-2 gap-12 md:gap-20 items-center ${
        isReversed ? "md:direction-rtl" : ""
      }`}
    >
      {/* Text side */}
      <div className={isReversed ? "md:order-2 md:text-left" : ""} style={{ direction: "ltr" }}>
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/10 mb-6">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
        <h3
          className="text-2xl md:text-3xl font-bold text-slate-900 mb-4"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {title}
        </h3>
        <p className="text-slate-500 text-lg leading-relaxed mb-6">{description}</p>
        <ul className="space-y-2 mb-6">
          {benefits.map((b) => (
            <li key={b} className="flex items-center gap-2.5 text-slate-600 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              {b}
            </li>
          ))}
        </ul>
        <button
          onClick={() => onOpenHowItWorks?.(featureId)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          See how it works
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Visual side — atmospheric block instead of card */}
      <div
        className={`relative aspect-[4/3] rounded-2xl overflow-hidden ${
          isReversed ? "md:order-1" : ""
        }`}
        style={{ direction: "ltr" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={isInView ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Icon className="w-20 h-20 text-blue-600/20" strokeWidth={1} />
          </motion.div>
        </div>
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent" />
      </div>
    </motion.div>
  );
};

// ── Stats strip ─────────────────────────────────────────────────────────────

const StatsStrip = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const stats = [
    { icon: Clock, value: "2hrs", label: "Saved per day" },
    { icon: TrendingUp, value: "35%", label: "Fewer no-shows" },
    { icon: RefreshCw, value: "100%", label: "Calendar in sync" },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="flex flex-col md:flex-row justify-center gap-12 md:gap-20 py-16 border-t border-slate-200"
    >
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1 + i * 0.1 }}
          className="text-center"
        >
          <div className="text-3xl md:text-4xl font-bold text-slate-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {stat.value}
          </div>
          <div className="text-slate-500 text-sm mt-1">{stat.label}</div>
        </motion.div>
      ))}
    </motion.div>
  );
};

// ── Section ─────────────────────────────────────────────────────────────────

interface FeatureSectionProps {
  onOpenHowItWorks?: (feature: HowItWorksFeature) => void;
}

export function FeatureSection({ onOpenHowItWorks }: FeatureSectionProps) {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const features: {
    icon: typeof PhoneForwarded;
    featureId: HowItWorksFeature;
    title: string;
    description: string;
    benefits: string[];
  }[] = [
    {
      icon: PhoneForwarded,
      featureId: "phone",
      title: "AI Phone Forwarding",
      description:
        "Keep your existing phone number. When your team doesn't answer, Caberu's AI picks up — capturing symptoms, contact details, and reason for visit.",
      benefits: [
        "Keep your current phone number",
        "AI answers when you can't",
        "Patient symptoms captured automatically",
        "Summary delivered to your dashboard",
      ],
    },
    {
      icon: MessageSquare,
      featureId: "sms",
      title: "Automated SMS Reminders",
      description:
        "Reminders go out at 48h, 24h, and 2h before each appointment. Post-visit follow-ups are automatic too. No manual effort needed.",
      benefits: [
        "Automated reminders at 48h, 24h, 2h",
        "Post-visit follow-ups sent automatically",
        "Reduce no-shows by up to 35%",
        "Zero manual work",
      ],
    },
    {
      icon: Calendar,
      featureId: "calendar",
      title: "Google Calendar — 2-Way Sync",
      description:
        "Connect once. Appointments booked in Caberu appear in Google Calendar instantly, and changes made there sync straight back.",
      benefits: [
        "One-click Google Calendar connection",
        "Bookings sync to Google Calendar instantly",
        "Changes flow both ways",
        "Conflict detection prevents double-bookings",
      ],
    },
  ];

  return (
    <section ref={sectionRef} className="py-24 md:py-32 bg-white relative">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-20"
        >
          <p className="text-blue-600 font-medium text-sm tracking-wide uppercase mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            How it works
          </p>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            The intelligence layer
            <br />
            that sits on top
          </h2>
        </motion.div>

        <div className="space-y-24 md:space-y-32">
          {features.map((feature, index) => (
            <FeatureRow
              key={feature.title}
              {...feature}
              index={index}
              onOpenHowItWorks={onOpenHowItWorks}
            />
          ))}
        </div>

        <StatsStrip />
      </div>
    </section>
  );
}
