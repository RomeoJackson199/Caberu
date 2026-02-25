import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  PhoneForwarded,
  MessageSquare,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  User,
  Phone,
  Zap,
  FileText,
  DollarSign,
  Bell,
  Info,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Phone Forwarding Diagram ─────────────────────────────────────────────────

const PhoneDiagram = () => (
  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">How it works</p>
    <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
      {[
        { icon: <User className="w-4 h-4 text-blue-600" />, bg: "bg-blue-50 border-blue-200", label: "Patient calls", sub: "your number" },
        null,
        { icon: <Phone className="w-4 h-4 text-slate-500" />, bg: "bg-slate-100 border-slate-200", label: "No answer", sub: "within 3 rings" },
        null,
        { icon: <Zap className="w-4 h-4 text-green-600" />, bg: "bg-green-50 border-green-200", label: "AI picks up", sub: "sounds natural" },
        null,
        { icon: <FileText className="w-4 h-4 text-purple-600" />, bg: "bg-purple-50 border-purple-200", label: "Summary sent", sub: "to dashboard" },
      ].map((step, i) =>
        step === null ? (
          <div key={i} className="flex items-center flex-shrink-0">
            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
          </div>
        ) : (
          <div key={i} className="flex flex-col items-center flex-shrink-0 min-w-[64px]">
            <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center mb-1.5", step.bg)}>
              {step.icon}
            </div>
            <p className="text-xs font-semibold text-slate-700 text-center leading-tight">{step.label}</p>
            <p className="text-xs text-slate-400 text-center leading-tight">{step.sub}</p>
          </div>
        )
      )}
    </div>
    <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2">
      <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-blue-700">
        You <strong>keep your existing phone number</strong>. Caberu only picks up when your team doesn't answer in time.
      </p>
    </div>
  </div>
);

// ── SMS Diagram ──────────────────────────────────────────────────────────────

const SmsDiagram = () => (
  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">SMS sequence</p>
    <div className="space-y-2">
      {[
        { time: "48h before", msg: "Hi Maria! Just a reminder: your dental appointment is on Thursday at 2PM. See you then!" },
        { time: "24h before", msg: "See you tomorrow at 2PM! We look forward to your visit 😊" },
        { time: "2h before",  msg: "Your appointment is in 2 hours. We look forward to seeing you!" },
      ].map((sms) => (
        <div key={sms.time} className="flex gap-3 items-start">
          <div className="flex-shrink-0 w-14 text-right">
            <span className="text-xs text-slate-400">{sms.time}</span>
          </div>
          <div className="flex-1 bg-white border border-slate-100 rounded-2xl rounded-tl-none px-3 py-2 shadow-sm">
            <p className="text-xs text-slate-700 leading-relaxed">{sms.msg}</p>
          </div>
          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-1" />
        </div>
      ))}
    </div>
    <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex gap-2">
      <Bell className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-indigo-700">
        Practices using SMS reminders see up to <strong>35% fewer no-shows</strong>. All messages go out automatically.
      </p>
    </div>
  </div>
);

// ── Payment Diagram ──────────────────────────────────────────────────────────

