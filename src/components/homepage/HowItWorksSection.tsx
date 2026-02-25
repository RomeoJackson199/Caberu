import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  PhoneForwarded,
  FileText,
  CreditCard,
  MessageSquare,
  ChevronDown,
  Phone,
  User,
  Zap,
  CheckCircle2,
  ArrowRight,
  Clock,
  MessageCircle,
  DollarSign,
  Bell,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Phone Forwarding Visual ──────────────────────────────────────────────────

const PhoneForwardingDiagram = () => (
  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mt-4">
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">How it works</p>
    <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
      {[
        {
          icon: <User className="w-5 h-5 text-blue-600" />,
          bg: "bg-blue-50 border-blue-200",
          label: "Patient calls",
          sub: "your number",
        },
        null,
        {
          icon: <Phone className="w-5 h-5 text-slate-500" />,
          bg: "bg-slate-100 border-slate-200",
          label: "No answer",
          sub: "within 3 rings",
        },
        null,
        {
          icon: <Zap className="w-5 h-5 text-green-600" />,
          bg: "bg-green-50 border-green-200",
          label: "AI picks up",
          sub: "sounds natural",
        },
        null,
        {
          icon: <FileText className="w-5 h-5 text-purple-600" />,
          bg: "bg-purple-50 border-purple-200",
          label: "Summary sent",
          sub: "to dashboard",
        },
      ].map((step, i) =>
        step === null ? (
          <div key={i} className="flex items-center flex-shrink-0">
            <ArrowRight className="w-4 h-4 text-slate-300" />
          </div>
        ) : (
          <div key={i} className="flex flex-col items-center flex-shrink-0 min-w-[72px]">
            <div className={cn("w-12 h-12 rounded-xl border flex items-center justify-center mb-2", step.bg)}>
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
        You <strong>keep your existing phone number</strong>. Caberu acts as a silent backup — only answering when your team doesn't pick up in time.
      </p>
    </div>
  </div>
);

// ── Patient Symptom Summary Visual ──────────────────────────────────────────

const SummaryDiagram = () => (
  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mt-4 space-y-3">
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Example summary generated</p>
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
          <User className="w-4 h-4 text-purple-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Maria S. — Inbound Call</p>
          <p className="text-xs text-slate-400">Today at 10:32 AM · 4 min call</p>
        </div>
        <div className="ml-auto">
          <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">New patient</span>
        </div>
      </div>
      <div className="space-y-2">
        {[
          { label: "Reason for visit", value: "Tooth pain, lower left — 3 days" },
          { label: "Symptoms", value: "Sensitivity to cold, mild swelling" },
          { label: "Urgency", value: "Would like appointment this week" },
          { label: "Insurance", value: "AXA — confirmed active" },
        ].map((row) => (
          <div key={row.label} className="flex gap-2 text-xs">
            <span className="text-slate-400 w-28 flex-shrink-0">{row.label}</span>
            <span className="text-slate-700 font-medium">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 flex gap-2">
      <Info className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-purple-700">
        Every call produces a structured summary so your team is prepared <strong>before</strong> the appointment, not during.
      </p>
    </div>
  </div>
);

// ── Payment Flow Visual ──────────────────────────────────────────────────────

const PaymentDiagram = () => (
  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mt-4">
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
        No manual invoicing. No chasing payments. Caberu handles the entire flow from appointment completion to payment receipt.
      </p>
    </div>
  </div>
);

// ── SMS Reminders Visual ─────────────────────────────────────────────────────

const SmsDiagram = () => (
  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mt-4">
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">SMS sequence</p>
    <div className="space-y-2">
      {[
        { time: "48h before", msg: "Hi Maria! Just a reminder: your dental appointment is on Thursday at 2PM. Reply YES to confirm or CANCEL to reschedule.", sent: true },
        { time: "24h before", msg: "See you tomorrow at 2PM! Let us know if anything changes 😊", sent: true },
        { time: "2h before", msg: "Your appointment is in 2 hours. We look forward to seeing you!", sent: true },
      ].map((sms) => (
        <div key={sms.time} className="flex gap-3 items-start">
          <div className="flex-shrink-0 text-right w-16">
            <span className="text-xs text-slate-400">{sms.time}</span>
          </div>
          <div className="flex-1 bg-white border border-slate-100 rounded-2xl rounded-tl-none px-3 py-2 shadow-sm max-w-xs">
            <p className="text-xs text-slate-700 leading-relaxed">{sms.msg}</p>
          </div>
          {sms.sent && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-1" />}
        </div>
      ))}
    </div>
    <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex gap-2">
      <Bell className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-indigo-700">
        Practices using SMS reminders see up to <strong>35% fewer no-shows</strong>. Patients can confirm or reschedule by replying to the message.
      </p>
    </div>
  </div>
);

// ── Main component ───────────────────────────────────────────────────────────

interface Feature {
  id: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  accentColor: string;
  title: string;
  tagline: string;
  description: string;
  bullets: string[];
  diagram: React.ReactNode;
}

const features: Feature[] = [
  {
    id: "phone",
    icon: PhoneForwarded,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    accentColor: "border-blue-200 bg-blue-50/50",
    title: "Phone Forwarding",
    tagline: "Your number. AI backup.",
    description:
      "Caberu connects to your existing phone number as a forwarding layer. When a patient calls and your team doesn't answer within a few rings, the AI takes over — handling the call professionally, capturing the patient's symptoms and reason for visit, then sending a clean summary straight to your dashboard.",
    bullets: [
      "No need to change your phone number",
      "AI sounds natural, not robotic",
      "Captures symptoms, urgency, insurance",
      "Summary waiting for you before the appointment",
    ],
    diagram: <PhoneForwardingDiagram />,
  },
  {
    id: "summaries",
    icon: FileText,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    accentColor: "border-purple-200 bg-purple-50/50",
    title: "Patient Symptom Summaries",
    tagline: "Know before they arrive.",
    description:
      "After every call, Caberu generates a structured summary of what the patient said — symptoms, duration, urgency, and any relevant notes. Your team walks into each appointment already informed, saving time and improving the quality of care.",
    bullets: [
      "Symptoms and reason for visit captured",
      "Urgency level flagged automatically",
      "Insurance and contact info recorded",
      "Delivered to your dashboard instantly",
    ],
    diagram: <SummaryDiagram />,
  },
  {
    id: "payments",
    icon: CreditCard,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    accentColor: "border-green-200 bg-green-50/50",
    title: "Payments, Handled",
    tagline: "Get paid without the admin.",
    description:
      "When an appointment wraps up, Caberu sends the patient a secure payment link automatically. No manual invoicing, no follow-up calls for outstanding balances. Payments are processed through Stripe, receipts are issued, and your records update in real time.",
    bullets: [
      "Payment link sent after every appointment",
      "Stripe-powered, secure checkout",
      "Auto receipts and bookkeeping records",
      "Overdue balance tracking built in",
    ],
    diagram: <PaymentDiagram />,
  },
  {
    id: "sms",
    icon: MessageSquare,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    accentColor: "border-indigo-200 bg-indigo-50/50",
    title: "SMS Reminders & Communications",
    tagline: "Fewer no-shows. Better relationships.",
    description:
      "Caberu sends timed SMS reminders in the days and hours before each appointment. Patients can confirm or reschedule by replying. You can also send post-visit follow-up messages, instructions, or check-ins — all through SMS without any manual effort.",
    bullets: [
      "Automated reminders 48h, 24h, and 2h before",
      "Patients reply to confirm or reschedule",
      "Post-visit follow-ups and instructions",
      "Two-way patient communication via SMS",
    ],
    diagram: <SmsDiagram />,
  },
];

// Individual feature panel with learn more toggle
const FeaturePanel = ({ feature, index }: { feature: Feature; index: number }) => {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className={cn(
        "rounded-2xl border p-6 transition-all duration-300",
        expanded ? feature.accentColor : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md"
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", feature.iconBg)}>
          <Icon className={cn("w-6 h-6", feature.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-snug">{feature.title}</h3>
              <p className="text-sm text-slate-500 mt-0.5">{feature.tagline}</p>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-200",
                expanded
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900"
              )}
            >
              {expanded ? "Close" : "Learn more"}
              <motion.span
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="inline-flex"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </motion.span>
            </button>
          </div>

          <p className="text-slate-600 text-sm leading-relaxed mt-3">{feature.description}</p>

          <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {feature.bullets.map((bullet) => (
              <li key={bullet} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {feature.diagram}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export function HowItWorksSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section ref={sectionRef} className="py-24 bg-white relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, #0f172a 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 bg-slate-100 text-slate-600 rounded-full text-sm font-medium mb-4">
            Deep dive
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-5">
            See exactly how{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              each part works
            </span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Click <strong>Learn more</strong> on any feature below to see a visual walkthrough of how it fits into your practice.
          </p>
        </motion.div>

        <div className="space-y-4">
          {features.map((feature, i) => (
            <FeaturePanel key={feature.id} feature={feature} index={i} />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-14 text-center"
        >
          <p className="text-slate-500 text-sm mb-4">Everything above is included from day one. No add-ons, no hidden fees.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/signup"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              Get started
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/demo/dentist"
              className="inline-flex items-center gap-2 border border-slate-200 hover:border-slate-400 text-slate-700 font-medium px-6 py-3 rounded-xl transition-colors text-sm"
            >
              <MessageCircle className="w-4 h-4" />
              See live demo
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
