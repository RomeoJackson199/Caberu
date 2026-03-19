"use client";

import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { CONTACT } from "@/lib/constants";

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

export default function Contact() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { name, email, message } = formData;
    const subject = encodeURIComponent(`Message from ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`
    );
    window.location.href = `mailto:${CONTACT.email}?subject=${subject}&body=${body}`;
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <section
      id="contact"
      className="relative py-28 md:py-36 border-t border-border-subtle"
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
          05 / Contact
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Left — intro */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            <motion.h2
              variants={fadeUp}
              className="font-display text-heading-text text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight mb-6"
            >
              {CONTACT.heading}
            </motion.h2>

            <motion.p
              variants={fadeUp}
              className="font-body text-body-text text-base leading-[1.8] mb-10 max-w-md"
            >
              {CONTACT.subheading}
            </motion.p>

            {/* Email */}
            <motion.div variants={fadeUp} className="mb-6">
              <p className="font-body text-body-text text-xs tracking-[0.15em] uppercase mb-2">
                Email
              </p>
              <motion.a
                href={`mailto:${CONTACT.email}`}
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="font-display text-heading-text text-lg hover:text-accent transition-colors duration-200"
              >
                {CONTACT.email}
              </motion.a>
            </motion.div>

            {/* LinkedIn */}
            <motion.div variants={fadeUp}>
              <p className="font-body text-body-text text-xs tracking-[0.15em] uppercase mb-3">
                LinkedIn
              </p>
              <motion.a
                href={CONTACT.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(0,0,0,0.4)" }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="inline-flex items-center gap-2 font-body text-sm text-heading-text border border-border-subtle px-5 py-2.5 hover:border-accent/60 hover:text-accent transition-colors duration-200"
              >
                <LinkedInIcon />
                Romeo Jackson
              </motion.a>
            </motion.div>
          </motion.div>

          {/* Right — form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          >
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <FormField
                id="name"
                label="Name"
                type="text"
                placeholder="Your name"
                value={formData.name}
                onChange={(v) => setFormData((p) => ({ ...p, name: v }))}
                required
              />
              <FormField
                id="email"
                label="Email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(v) => setFormData((p) => ({ ...p, email: v }))}
                required
              />
              <div>
                <label
                  htmlFor="message"
                  className="block font-body text-body-text text-xs tracking-[0.12em] uppercase mb-2"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  required
                  placeholder="What's on your mind?"
                  value={formData.message}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, message: e.target.value }))
                  }
                  className="w-full bg-surface border border-border-subtle text-heading-text font-body text-sm px-4 py-3 placeholder:text-body-text/40 focus:outline-none focus:border-accent/50 transition-colors duration-200 resize-none"
                />
              </div>

              <motion.button
                type="submit"
                whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(26,107,255,0.25)" }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="w-full bg-accent text-white font-body text-sm tracking-wide py-3.5 hover:bg-accent/90 transition-colors duration-200"
              >
                {submitted ? "Opening email client..." : "Send Message"}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function FormField({
  id,
  label,
  type,
  placeholder,
  value,
  onChange,
  required,
}: {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block font-body text-body-text text-xs tracking-[0.12em] uppercase mb-2"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface border border-border-subtle text-heading-text font-body text-sm px-4 py-3 placeholder:text-body-text/40 focus:outline-none focus:border-accent/50 transition-colors duration-200"
      />
    </div>
  );
}

function LinkedInIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