const PaymentDiagram = () => (
  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Payment flow</p>
    <div className="space-y-2">
      {[
        { step: "1", icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, label: "Appointment completes", sub: "No action needed from staff" },
        { step: "2", icon: <DollarSign className="w-4 h-4 text-blue-500" />, label: "Payment link sent to patient", sub: "Via SMS within minutes" },
        { step: "3", icon: <CreditCard className="w-4 h-4 text-indigo-500" />, label: "Patient pays securely", sub: "Stripe-powered checkout" },
        { step: "4", icon: <FileText className="w-4 h-4 text-purple-500" />, label: "Receipt + record updated", sub: "Automatically" },
      ].map((row) => (
        <div key={row.step} className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl p-3">
          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-slate-500">{row.step}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">{row.label}</p>
            <p className="text-xs text-slate-400">{row.sub}</p>
          </div>
          {row.icon}
        </div>
      ))}
    </div>
    <div className="mt-4 bg-green-50 border border-green-100 rounded-xl p-3 flex gap-2">
      <Info className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-green-700">
        No manual invoicing. No chasing payments. Caberu handles the entire flow automatically.
      </p>
    </div>
  </div>
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeatureData {
  icon: typeof PhoneForwarded;
  iconBg: string;
  iconColor: string;
  accentColor: string;
  title: string;
  description: string;
  benefits: string[];
  diagram: React.ReactNode;
}

// ── Compact grid card ─────────────────────────────────────────────────────────

const FeatureCard = ({
  feature,
  delay,
  isActive,
  onHover,
  onExpand,
}: {
  feature: FeatureData;
  delay: number;
  isActive: boolean;
  onHover: () => void;
  onExpand: () => void;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      onMouseEnter={onHover}
      className={cn(
        "relative group bg-white rounded-2xl p-8 border transition-all duration-500",
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
          className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300", feature.iconBg)}
          whileHover={{ scale: 1.1, rotate: 5 }}
        >
          <Icon className={cn("w-8 h-8", feature.iconColor)} />
        </motion.div>

        <h3 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-blue-600 transition-colors">
          {feature.title}
        </h3>

        <p className="text-slate-600 leading-relaxed mb-6">{feature.description}</p>

        <ul className="space-y-3 mb-6">
          {feature.benefits.map((benefit, i) => (
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

        <button
          onClick={onExpand}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full border bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600 transition-all duration-200"
        >
          See how it works
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};

// ── Expanded full-width view ──────────────────────────────────────────────────

const ExpandedFeatureView = ({
  feature,
  otherFeatures,
  onClose,
  onSwitch,
}: {
  feature: FeatureData;
  otherFeatures: { feature: FeatureData; originalIndex: number }[];
  onClose: () => void;
  onSwitch: (index: number) => void;
}) => {
  const Icon = feature.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Main expanded card */}
      <div className={cn("rounded-2xl border shadow-xl overflow-hidden", feature.accentColor)}>
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          {/* Left: content */}
          <div>
            <div className="flex items-center gap-4 mb-5">
              <motion.div
                className={cn("w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0", feature.iconBg)}
                initial={{ scale: 0.85 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.25 }}
              >
                <Icon className={cn("w-7 h-7", feature.iconColor)} />
              </motion.div>
              <h3 className="text-2xl font-bold text-slate-900">{feature.title}</h3>
            </div>

            <p className="text-slate-600 leading-relaxed mb-6">{feature.description}</p>

            <ul className="space-y-2.5 mb-8">
              {feature.benefits.map((benefit, i) => (
                <motion.li
                  key={benefit}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.07 }}
                  className="flex items-center gap-2 text-sm text-slate-700"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {benefit}
                </motion.li>
              ))}
            </ul>

            <button
              onClick={onClose}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full bg-slate-900 text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Close
            </button>
          </div>

          {/* Right: diagram slides in from the right */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.12, ease: "easeOut" }}
          >
            {feature.diagram}
          </motion.div>
        </div>
      </div>

      {/* Mini cards for other features */}
      {otherFeatures.length > 0 && (
        <div className={cn(
          "grid gap-4 mt-4",
          otherFeatures.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
        )}>
          {otherFeatures.map(({ feature: f, originalIndex }, i) => {
            const OtherIcon = f.icon;
            return (
              <motion.button
                key={f.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSwitch(originalIndex)}
                className="text-left bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md rounded-2xl p-4 transition-all duration-200 flex items-center gap-3 group"
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", f.iconBg)}>
                  <OtherIcon className={cn("w-5 h-5", f.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">{f.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">See how it works →</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors flex-shrink-0" />
              </motion.button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

// ── Stats bar ─────────────────────────────────────────────────────────────────

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

// ── Section ───────────────────────────────────────────────────────────────────

export function FeatureSection() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const features: FeatureData[] = [
    {
      icon: PhoneForwarded,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      accentColor: "border-blue-200 bg-blue-50/50",
      title: "Phone Forwarding — Your Number, AI Backup",
      description: "Keep your existing phone number. When a call comes in and your team doesn't answer, Caberu's AI picks up naturally — capturing the patient's reason for visit, symptoms, and contact details, then sending you a structured summary.",
      benefits: [
        "Keep your current phone number",
        "AI answers if you don't pick up",
        "Patient symptoms captured automatically",
        "Summary delivered to your dashboard",
      ],
      diagram: <PhoneDiagram />,
    },
    {
      icon: MessageSquare,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      accentColor: "border-indigo-200 bg-indigo-50/50",
      title: "SMS Reminders — Fewer No-Shows",
      description: "Automated SMS reminders go out at 48h, 24h, and 2h before each appointment — no manual effort needed. Post-visit follow-up messages and instructions go out automatically too.",
      benefits: [
        "Automated reminders at 48h, 24h, and 2h before",
        "Post-visit follow-ups sent automatically",
        "Reduce no-shows by up to 35%",
        "Outbound SMS, zero manual work",
      ],
      diagram: <SmsDiagram />,
    },
    {
      icon: CreditCard,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      accentColor: "border-green-200 bg-green-50/50",
      title: "Payments Handled Automatically",
      description: "After every appointment, a payment link goes out to the patient. No chasing, no invoicing delays. Stripe-powered payments, automatic receipts, and outstanding balance tracking — all without manual work.",
      benefits: [
        "Payment link sent after every visit",
        "Stripe-powered secure processing",
        "Automatic receipts and records",
        "Outstanding balance visibility",
      ],
      diagram: <PaymentDiagram />,
    },
  ];

  const activeFeature = activeIndex !== null ? features[activeIndex] : null;
  const otherFeatures = activeIndex !== null
    ? features.map((f, i) => ({ feature: f, originalIndex: i })).filter(({ originalIndex: i }) => i !== activeIndex)
    : [];

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

        <AnimatePresence mode="wait">
          {activeFeature === null ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start"
            >
              {features.map((feature, index) => (
                <FeatureCard
                  key={feature.title}
                  feature={feature}
                  delay={0.1 * index}
                  isActive={hoverIndex === index}
                  onHover={() => setHoverIndex(index)}
                  onExpand={() => setActiveIndex(index)}
                />
              ))}
            </motion.div>
          ) : (
            <ExpandedFeatureView
              key="expanded"
              feature={activeFeature}
              otherFeatures={otherFeatures}
              onClose={() => setActiveIndex(null)}
              onSwitch={(index) => setActiveIndex(index)}
            />
          )}
        </AnimatePresence>

        <StatsBar />
      </div>
    </section>
  );
}
