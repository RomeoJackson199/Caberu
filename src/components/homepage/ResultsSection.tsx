import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const benefits = [
  {
    title: "Capture Every Opportunity",
    description: "No more missed calls means no more lost patients. Every inquiry becomes a potential appointment.",
  },
  {
    title: "Instant Patient Service",
    description: "Patients get immediate answers and booking — the convenience they expect in 2025.",
  },
  {
    title: "Staff Focus on Care",
    description: "Your team can focus on in-office patients instead of constantly answering phones.",
  },
  {
    title: "Increased Revenue",
    description: "More answered calls = more booked appointments = healthier practice growth.",
  },
  {
    title: "Healthcare Compliant",
    description: "Built with GDPR compliance from day one. All data stays within the EU.",
  },
];

export const ResultsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 md:py-32 px-5 sm:px-8 bg-[#0a0e1a] overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <p
              className="text-blue-400 font-medium text-sm tracking-wide uppercase mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              The result
            </p>
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              More patients,
              <br />
              happier staff
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed mb-8">
              See the immediate impact of automating your front desk. Caberu doesn't just answer phones — it transforms
              your practice's efficiency.
            </p>
            <div className="flex items-center gap-3 text-slate-500 text-sm">
              <CheckCircle2 className="w-5 h-5 text-blue-500" />
              <span>Built with practitioners — designed from real practice feedback</span>
            </div>
          </motion.div>

          {/* Right — benefits list */}
          <div className="space-y-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, x: 20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 + index * 0.08 }}
                className="flex gap-4"
              >
                <div className="flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">{benefit.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{benefit.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
