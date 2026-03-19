"use client";

import { motion } from "framer-motion";
import { ABOUT } from "@/lib/constants";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

const staggerContainer = {
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

export default function About() {
  return (
    <section id="about" className="relative py-28 md:py-36 border-t border-border-subtle">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section label */}
        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="font-body text-accent text-xs tracking-[0.2em] uppercase mb-6"
        >
          01 / About
        </motion.p>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Left — text */}
          <div>
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={fadeUp}
              className="font-display text-heading-text text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight mb-10"
            >
              {ABOUT.heading}
            </motion.h2>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={staggerContainer}
              className="space-y-6"
            >
              {ABOUT.paragraphs.map((para, i) => (
                <motion.p
                  key={i}
                  variants={fadeUp}
                  className={`font-body leading-[1.8] ${
                    i === ABOUT.paragraphs.length - 1
                      ? "text-heading-text font-medium text-base italic font-display"
                      : "text-body-text text-base"
                  }`}
                >
                  {para}
                </motion.p>
              ))}
            </motion.div>
          </div>

          {/* Right — decorative element */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            className="lg:pt-16"
          >
            <div className="relative border border-border-subtle p-8 md:p-10">
              {/* Corner accent */}
              <div className="absolute top-0 left-0 w-8 h-px bg-accent" aria-hidden="true" />
              <div className="absolute top-0 left-0 h-8 w-px bg-accent" aria-hidden="true" />

              {/* Stats */}
              <div className="space-y-8">
                <Stat value="15" label="Years old" />
                <div className="w-full h-px bg-border-subtle" />
                <Stat value="2024" label="Year founded" />
                <div className="w-full h-px bg-border-subtle" />
                <Stat value="Belgium" label="Based in" />
                <div className="w-full h-px bg-border-subtle" />
                <Stat value="3" label="Languages supported" sublabel="Dutch · French · English" />
              </div>

              {/* Bottom corner accent */}
              <div className="absolute bottom-0 right-0 w-8 h-px bg-border-subtle" aria-hidden="true" />
              <div className="absolute bottom-0 right-0 h-8 w-px bg-border-subtle" aria-hidden="true" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  value,
  label,
  sublabel,
}: {
  value: string;
  label: string;
  sublabel?: string;
}) {
  return (
    <div>
      <p className="font-display text-heading-text text-2xl md:text-3xl font-semibold mb-1">
        {value}
      </p>
      <p className="font-body text-body-text text-sm tracking-wide">{label}</p>
      {sublabel && (
        <p className="font-body text-body-text/60 text-xs mt-0.5">{sublabel}</p>
      )}
    </div>
  );
}
