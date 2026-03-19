import { motion } from "framer-motion";
import { ABOUT } from "./romeo-constants";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger = { visible: { transition: { staggerChildren: 0.12 } } };

export default function RomeoAbout() {
  return (
    <section id="romeo-about" className="relative py-28 md:py-36 border-t border-[#1E1E1E]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.p initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
          className="r-body text-[#1A6BFF] text-xs tracking-[0.2em] uppercase mb-6">
          01 / About
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          <div>
            <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
              className="r-display text-[#F0EBE0] text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight mb-10">
              {ABOUT.heading}
            </motion.h2>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}
              className="space-y-6">
              {ABOUT.paragraphs.map((para, i) => (
                <motion.p key={i} variants={fadeUp}
                  className={`r-body leading-[1.8] ${
                    i === ABOUT.paragraphs.length - 1
                      ? "text-[#F0EBE0] font-medium text-base italic r-display"
                      : "text-[#8A8A8A] text-base"
                  }`}>
                  {para}
                </motion.p>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] as const, delay: 0.2 }}
            className="lg:pt-16">
            <div className="relative border border-[#1E1E1E] p-8 md:p-10">
              <div className="absolute top-0 left-0 w-8 h-px bg-[#1A6BFF]" aria-hidden="true" />
              <div className="absolute top-0 left-0 h-8 w-px bg-[#1A6BFF]" aria-hidden="true" />
              <div className="space-y-8">
                <Stat value="15" label="Years old" />
                <div className="w-full h-px bg-[#1E1E1E]" />
                <Stat value="2025" label="Year founded" />
                <div className="w-full h-px bg-[#1E1E1E]" />
                <Stat value="Belgium" label="Based in" />
                <div className="w-full h-px bg-[#1E1E1E]" />
                <Stat value="3" label="Languages supported" sublabel="Dutch · French · English" />
              </div>
              <div className="absolute bottom-0 right-0 w-8 h-px bg-[#1E1E1E]" aria-hidden="true" />
              <div className="absolute bottom-0 right-0 h-8 w-px bg-[#1E1E1E]" aria-hidden="true" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label, sublabel }: { value: string; label: string; sublabel?: string }) {
  return (
    <div>
      <p className="r-display text-[#F0EBE0] text-2xl md:text-3xl font-semibold mb-1">{value}</p>
      <p className="r-body text-[#8A8A8A] text-sm tracking-wide">{label}</p>
      {sublabel && <p className="r-body text-[#8A8A8A]/60 text-xs mt-0.5">{sublabel}</p>}
    </div>
  );
}
