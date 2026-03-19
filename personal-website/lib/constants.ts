// All site copy lives here — edit text without touching component files

export const SITE_META = {
  title: "Romeo Jackson — Founder & CEO of Caberu",
  description:
    "15-year-old founder building AI voice infrastructure for Belgian healthcare practices. CEO & Co-founder of Caberu.",
  url: "https://caberu.be/romeo",
  ogImage: "/images/og-image.png",
};

export const NAV = {
  wordmark: "Romeo Jackson",
  links: [
    { label: "About", href: "#about" },
    { label: "Caberu", href: "#caberu" },
    { label: "Timeline", href: "#timeline" },
    { label: "Contact", href: "#contact" },
  ],
};

export const HERO = {
  heading: "Building AI infrastructure\nfor European healthcare.",
  subheading: "Romeo Jackson — CEO & Co-founder of Caberu. 15 years old.",
  cta: {
    primary: { label: "See what I'm building", href: "#caberu" },
    secondary: { label: "Get in touch", href: "#contact" },
  },
};

export const ABOUT = {
  heading: "The Story",
  paragraphs: [
    "I'm Romeo — a 15-year-old founder based in Belgium, building AI tools for healthcare practices. I started Caberu after realising that thousands of medical and dental practices across Belgium lose patients every week simply because no one picks up the phone. My grandmother is a dentist. I grew up seeing the problem firsthand.",
    "I co-founded Caberu with Thomas Iordache after meeting at an AI camp in 2025. Since then we've built a full AI voice receptionist and practice management platform — real infrastructure, real code, real customers.",
    "Beyond Caberu, I'm obsessed with markets and investing, I practise ITF Taekwon-Do, play basketball, and ski competitively. I'm planning to study handelsingenieur at KU Leuven, then a master's in the US.",
    "I build things that should already exist.",
  ],
};

export const CABERU = {
  heading: "What I'm Building",
  subheading: "Caberu — AI voice receptionist & practice management platform",
  paragraphs: [
    "Belgian healthcare practices miss thousands of patient calls every year. Receptionists are overwhelmed, after-hours calls go unanswered, and practices lose revenue they never even see.",
    "Caberu fixes this. Our AI answers calls 24/7, books appointments, sends WhatsApp reminders, and integrates directly into practice management workflows — in Dutch, French, and English.",
    "We built everything: voice AI (OpenAI Realtime API), telephony (Twilio), messaging (WhatsApp Business API), billing (Stripe), and a full multi-tenant backend (Supabase). Starting with dental practices in Belgium, expanding from there.",
  ],
  cta: {
    label: "Visit caberu.be →",
    href: "https://caberu.be",
  },
  mockup: {
    title: "Incoming call — Tandartspraktijk Vanhove",
    timestamp: "23:47 · After hours",
    transcript: [
      { role: "caller", text: "Hallo, ik wil graag een afspraak maken voor volgende week." },
      { role: "ai", text: "Goedenavond! Ik ben de digitale receptionist van Tandartspraktijk Vanhove. Ik kan u direct helpen met uw afspraak. Wanneer schikt het u best — ochtend of namiddag?" },
      { role: "caller", text: "Dinsdagochtend zou perfect zijn." },
      { role: "ai", text: "Dinsdag 25 maart om 09:15 is beschikbaar. Zal ik die voor u reserveren?" },
      { role: "caller", text: "Ja, graag." },
      { role: "ai", text: "Afspraak bevestigd. U ontvangt een WhatsApp-bevestiging. Tot dinsdag!" },
    ],
    footer: "Appointment booked · WhatsApp confirmation sent · 0 staff required",
  },
};

export const TIMELINE = {
  heading: "What I've Done",
  entries: [
    {
      year: "2025",
      title: "Met Thomas at an AI camp",
      description: "Started exploring AI product ideas together. Realised we were building toward the same problem from different angles.",
    },
    {
      year: "Late 2025",
      title: "Founded Caberu",
      description: "Built the initial voice AI booking system. First external validation from Pascal Vanhove, CEO of Mobminder.",
    },
    {
      year: "Early 2025",
      title: "Full platform build",
      description: "Shipped multi-tenant Supabase backend, Stripe billing, WhatsApp Business API integration, and a complete practice management dashboard.",
    },
    {
      year: "2025",
      title: "Switched voice AI to OpenAI Realtime API",
      description: "Improved gross margins by ~9 percentage points. Dramatically better call quality and lower latency.",
    },
    {
      year: "2026",
      title: "Active deployment & outreach",
      description: "Targeting dental practices across Belgium. Applied to OpenAI Codex for Open Source program.",
    },
    {
      year: "2027 (planned)",
      title: "KU Leuven, handelsingenieur",
      description: "Continuing to build Caberu while beginning studies. Planning a master's in the US thereafter.",
    },
  ],
};

export const STACK = {
  heading: "How I Build",
  groups: [
    {
      label: "AI & Voice",
      items: ["OpenAI Realtime API", "Whisper", "Ollama"],
    },
    {
      label: "Backend & Infra",
      items: ["Supabase", "PostgreSQL", "Edge Functions", "RLS"],
    },
    {
      label: "Telephony & Messaging",
      items: ["Twilio", "WhatsApp Business API"],
    },
    {
      label: "Frontend",
      items: ["Next.js", "TypeScript", "Tailwind CSS", "Framer Motion"],
    },
    {
      label: "Payments",
      items: ["Stripe"],
    },
    {
      label: "Language",
      items: ["TypeScript", "SQL"],
    },
  ],
};

export const CONTACT = {
  heading: "Get in Touch",
  subheading:
    "Whether you're an investor, journalist, or potential collaborator — I'd love to hear from you.",
  email: "romeo@caberu.be",
  linkedin: "https://www.linkedin.com/in/romeo-jackson-609177339/",
};

export const FOOTER = {
  copyright: "© 2026 Romeo Jackson",
};
