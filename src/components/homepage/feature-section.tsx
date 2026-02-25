import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  PhoneForwarded,
  MessageSquare,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: typeof PhoneForwarded;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  benefits: string[];
  delay: number;
  isActive: boolean;
  onHover: () => void;
}

const FeatureCard = ({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  benefits,
  delay,
  isActive,
  onHover,
}: FeatureCardProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      onMouseEnter={onHover}
      className={cn(
        "relative group cursor-pointer",
        "bg-white rounded-2xl p-8 border transition-all duration-500",
        isActive
          ? "border-blue-200 shadow-xl shadow-blue-100/50 scale-[1.02]"
          : "border-slate-200 hover:border-slate-300 hover:shadow-lg"
      )}
    >
      <div className={cn(
        "absolute inset-0 rounded-2xl transition-opacity duration-500",
        "bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/30",
        isActive ? "opacity-100" : "opacity-0"
      )} />

      <div className="relative z-10">
        <motion.div
          className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300",
            iconBg
          )}
          whileHover={{ scale: 1.1, rotate: 5 }}
        >
          <Icon className={cn("w-8 h-8", iconColor)} />
        </motion.div>

        <h3 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>

        <p className="text-slate-600 leading-relaxed mb-6">
          {description}
        </p>

        <ul className="space-y-3">
          {benefits.map((benefit, i) => (
            <motion.li
              key={benefit}
              initial={{ opacity: 0, x: -10 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: delay + 0.2 + i * 0.1 }}
              className="flex items-center gap-2 text-sm text-slate-600"
            >
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              {benefit}
            </motion.li>
          ))}
        </ul>

        <motion.div
          className="mt-6 flex items-center gap-2 text-blue-600 font-medium text-sm"
          initial={{ opacity: 0 }}
          animate={isActive ? { opacity: 1 } : { opacity: 0 }}
        >
          Learn more
          <ArrowRight className="w-4 h-4" />
        </motion.div>
      </div>
    </motion.div>
  );
};

// Stats bar component
const StatsBar = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const stats = [
    { icon: Clock, value: "2hrs", label: "Saved per day" },
    { icon: TrendingUp, value: "35%", label: "Fewer no-shows" },
    { icon: Users, value: "45%", label: "Faster payments" },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 mt-16"
    >
      <div className="grid md:grid-cols-3 gap-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <stat.icon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-slate-400 text-sm">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export function FeatureSection() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const features = [
    {
      icon: PhoneForwarded,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      title: "Phone Forwarding — Your Number, AI Backup",
      description: "Keep your existing phone number. When a call comes in and your team doesn't answer, Caberu's AI picks up naturally — capturing the patient's reason for visit, symptoms, and contact details, then sending you a structured summary.",
      benefits: [
        "Keep your current phone number",
        "AI answers if you don't pick up",
        "Patient symptoms captured automatically",
        "Summary delivered to your dashboard",
      ],
    },
    {
      icon: MessageSquare,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      title: "SMS Reminders — Fewer No-Shows",
      description: "Automated SMS reminders go out at the right time before each appointment. Patients confirm with a simple reply, and your schedule stays full. Two-way messaging keeps everyone informed.",
      benefits: [
        "Automated appointment reminders via SMS",
        "Patients confirm with a single reply",
        "Reduce no-shows by up to 35%",
        "Two-way patient communication",
      ],
    },
    {
      icon: CreditCard,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      title: "Payments Handled Automatically",
      description: "After every appointment, a payment link goes out to the patient. No chasing, no invoicing delays. Stripe-powered payments, automatic receipts, and outstanding balance tracking — all without manual work.",
      benefits: [
        "Payment link sent after every visit",
        "Stripe-powered secure processing",
        "Automatic receipts and records",
        "Outstanding balance visibility",
      ],
    },
  ];

  return (
    <section ref={sectionRef} className="py-24 bg-slate-50 relative overflow-hidden">
      <div className="absolute inset-0 opacity-50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-100 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center max-w-4xl mx-auto mb-16"
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            className="inline-block px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4"
          >
            How Caberu Works
          </motion.span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            The Intelligence Layer That{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Sits on Top
            </span>
          </h2>
          <p className="text-xl text-slate-600">
            No switching tools, no disruption. Caberu plugs in as the layer that catches missed calls, sends reminders, and collects payments — automatically.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              {...feature}
              delay={0.1 * index}
              isActive={activeIndex === index}
              onHover={() => setActiveIndex(index)}
            />
          ))}
        </div>

        <StatsBar />
      </div>
    </section>
  );
}
