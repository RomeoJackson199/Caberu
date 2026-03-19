import { motion } from "framer-motion";
import { STACK } from "./romeo-constants";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

const badgeVariant = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function RomeoStack() {
  return (
    <section id="romeo-stack" className="relative py-28 md:py-36 border-t border-[#1E1E1E] bg-[#111111]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.p initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
          className="r-body text-[#1A6BFF] text-xs tracking-[0.2em] uppercase mb-6">
          04 / Skills
        </motion.p>

        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
          className="r-display text-[#F0EBE0] text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight mb-16">
          {STACK.heading}
        </motion.h2>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
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
      <p className="r-body text-[#8A8A8A] text-xs tracking-[0.15em] uppercase mb-4 pb-3 border-b border-[#1E1E1E]">
        {label}
      </p>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
        className="flex flex-wrap gap-2">
        {items.map((item) => (
          <motion.span key={item} variants={badgeVariant}
            whileHover={{ scale: 1.04 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="inline-block r-body text-[#8A8A8A] text-xs px-3 py-1.5 border border-[#1E1E1E] hover:border-[#1A6BFF]/40 hover:text-[#F0EBE0] transition-colors duration-200 cursor-default">
            {item}
          </motion.span>
        ))}
      </motion.div>
    </motion.div>
  );
}
