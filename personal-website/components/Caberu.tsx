"use client";

import { motion } from "framer-motion";
import { CABERU } from "@/lib/constants";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

const staggerContainer = {
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function Caberu() {
  return (
    <section
      id="caberu"
      className="relative py-28 md:py-36 border-t border-border-subtle bg-surface"
    >
      <div className="max-w-6xl mx-auto px-6">
        {/* Section label */}
        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="font-body text-accent text-xs tracking-[0.2em] uppercase mb-6"
        >
          02 / Product
        </motion.p>

        {/* Heading */}
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="font-display text-heading-text text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight mb-4"
        >
          {CABERU.heading}
        </motion.h2>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="font-body text-body-text text-sm tracking-wide mb-12"
        >
          {CABERU.subheading}
        </motion.p>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left — copy */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            {CABERU.paragraphs.map((para, i) => (
              <motion.p
                key={i}
                variants={fadeUp}
                className="font-body text-body-text text-base leading-[1.8] mb-6"
              >
                {para}
              </motion.p>
            ))}

            <motion.div variants={fadeUp}>
              <motion.a
                href={CABERU.cta.href}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(26,107,255,0.2)" }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="inline-flex items-center gap-2 font-body text-sm text-heading-text border border-border-subtle px-6 py-3 hover:border-accent/60 hover:text-accent transition-colors duration-200"
              >
                {CABERU.cta.label}
              </motion.a>
            </motion.div>
          </motion.div>

          {/* Right — terminal mockup */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          >
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
    <div className="border border-border-subtle bg-background font-mono text-xs">
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#FF5F57]" aria-hidden="true" />
          <div className="w-2 h-2 rounded-full bg-[#FFBD2E]" aria-hidden="true" />
          <div className="w-2 h-2 rounded-full bg-[#28C840]" aria-hidden="true" />
        </div>
        <span className="text-body-text text-[10px] tracking-wide">
          caberu-voice-ai
        </span>
        <div className="w-12" />
      </div>

      {/* Call header */}
      <div className="px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center justify-between mb-1">
          <span className="text-accent">{mockup.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] text-body-text">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-[#28C840] animate-pulse"
              aria-hidden="true"
            />
            LIVE
          </span>
          <span className="text-body-text text-[10px]">·</span>
          <span className="text-body-text text-[10px]">{mockup.timestamp}</span>
        </div>
      </div>

      {/* Transcript */}
      <div className="px-4 py-4 space-y-4">
        {mockup.transcript.map((line, i) => (
          <TranscriptLine key={i} role={line.role} text={line.text} index={i} />
        ))}
      </div>

      {/* Footer status */}
      <div className="px-4 py-3 border-t border-border-subtle">
        <p className="text-[10px] text-accent tracking-wide">{mockup.footer}</p>
      </div>
    </div>
  );
}

function TranscriptLine({
  role,
  text,
  index,
}: {
  role: string;
  text: string;
  index: number;
}) {
  const isAI = role === "ai";
  return (
    <motion.div
      initial={{ opacity: 0, x: isAI ? -8 : 8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className={`flex gap-2 ${isAI ? "" : "flex-row-reverse"}`}
    >
      <span
        className={`shrink-0 text-[9px] tracking-widest uppercase mt-0.5 ${
          isAI ? "text-accent" : "text-body-text"
        }`}
      >
        {isAI ? "AI" : "↩"}
      </span>
      <p
        className={`leading-[1.6] ${
          isAI ? "text-heading-text" : "text-body-text"
        }`}
      >
        {text}
      </p>
    </motion.div>
  );
}
