import { motion } from "framer-motion";
import { TIMELINE } from "./romeo-constants";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function RomeoTimeline() {
  return (
    <section id="romeo-timeline" className="relative py-28 md:py-36 border-t border-[#1E1E1E]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.p initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
          className="r-body text-[#1A6BFF] text-xs tracking-[0.2em] uppercase mb-6">
          03 / Timeline
        </motion.p>

        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
          className="r-display text-[#F0EBE0] text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight mb-16">
          {TIMELINE.heading}
        </motion.h2>

        <div className="relative">
          <div className="hidden md:block absolute left-[200px] top-0 bottom-0 w-px bg-[#1E1E1E]" aria-hidden="true" />
          <div className="space-y-0">
            {TIMELINE.entries.map((entry, i) => (
              <TimelineEntry
                key={i} year={entry.year} title={entry.title}
                description={entry.description} index={i}
                isLast={i === TIMELINE.entries.length - 1} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TimelineEntry({ year, title, description, index, isLast }: {
  year: string; title: string; description: string; index: number; isLast: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] as const }}
      className="relative flex flex-col md:flex-row md:items-start gap-4 md:gap-0 pb-12">
      <div className="md:w-[200px] md:pr-8 md:text-right shrink-0">
        <span className="r-body text-[#8A8A8A] text-xs tracking-[0.15em] uppercase">{year}</span>
      </div>

      <div className="hidden md:flex absolute left-[200px] top-0.5 -translate-x-1/2 items-center justify-center" aria-hidden="true">
        <div className="w-2 h-2 rounded-full bg-[#1A6BFF] ring-4 ring-[#0A0A0A]" />
      </div>

      <div className="md:pl-10 flex-1">
        <div className="md:hidden flex items-center gap-3 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#1A6BFF] shrink-0" aria-hidden="true" />
          <div className="flex-1 h-px bg-[#1E1E1E]" aria-hidden="true" />
        </div>
        <h3 className="r-display text-[#F0EBE0] text-lg md:text-xl font-medium mb-2 leading-snug">{title}</h3>
        <p className="r-body text-[#8A8A8A] text-sm leading-[1.8]">{description}</p>
        {!isLast && <div className="md:hidden mt-8 ml-[3px] w-px h-8 bg-[#1E1E1E]" aria-hidden="true" />}
      </div>
    </motion.div>
  );
}
