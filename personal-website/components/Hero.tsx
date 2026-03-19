"use client";

import { motion } from "framer-motion";
import { HERO } from "@/lib/constants";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Hero() {
  const headingLines = HERO.heading.split("\n");

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col justify-center overflow-hidden"
      aria-label="Introduction"
    >
      {/* Grain overlay */}
      <div className="grain-overlay" aria-hidden="true" />

      {/* Geometric SVG background — very subtle */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      >
        <svg
          className="absolute top-0 right-0 w-[600px] h-[600px] opacity-[0.04]"
          viewBox="0 0 600 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.circle
            cx="300"
            cy="300"
            r="200"
            stroke="#1A6BFF"
            strokeWidth="0.5"
            animate={{ rotate: 360 }}
            transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
            style={{ originX: "50%", originY: "50%" }}
          />
          <motion.circle
            cx="300"
            cy="300"
            r="280"
            stroke="#F0EBE0"
            strokeWidth="0.3"
            strokeDasharray="4 12"
            animate={{ rotate: -360 }}
            transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
            style={{ originX: "50%", originY: "50%" }}
          />
          <motion.line
            x1="100"
            y1="300"
            x2="500"
            y2="300"
            stroke="#1A6BFF"
            strokeWidth="0.3"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.line
            x1="300"
            y1="100"
            x2="300"
            y2="500"
            stroke="#1A6BFF"
            strokeWidth="0.3"
            animate={{ opacity: [0.8, 0.3, 0.8] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>

        {/* Bottom left decorative line */}
        <div className="absolute bottom-12 left-6 md:left-12 w-px h-24 bg-gradient-to-b from-border-subtle to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-32">
        {/* Eyebrow label */}
        <motion.p
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="font-body text-accent text-xs tracking-[0.2em] uppercase mb-8"
        >
          romeo.caberu.be
        </motion.p>

        {/* Main heading */}
        <h1 className="font-display text-heading-text font-semibold leading-[1.08] mb-8">
          {headingLines.map((line, i) => (
            <motion.span
              key={i}
              custom={i * 0.1}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl"
            >
              {line}
            </motion.span>
          ))}
        </h1>

        {/* Hairline separator */}
        <motion.div
          custom={0.2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="w-12 h-px bg-accent mb-8"
          aria-hidden="true"
        />

        {/* Subheading */}
        <motion.p
          custom={0.3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="font-body text-body-text text-base md:text-lg max-w-lg mb-12 leading-relaxed"
        >
          {HERO.subheading}
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          custom={0.5}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex flex-col sm:flex-row gap-4"
        >
          <CTAButton
            label={HERO.cta.primary.label}
            href={HERO.cta.primary.href}
            primary
          />
          <CTAButton
            label={HERO.cta.secondary.label}
            href={HERO.cta.secondary.href}
          />
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        aria-hidden="true"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-10 bg-gradient-to-b from-border-subtle to-transparent"
        />
      </motion.div>
    </section>
  );
}

function CTAButton({
  label,
  href,
  primary = false,
}: {
  label: string;
  href: string;
  primary?: boolean;
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.a
      href={href}
      onClick={handleClick}
      whileHover={{ y: -2, boxShadow: primary ? "0 8px 30px rgba(26,107,255,0.25)" : "0 8px 30px rgba(0,0,0,0.4)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`inline-flex items-center justify-center font-body text-sm tracking-wide px-7 py-3.5 border transition-colors duration-200 cursor-pointer ${
        primary
          ? "bg-accent text-white border-accent hover:bg-accent/90"
          : "bg-transparent text-heading-text border-border-subtle hover:border-heading-text/40"
      }`}
    >
      {label}
    </motion.a>
  );
}
