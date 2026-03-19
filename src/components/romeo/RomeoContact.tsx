import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { CONTACT } from "./romeo-constants";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

export default function RomeoContact() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { name, email, message } = formData;
    const subject = encodeURIComponent(`Message from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:${CONTACT.email}?subject=${subject}&body=${body}`;
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <section id="romeo-contact" className="relative py-28 md:py-36 border-t border-[#1E1E1E]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.p initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
          className="r-body text-[#1A6BFF] text-xs tracking-[0.2em] uppercase mb-6">
          05 / Contact
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
            <motion.h2 variants={fadeUp}
              className="r-display text-[#F0EBE0] text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight mb-6">
              {CONTACT.heading}
            </motion.h2>
            <motion.p variants={fadeUp} className="r-body text-[#8A8A8A] text-base leading-[1.8] mb-10 max-w-md">
              {CONTACT.subheading}
            </motion.p>

            <motion.div variants={fadeUp} className="mb-6">
              <p className="r-body text-[#8A8A8A] text-xs tracking-[0.15em] uppercase mb-2">Email</p>
              <motion.a href={`mailto:${CONTACT.email}`}
                whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="r-display text-[#F0EBE0] text-lg hover:text-[#1A6BFF] transition-colors duration-200 inline-block">
                {CONTACT.email}
              </motion.a>
            </motion.div>

            <motion.div variants={fadeUp}>
              <p className="r-body text-[#8A8A8A] text-xs tracking-[0.15em] uppercase mb-3">LinkedIn</p>
              <motion.a
                href={CONTACT.linkedin} target="_blank" rel="noopener noreferrer"
                whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(0,0,0,0.4)" }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="inline-flex items-center gap-2 r-body text-sm text-[#F0EBE0] border border-[#1E1E1E] px-5 py-2.5 hover:border-[#1A6BFF]/60 hover:text-[#1A6BFF] transition-colors duration-200">
                <LinkedInIcon />
                Romeo Jackson
              </motion.a>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] as const, delay: 0.15 }}>
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <Field id="romeo-name" label="Name" type="text" placeholder="Your name"
                value={formData.name} onChange={(v) => setFormData((p) => ({ ...p, name: v }))} />
              <Field id="romeo-email" label="Email" type="email" placeholder="your@email.com"
                value={formData.email} onChange={(v) => setFormData((p) => ({ ...p, email: v }))} />
              <div>
                <label htmlFor="romeo-message" className="block r-body text-[#8A8A8A] text-xs tracking-[0.12em] uppercase mb-2">
                  Message
                </label>
                <textarea
                  id="romeo-message" name="message" rows={5} required
                  placeholder="What's on your mind?"
                  value={formData.message}
                  onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                  className="w-full bg-[#111111] border border-[#1E1E1E] text-[#F0EBE0] r-body text-sm px-4 py-3 placeholder:text-[#8A8A8A]/40 focus:outline-none focus:border-[#1A6BFF]/50 transition-colors duration-200 resize-none"
                />
              </div>
              <motion.button type="submit"
                whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(26,107,255,0.25)" }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="w-full bg-[#1A6BFF] text-white r-body text-sm tracking-wide py-3.5 hover:bg-[#1A6BFF]/90 transition-colors duration-200">
                {submitted ? "Opening email client..." : "Send Message"}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Field({ id, label, type, placeholder, value, onChange }: {
  id: string; label: string; type: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block r-body text-[#8A8A8A] text-xs tracking-[0.12em] uppercase mb-2">{label}</label>
      <input
        id={id} name={id} type={type} required placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#111111] border border-[#1E1E1E] text-[#F0EBE0] r-body text-sm px-4 py-3 placeholder:text-[#8A8A8A]/40 focus:outline-none focus:border-[#1A6BFF]/50 transition-colors duration-200"
      />
    </div>
  );
}

function LinkedInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
