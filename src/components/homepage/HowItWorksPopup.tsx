import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  PhoneForwarded,
  FileText,
  CreditCard,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  User,
  Phone,
  Zap,
  DollarSign,
  Bell,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export type HowItWorksFeature = "phone" | "summaries" | "payments" | "sms";

interface HowItWorksPopupProps {
  open: boolean;
  onClose: () => void;
  defaultFeature?: HowItWorksFeature;
}

const TABS: { id: HowItWorksFeature; label: string; icon: React.ElementType }[] = [
  { id: "phone", label: "Phone", icon: PhoneForwarded },
  { id: "summaries", label: "Summaries", icon: FileText },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "sms", label: "SMS", icon: MessageSquare },
];

// ── Diagrams ─────────────────────────────────────────────────────────────────

const PhoneFlow = () => (
  <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-5">
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
      What happens on each call
    </p>
    <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
      {[
        {
          icon: <User className="w-4 h-4 text-blue-600" />,
          bg: "bg-blue-50 border-blue-200",
          label: "Patient calls",
          sub: "your number",
        },
        null,
        {
          icon: <Phone className="w-4 h-4 text-slate-500" />,
          bg: "bg-slate-100 border-slate-200",
          label: "No answer",
          sub: "within 3 rings",
        },
        null,
        {
          icon: <Zap className="w-4 h-4 text-green-600" />,
          bg: "bg-green-50 border-green-200",
          label: "AI picks up",
          sub: "sounds natural",
        },
        null,
        {
          icon: <FileText className="w-4 h-4 text-purple-600" />,
          bg: "bg-purple-50 border-purple-200",
          label: "Summary sent",
          sub: "to dashboard",
        },
      ].map((step, i) =>
        step === null ? (
          <div key={i} className="flex items-center flex-shrink-0">
            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
          </div>
        ) : (
          <div
            key={i}
            className="flex flex-col items-center flex-shrink-0 min-w-[68px]"
          >
            <div
              className={cn(
                "w-11 h-11 rounded-xl border flex items-center justify-center mb-2",
                step.bg
              )}
            >
              {step.icon}
            </div>
            <p className="text-xs font-semibold text-slate-700 text-center leading-tight">
              {step.label}
            </p>
            <p className="text-xs text-slate-400 text-center leading-tight mt-0.5">
              {step.sub}
            </p>
          </div>
        )
      )}
    </div>
    <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2">
      <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-blue-700 leading-relaxed">
        You <strong>keep your existing phone number</strong>. Caberu only picks
        up when your team doesn't answer in time. Patients don't need to call a
        different number.
      </p>
    </div>
  </div>
);

