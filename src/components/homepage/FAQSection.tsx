import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useEffect } from "react";

const faqs = [
  {
    question: "How does the AI phone reception actually work?",
    answer: "Our AI uses advanced natural language processing to understand patient requests in real-time. It can handle appointment bookings, answer common questions, identify emergencies, and collect patient information - all while sounding natural and professional. The AI integrates directly with your calendar and practice management system."
  },
  {
    question: "What happens if the AI can't handle a call?",
    answer: "The AI is designed to handle 95%+ of routine calls, but if it encounters a complex situation, it can seamlessly transfer to your staff with full context of the conversation. You maintain complete control and can set custom escalation rules for specific scenarios."
  },
  {
    question: "Is it HIPAA compliant?",
    answer: "Yes, absolutely. Caberu is fully HIPAA compliant with enterprise-grade encryption, secure data storage, and comprehensive audit logs. We sign BAAs (Business Associate Agreements) with all customers and undergo regular security audits."
  },
  {
    question: "How long does implementation take?",
    answer: "Most practices are up and running within 48 hours. Our team handles the setup including calendar integration, AI training on your services, and staff onboarding. You'll have a dedicated implementation specialist throughout the process."
  },
  {
    question: "Can it integrate with my existing practice management software?",
    answer: "Yes! Caberu integrates with major dental practice management systems including Dentrix, Eaglesoft, Open Dental, Curve, and many others. We also offer API access for custom integrations."
  },
  {
    question: "What if patients prefer talking to a real person?",
    answer: "Our AI is so natural that most patients can't tell the difference - in fact, many prefer it because there's no hold time. However, patients can always request to speak with staff, and the AI will transfer them immediately with full conversation context."
  },
  {
    question: "How much does Caberu cost?",
    answer: "Pricing starts at $249/month for solo practices with unlimited calls and appointments. We offer scaled pricing for multi-location practices. Most practices save $3,000-5,000/month compared to traditional staffing while capturing 40-50% more appointments."
  },
  {
    question: "What languages does the AI support?",
    answer: "Currently, our AI supports English and Spanish fluently. We're actively developing support for additional languages based on customer demand. The AI can detect the caller's language and switch automatically."
  },
  {
    question: "Can I customize what the AI says?",
    answer: "Absolutely! You have full control over the AI's scripts, greetings, and responses. You can customize how it handles different scenarios, what information it collects, and even its personality to match your practice's brand."
  },
  {
    question: "Is there a contract or can I cancel anytime?",
    answer: "No long-term contracts required. We offer month-to-month plans with a 14-day free trial. You can cancel anytime with 30 days notice. We're confident you'll see the value immediately."
  }
];

export const FAQSection = () => {
  // Add FAQ schema to page head
  useEffect(() => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    script.id = 'faq-schema';
    document.head.appendChild(script);

    return () => {
      const existingScript = document.getElementById('faq-schema');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600">
            Everything you need to know about Caberu's AI reception
          </p>
        </div>

        <div>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
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

        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            Still have questions?
          </p>
          <a
            href="mailto:Romeo@caberu.be"
            className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
          >
            Contact our team →
          </a>
        </div>
      </div>
    </section>
  );
};
