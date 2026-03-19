import { motion } from "framer-motion";
import { CABERU } from "./romeo-constants";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

export default function RomeoCaberu() {
  return (
    <section id="romeo-caberu" className="relative py-28 md:py-36 border-t border-[#1E1E1E] bg-[#111111]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.p initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
          className="r-body text-[#1A6BFF] text-xs tracking-[0.2em] uppercase mb-6">
          02 / Product
        </motion.p>

        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
          className="r-display text-[#F0EBE0] text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight mb-4">
          {CABERU.heading}
        </motion.h2>

        <motion.p initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
          className="r-body text-[#8A8A8A] text-sm tracking-wide mb-12">
          {CABERU.subheading}
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
            {CABERU.paragraphs.map((para, i) => (
              <motion.p key={i} variants={fadeUp} className="r-body text-[#8A8A8A] text-base leading-[1.8] mb-6">
                {para}
              </motion.p>
            ))}
            <motion.div variants={fadeUp}>
              <motion.a
                href={CABERU.cta.href} target="_blank" rel="noopener noreferrer"
                whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(26,107,255,0.2)" }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="inline-flex items-center gap-2 r-body text-sm text-[#F0EBE0] border border-[#1E1E1E] px-6 py-3 hover:border-[#1A6BFF]/60 hover:text-[#1A6BFF] transition-colors duration-200">
                {CABERU.cta.label}
              </motion.a>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] as const, delay: 0.15 }}>
            <TerminalMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function TerminalMockup() {
  const { mockup } = CABERU;
  return (
    <div className="border border-[#1E1E1E] bg-[#0A0A0A] font-mono text-xs">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E1E1E]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#FF5F57]" aria-hidden="true" />
          <div className="w-2 h-2 rounded-full bg-[#FFBD2E]" aria-hidden="true" />
          <div className="w-2 h-2 rounded-full bg-[#28C840]" aria-hidden="true" />
        </div>
        <span className="text-[#8A8A8A] text-[10px] tracking-wide">caberu-voice-ai</span>
        <div className="w-12" />
      </div>

      <div className="px-4 py-3 border-b border-[#1E1E1E]">
        <div className="mb-1">
          <span className="text-[#1A6BFF]">{mockup.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] text-[#8A8A8A]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#28C840] animate-pulse" aria-hidden="true" />
            LIVE
          </span>
          <span className="text-[#8A8A8A] text-[10px]">·</span>
          <span className="text-[#8A8A8A] text-[10px]">{mockup.timestamp}</span>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {mockup.transcript.map((line, i) => (
          <TranscriptLine key={i} role={line.role} text={line.text} index={i} />
        ))}
      </div>

      <div className="px-4 py-3 border-t border-[#1E1E1E]">
        <p className="text-[10px] text-[#1A6BFF] tracking-wide">{mockup.footer}</p>
      </div>
    </div>
  );
}

function TranscriptLine({ role, text, index }: { role: string; text: string; index: number }) {
  const isAI = role === "ai";
  return (
    <motion.div
      initial={{ opacity: 0, x: isAI ? -8 : 8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className={`flex gap-2 ${isAI ? "" : "flex-row-reverse"}`}>
      <span className={`shrink-0 text-[9px] tracking-widest uppercase mt-0.5 ${isAI ? "text-[#1A6BFF]" : "text-[#8A8A8A]"}`}>
        {isAI ? "AI" : "↩"}
      </span>
      <p className={`leading-[1.6] ${isAI ? "text-[#F0EBE0]" : "text-[#8A8A8A]"}`}>{text}</p>
    </motion.div>
  );
}