const SummaryCard = () => (
  <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
      Example summary generated after a call
    </p>
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">
            Maria S. — Inbound Call
          </p>
          <p className="text-xs text-slate-400">Today at 10:32 AM · 4 min call</p>
        </div>
        <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full flex-shrink-0">
          New patient
        </span>
      </div>
      <div className="space-y-2 border-t border-slate-100 pt-3">
        {[
          { label: "Reason for visit", value: "Tooth pain, lower left — 3 days" },
          { label: "Symptoms", value: "Sensitivity to cold, mild swelling" },
          { label: "Urgency", value: "Wants appointment this week" },
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
      <p className="text-xs text-purple-700 leading-relaxed">
        Every call produces a structured summary so your team is prepared{" "}
        <strong>before</strong> the appointment — not scrambling during it.
      </p>
    </div>
  </div>
);

const PaymentFlow = () => (
  <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-5">
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
      Automated payment flow
    </p>
    <div className="space-y-2">
      {[
        {
          step: "1",
          icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
          label: "Appointment completes",
          sub: "No action needed from staff",
        },
        {
          step: "2",
          icon: <DollarSign className="w-4 h-4 text-blue-500" />,
          label: "Payment link sent to patient",
          sub: "Via SMS within minutes",
        },
        {
          step: "3",
          icon: <CreditCard className="w-4 h-4 text-indigo-500" />,
          label: "Patient pays securely",
          sub: "Stripe-powered checkout",
        },
        {
          step: "4",
          icon: <FileText className="w-4 h-4 text-purple-500" />,
          label: "Receipt + records updated",
          sub: "Automatically — no manual entry",
        },
      ].map((row) => (
        <div
          key={row.step}
          className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl p-3"
        >
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
      <p className="text-xs text-green-700 leading-relaxed">
        No manual invoicing. No chasing overdue payments. Caberu handles the{" "}
        <strong>entire payment cycle</strong> — from appointment completion to
        receipt.
      </p>
    </div>
  </div>
);

const SmsSequence = () => (
  <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-5">
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
      Automated SMS sequence (sent for every appointment)
    </p>
    <div className="space-y-3">
      {[
        {
          time: "48h before",
          msg: "Hi Maria! Just a reminder: your dental appointment is on Thursday at 2PM with Dr. Smith. See you then! — Caberu Dental",
          status: "Delivered",
        },
        {
          time: "24h before",
          msg: "See you tomorrow at 2PM! We look forward to your visit. If you need to reschedule, just reply CANCEL. 😊",
          status: "Delivered",
        },
        {
          time: "2h before",
          msg: "Your appointment is in 2 hours at 2PM. We're looking forward to seeing you!",
          status: "Delivered",
        },
        {
          time: "After visit",
          msg: "Thanks for visiting us, Maria! Your invoice is ready — pay securely at the link below. Questions? Just reply here.",
          status: "Sent",
        },
      ].map((sms) => (
        <div key={sms.time} className="flex gap-3 items-start">
          <div className="flex-shrink-0 w-16 text-right pt-2">
            <span className="text-xs text-slate-400 leading-tight">{sms.time}</span>
          </div>
          <div className="flex-1">
            <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-3 py-2 shadow-sm">
              <p className="text-xs text-slate-700 leading-relaxed">{sms.msg}</p>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3 text-green-400" />
              <span className="text-xs text-slate-400">{sms.status}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
    <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex gap-2">
      <Bell className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-indigo-700 leading-relaxed">
        Practices using Caberu SMS reminders see up to{" "}
        <strong>35% fewer no-shows</strong>. All messages go out automatically
        — zero manual effort required from your team.
      </p>
    </div>
  </div>
);

// ── Feature content data ─────────────────────────────────────────────────────

const FEATURE_CONTENT: Record<
  HowItWorksFeature,
  {
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
> = {
  phone: {
    icon: PhoneForwarded,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    accentColor: "text-blue-600",
    title: "AI Phone Forwarding",
    tagline: "Your number. AI backup. Zero missed calls.",
    description:
      "Caberu connects to your existing phone number as a silent AI layer. When a patient calls and your team doesn't pick up within a few rings, the AI answers naturally — handling the full conversation, gathering symptoms and contact details, then sending you a structured summary to your dashboard.",
    bullets: [
      "Keep your current phone number, no changes needed",
      "AI sounds natural and professional, not robotic",
      "Captures symptoms, urgency level, and insurance info",
      "Summary delivered to your dashboard before the appointment",
    ],
    diagram: <PhoneFlow />,
  },
  summaries: {
    icon: FileText,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    accentColor: "text-purple-600",
    title: "Patient Symptom Summaries",
    tagline: "Know exactly what to expect before they walk in.",
    description:
      "After every call handled by Caberu's AI, a clean structured summary is generated and delivered to your dashboard instantly. Your team walks into every appointment already knowing the patient's symptoms, urgency, and reason for visit — so you can focus on care, not catch-up.",
    bullets: [
      "Symptoms and reason for visit captured from every call",
      "Urgency level flagged so you can prioritise bookings",
      "Insurance and contact info recorded automatically",
      "Delivered to your dashboard within seconds of the call ending",
    ],
    diagram: <SummaryCard />,
  },
  payments: {
    icon: CreditCard,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    accentColor: "text-green-600",
    title: "Payments, Handled",
    tagline: "Get paid faster. Without the admin.",
    description:
      "When an appointment wraps up, Caberu automatically sends the patient a secure Stripe-powered payment link via SMS. No manual invoicing, no chasing outstanding balances. Receipts are issued and records are updated automatically — your team focuses on patients, not paperwork.",
    bullets: [
      "Payment link sent automatically after every appointment",
      "Stripe-powered, fully secure checkout for patients",
      "Receipts and records updated without manual entry",
      "Outstanding balance tracking built in from day one",
    ],
    diagram: <PaymentFlow />,
  },
  sms: {
    icon: MessageSquare,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    accentColor: "text-indigo-600",
    title: "SMS Reminders & Communications",
    tagline: "Fewer no-shows. Zero manual work.",
    description:
      "Caberu sends a timed sequence of outbound SMS reminders in the days and hours before each appointment — all automatically. Post-visit follow-up messages, care instructions, and payment links also go out without any action from your team.",
    bullets: [
      "Automated reminders at 48 hours, 24 hours, and 2 hours before",
      "Post-visit follow-ups and instructions sent automatically",
      "Reduce no-shows by up to 35% — proven across practices",
      "Fully outbound via Twilio — zero manual effort required",
    ],
    diagram: <SmsSequence />,
  },
};

// ── Feature content panel ─────────────────────────────────────────────────────

const FeatureContent = ({ feature }: { feature: HowItWorksFeature }) => {
  const data = FEATURE_CONTENT[feature];
  const Icon = data.icon;

  return (
    <div>
      <div className="flex items-start gap-4 mb-4">
        <div
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0",
            data.iconBg
          )}
        >
          <Icon className={cn("w-6 h-6", data.iconColor)} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">{data.title}</h3>
          <p className={cn("text-sm font-medium mt-0.5", data.accentColor)}>
            {data.tagline}
          </p>
        </div>
      </div>

      <p className="text-slate-600 leading-relaxed text-sm">{data.description}</p>

      <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {data.bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      {data.diagram}
    </div>
  );
};

// ── Animation variants ────────────────────────────────────────────────────────

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const modalVariants = {
  hidden: { opacity: 0, y: 48, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 320, damping: 28, mass: 0.8 },
  },
  exit: {
    opacity: 0,
    y: 24,
    scale: 0.97,
    transition: { duration: 0.18, ease: "easeIn" as const },
  },
};

const contentVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 32 : -32,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.22, ease: "easeOut" as const },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -32 : 32,
    opacity: 0,
    transition: { duration: 0.15, ease: "easeIn" as const },
  }),
};

// ── Main popup component ──────────────────────────────────────────────────────

export function HowItWorksPopup({
  open,
  onClose,
  defaultFeature = "phone",
}: HowItWorksPopupProps) {
  const [activeTab, setActiveTab] = useState<HowItWorksFeature>(defaultFeature);
  const [direction, setDirection] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) setActiveTab(defaultFeature);
  }, [open, defaultFeature]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleTabChange = (newTab: HowItWorksFeature) => {
    const currentIndex = TABS.findIndex((t) => t.id === activeTab);
    const newIndex = TABS.findIndex((t) => t.id === newTab);
    setDirection(newIndex > currentIndex ? 1 : -1);
    setActiveTab(newTab);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal wrapper */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="How Caberu Works"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 sm:px-8 pt-7 pb-6 flex-shrink-0">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-white" />
                </button>

                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 text-xs font-medium uppercase tracking-wider">
                    Works on top of your existing setup
                  </span>
                </div>

                <h2 className="text-2xl font-bold text-white mb-1">
                  How Caberu Works
                </h2>
                <p className="text-slate-400 text-sm">
                  Select a feature to see exactly what happens behind the scenes.
                </p>

                {/* Tab pills */}
                <div className="flex gap-2 mt-5 flex-wrap">
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <motion.button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        whileTap={{ scale: 0.96 }}
                        className={cn(
                          "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border",
                          isActive
                            ? "bg-white text-slate-900 border-white shadow-md"
                            : "bg-white/10 text-white/70 border-white/10 hover:bg-white/20 hover:text-white"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={activeTab}
                    custom={direction}
                    variants={contentVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="px-6 sm:px-8 py-6"
                  >
                    <FeatureContent feature={activeTab} />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer CTA */}
              <div className="px-6 sm:px-8 py-5 border-t border-slate-100 bg-slate-50 flex-shrink-0 flex gap-3">
                <button
                  onClick={() => {
                    navigate("/signup");
                    onClose();
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    navigate("/demo/dentist");
                    onClose();
                  }}
                  className="flex-1 border border-slate-200 hover:border-slate-400 text-slate-700 font-medium py-3 rounded-xl text-sm transition-colors"
                >
                  See Live Demo
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
