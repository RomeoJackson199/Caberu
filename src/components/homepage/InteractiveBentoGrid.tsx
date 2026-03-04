import {
    Zap,
    Clock,
    LayoutDashboard,
    Phone,
    Users,
    CreditCard,
    Bell,
    Calendar,
    MessageCircle,
    ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { HowItWorksFeature } from "@/components/homepage/HowItWorksPopup";

interface BentoCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    className?: string;
    gradient?: string;
    children?: React.ReactNode;
    delay?: number;
}

const BentoCard = ({ title, description, icon: Icon, className, gradient, children, delay = 0 }: BentoCardProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay }}
        whileHover={{ y: -5, transition: { duration: 0.2 } }}
        className={cn(
            "relative overflow-hidden rounded-3xl p-6 sm:p-8 group",
            "bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300",
            className
        )}
    >
        <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500", gradient)} />

        <div className="relative z-10 flex flex-col h-full">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 shadow-sm text-gray-900 group-hover:scale-110 transition-transform duration-300">
                <Icon className="h-6 w-6" />
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {title}
            </h3>

            <p className="text-gray-500 leading-relaxed mb-4">
                {description}
            </p>

            {children}
        </div>
    </motion.div>
);

interface InteractiveBentoGridProps {
    onOpenHowItWorks?: (feature: HowItWorksFeature) => void;
}

export const InteractiveBentoGrid = ({ onOpenHowItWorks }: InteractiveBentoGridProps) => {
    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50/50 overflow-hidden" id="features">
            <div className="max-w-7xl mx-auto">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.span
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="inline-block px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4"
                    >
                        All included features
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 tracking-tight"
                    >
                        Everything Caberu Adds <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                            On Top of Your Setup
                        </span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-lg text-gray-500"
                    >
                        Every feature below works alongside your existing tools — no switching, no migration.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* AI Phone Forwarding */}
                    <BentoCard
                        title="AI Phone Forwarding"
                        description="Keep your existing phone number. When you don't pick up, Caberu's AI answers naturally — capturing symptoms, booking appointments, and sending you a summary. Zero calls missed."
                        icon={Phone}
                        className="col-span-1 md:col-span-2 lg:col-span-2 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 border-blue-100"
                        gradient="bg-gradient-to-r from-blue-600 to-purple-600"
                        delay={0.1}
                    >
                        <div className="mt-4 flex gap-4 text-sm flex-wrap">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-gray-600 font-medium">Keep Your Number</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span className="text-gray-600 font-medium">AI Backup 24/7</span>
                            </div>
                        </div>
                        <button onClick={() => onOpenHowItWorks?.("phone")} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                            See how it works <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </BentoCard>

                    {/* Google Calendar 2-Way Sync */}
                    <BentoCard
                        title="Google Calendar Sync"
                        description="2-way sync with Google Calendar — appointments booked in Caberu appear instantly in Google Calendar, and changes there flow straight back."
                        icon={Calendar}
                        gradient="bg-blue-600"
                        delay={0.2}
                    >
                        <div className="mt-4 flex gap-3 text-sm flex-wrap">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-gray-600 font-medium">2-Way Sync</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-blue-600" />
                                <span className="text-gray-600 font-medium">Real-Time</span>
                            </div>
                        </div>
                        <div className="absolute right-4 bottom-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                            <Calendar className="w-24 h-24 text-blue-600" />
                        </div>
                    </BentoCard>

                    {/* Automated Reminders */}
                    <BentoCard
                        title="Automated Reminders"
                        description="Reduce no-shows by 30% with intelligent SMS and email appointment reminders. Automated follow-ups ensure patients never forget."
                        icon={Bell}
                        className="col-span-1 md:col-span-2 lg:col-span-2 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/50 border-indigo-100"
                        gradient="bg-gradient-to-r from-indigo-600 to-blue-600"
                        delay={0.3}
                    >
                        <div className="mt-4 flex gap-4 text-sm flex-wrap">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                <span className="text-gray-600 font-medium">30% Fewer No-Shows</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Bell className="w-4 h-4 text-indigo-600" />
                                <span className="text-gray-600 font-medium">Auto SMS & Email</span>
                            </div>
                        </div>
                        <button onClick={() => onOpenHowItWorks?.("sms")} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                            See how it works <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </BentoCard>

                    {/* SMS Communications */}
                    <BentoCard
                        title="SMS Reminders"
                        description="Automated outbound SMS reminders go out at 48h, 24h, and 2h before each appointment — plus post-visit follow-ups. No manual effort, fewer no-shows."
                        icon={MessageCircle}
                        className="bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/50 border-indigo-100"
                        gradient="bg-gradient-to-r from-indigo-600 to-blue-600"
                        delay={0.4}
                    >
                        <div className="mt-4 flex gap-4 text-sm flex-wrap">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-gray-600 font-medium">Fully Automated</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MessageCircle className="w-4 h-4 text-indigo-600" />
                                <span className="text-gray-600 font-medium">98% Open Rate</span>
                            </div>
                        </div>
                        <button onClick={() => onOpenHowItWorks?.("sms")} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                            See how it works <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </BentoCard>

                    {/* Patient Management */}
                    <BentoCard
                        title="Patient Records"
                        description="Complete digital health records, treatment history, prescriptions, insurance, and documents - all GDPR compliant."
                        icon={Users}
                        gradient="bg-purple-600"
                        delay={0.5}
                    />

                    {/* Billing & Payments */}
                    <BentoCard
                        title="Billing & Payments"
                        description="Integrated payment processing, invoice generation, insurance tracking, and automated payment reminders."
                        icon={CreditCard}
                        gradient="bg-emerald-600"
                        delay={0.6}
                    />

                    {/* Patient Portal */}
                    <BentoCard
                        title="Patient Portal"
                        description="Self-service portal for patients to book, view records, pay bills, and message providers."
                        icon={LayoutDashboard}
                        gradient="bg-blue-600"
                        delay={0.8}
                    />

                </div>

                <div className="mt-16 text-center">
                    <p className="text-xl text-gray-600 mb-4">
                        Plus: Inventory management • Staff scheduling • Automated reminders • Multi-location support • API access • And much more...
                    </p>
                </div>
            </div>
        </section>
    );
};
