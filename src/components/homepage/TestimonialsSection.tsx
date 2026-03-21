import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";

interface Testimonial {
  name: string;
  role: string;
  practice: string;
  content: string;
}

const testimonials: Testimonial[] = [
  {
    name: "Early Adopter",
    role: "Practice Owner",
    practice: "Healthcare Practice",
    content:
      "We switched to Caberu to streamline our scheduling and patient records. The setup was straightforward and the team has been responsive to our feedback as we get everything dialed in.",
  },
  {
    name: "Early Adopter",
    role: "Practitioner",
    practice: "Private Practice",
    content:
      "Having everything in one place — appointments, notes, billing — has cut down on the admin work after each patient. It's still early days but the workflow improvements are already noticeable.",
  },
];

export const TestimonialsSection = () => {
  return (
    <section className="py-24 md:py-32 px-5 sm:px-8 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2
            className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            What our early adopters say
          </h2>
          <p className="text-slate-500 text-lg">
            We're working closely with healthcare practices to build the tool they actually need
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.blockquote
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="border-l-2 border-blue-200 pl-6"
            >
              <p className="text-slate-600 leading-relaxed mb-6 text-[15px]">"{t.content}"</p>
              <footer className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">
                    {t.role} · {t.practice}
                  </p>
                </div>
              </footer>
            </motion.blockquote>
          ))}
        </div>

        <div className="mt-14 text-center">
          <a
            href="https://mail.google.com/mail/?view=cm&to=Romeo@caberu.be&su=Early%20Access%20Request%20-%20Caberu"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"
          >
            Currently onboarding healthcare practices —{" "}
            <span className="font-semibold text-blue-600">get early access →</span>
          </a>
        </div>
      </div>
    </section>
  );
};
