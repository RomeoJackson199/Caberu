import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQ[] = [
  // Getting Started
  {
    question: "How do I create an account on Caberu?",
    answer:
      "Visit our homepage and click 'Get Started'. You'll be guided through a simple setup — enter your practice name, your details, and choose a plan. The whole process takes under 5 minutes.",
    category: "Getting Started",
  },
  {
    question: "How long does it take to set up Caberu for my practice?",
    answer:
      "Most practices are fully up and running within 48 hours. Our team handles calendar integration, AI training on your specific services, and staff onboarding. You'll have a dedicated implementation specialist throughout the process.",
    category: "Getting Started",
  },
  {
    question: "Can Caberu integrate with my existing practice management software?",
    answer:
      "Yes. Caberu integrates with major dental practice management systems including Dentrix, Eaglesoft, Open Dental, Curve, and others. We also offer API access for custom integrations.",
    category: "Getting Started",
  },

  // Appointments
  {
    question: "How do I book an appointment?",
    answer:
      "Log in to your patient portal, go to 'Book Appointment', pick your preferred dentist, date, and time. You'll get a confirmation email right away. You can also book by chatting with our AI assistant.",
    category: "Appointments",
  },
  {
    question: "How do I cancel or reschedule an appointment?",
    answer:
      "Go to 'My Appointments' in your dashboard, find the appointment, and click 'Reschedule' or 'Cancel'. Please give at least 24 hours notice for cancellations to avoid any fees.",
    category: "Appointments",
  },
  {
    question: "What happens if I miss an appointment?",
    answer:
      "If you miss an appointment without notice, a no-show fee may apply depending on your practice's policy. We send reminders via SMS and email before every appointment to help you stay on track.",
    category: "Appointments",
  },

  // AI & Technology
  {
    question: "How does the AI phone reception work?",
    answer:
      "Our AI uses natural language processing to handle patient calls in real-time. It can book appointments, answer common questions, identify emergencies, and collect patient information — all while sounding natural and professional. If it encounters something complex, it transfers to your staff with full context.",
    category: "AI & Technology",
  },
  {
    question: "What if patients prefer talking to a real person?",
    answer:
      "Patients can always request to speak with staff and the AI will transfer them immediately with the full conversation context. That said, most patients appreciate the zero hold time.",
    category: "AI & Technology",
  },
  {
    question: "What languages does the AI support?",
    answer:
      "Currently English, French, Dutch, and Spanish. The AI can detect the caller's language and switch automatically. We're adding more languages based on customer demand.",
    category: "AI & Technology",
  },
  {
    question: "Can I customize what the AI says?",
    answer:
      "Absolutely. You have full control over scripts, greetings, and responses. You can customize how it handles different scenarios, what information it collects, and its personality to match your practice's brand.",
    category: "AI & Technology",
  },

  // Billing & Pricing
  {
    question: "How much does Caberu cost?",
    answer:
      "Pricing starts at €249/month for solo practices with unlimited calls and appointments. We offer scaled pricing for multi-location practices. Most practices save €3,000–5,000/month compared to traditional staffing.",
    category: "Billing & Pricing",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards, debit cards, and bank transfers. Payment is processed securely. You can also set up payment plans for larger treatments.",
    category: "Billing & Pricing",
  },
  {
    question: "Is there a contract or can I cancel anytime?",
    answer:
      "No long-term contracts. We offer month-to-month plans with a 14-day free trial. Cancel anytime with 30 days notice.",
    category: "Billing & Pricing",
  },

  // Privacy & Security
  {
    question: "Is my medical information secure?",
    answer:
      "Yes. All data is encrypted at rest and in transit using industry-standard protocols. We use row-level security so each practice can only access their own data. Regular security audits ensure ongoing compliance.",
    category: "Privacy & Security",
  },
  {
    question: "Is Caberu GDPR compliant?",
    answer:
      "Yes. Caberu is fully GDPR compliant with enterprise-grade encryption, secure data storage, and comprehensive audit logs. All data is processed and stored within the EU.",
    category: "Privacy & Security",
  },
  {
    question: "How do I request my data or delete my account?",
    answer:
      "Email us at Romeo@caberu.be with your request. We process data export requests within 7 business days and account deletions within 30 days, in compliance with GDPR regulations.",
    category: "Privacy & Security",
  },

  // Account & Profile
  {
    question: "How do I update my profile information?",
    answer:
      "Go to your dashboard and click 'Settings'. From there you can update your personal details, contact information, and medical history.",
    category: "Account",
  },
  {
    question: "What should I do in a dental emergency?",
    answer:
      "Use our emergency triage system to assess your situation — it will guide you on next steps. For severe pain, bleeding, or trauma, call emergency services immediately.",
    category: "Account",
  },
];

const categories = [...new Set(faqs.map((f) => f.category))];

interface FAQSectionProps {
  showSearch?: boolean;
  externalSearchQuery?: string;
}

export const FAQSection = ({
  showSearch = false,
  externalSearchQuery,
}: FAQSectionProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const query = externalSearchQuery ?? searchQuery;

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      !query ||
      faq.question.toLowerCase().includes(query.toLowerCase()) ||
      faq.answer.toLowerCase().includes(query.toLowerCase());
    const matchesCategory =
      !activeCategory || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedFaqs = categories
    .map((cat) => ({
      category: cat,
      items: filteredFaqs.filter((f) => f.category === cat),
    }))
    .filter((group) => group.items.length > 0);

  // Add FAQ schema to page head
  useEffect(() => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(schema);
    script.id = "faq-schema";
    document.head.appendChild(script);

    return () => {
      const existingScript = document.getElementById("faq-schema");
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
      <div className="max-w-4xl mx-auto">
        {!externalSearchQuery && (
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to know about Caberu
            </p>
          </div>
        )}

        {/* Search */}
        {showSearch && !externalSearchQuery && (
          <div className="relative max-w-lg mx-auto mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 py-3 text-base rounded-xl border-gray-300"
            />
          </div>
        )}

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !activeCategory
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() =>
                setActiveCategory(activeCategory === cat ? null : cat)
              }
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ groups */}
        {groupedFaqs.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            No questions match your search. Try a different term or{" "}
            <a
              href="mailto:Romeo@caberu.be"
              className="text-blue-600 hover:underline"
            >
              email us
            </a>
            .
          </p>
        )}

        <div className="space-y-10">
          {groupedFaqs.map((group) => (
            <div key={group.category}>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                {group.category}
              </h3>
              <Accordion type="single" collapsible className="space-y-3">
                {group.items.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`${group.category}-${index}`}
                    className="border border-gray-200 rounded-lg px-6 bg-white"
                  >
                    <AccordionTrigger className="text-left hover:no-underline py-5">
                      <span className="font-semibold text-gray-900 pr-4">
                        {faq.question}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 pb-5 leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <p className="text-gray-600 mb-4">Still have questions?</p>
          <a
            href="https://mail.google.com/mail/?view=cm&to=Romeo@caberu.be&su=Question%20About%20Caberu"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
          >
            Email us at Romeo@caberu.be →
          </a>
        </div>
      </div>
    </section>
  );
};
