"use client";

import { motion } from "framer-motion";
import { STACK } from "@/lib/constants";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

const staggerContainer = {
  visible: { transition: { staggerChildren: 0.06 } },
};

const badgeVariant = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function Stack() {
  return (
    <section
      id="stack"
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
          04 / Skills
        </motion.p>

        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="font-display text-heading-text text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight mb-16"
        >
          {STACK.heading}
        </motion.h2>

        {/* Stack groups grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {STACK.groups.map((group) => (
            <StackGroup key={group.label} label={group.label} items={group.items} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function StackGroup({ label, items }: { label: string; items: string[] }) {
  return (
    <motion.div variants={fadeUp}>
      {/* Group label */}
      <p className="font-body text-body-text text-xs tracking-[0.15em] uppercase mb-4 pb-3 border-b border-border-subtle">
        {label}
      </p>

      {/* Badges */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
        className="flex flex-wrap gap-2"
      >
        {items.map((item) => (
          <StackBadge key={item} label={item} />
        ))}
      </motion.div>
    </motion.div>
  );
}

function StackBadge({ label }: { label: string }) {
  return (
    <motion.span
      variants={badgeVariant}
      whileHover={{ scale: 1.04 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="inline-block font-body text-body-text text-xs px-3 py-1.5 border border-border-subtle hover:border-accent/40 hover:text-heading-text transition-colors duration-200 cursor-default"
    >
      {label}
    </motion.span>
  );
}
