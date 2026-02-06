import { Header } from "@/components/homepage/Header";
import { Footer } from "@/components/homepage/Footer";
import { FAQSection } from "@/components/homepage/FAQSection";
import { Input } from "@/components/ui/input";
import { Search, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

const FAQ = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-white">
      <Header user={null} minimal={false} />

      <main className="pt-20">
        {/* Hero with Search */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 tracking-tight"
            >
              Frequently Asked Questions
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-gray-600 mb-8"
            >
              Everything you need to know about Caberu
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative max-w-lg mx-auto"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 py-3 text-base rounded-xl border-gray-300 bg-white shadow-sm"
              />
            </motion.div>
          </div>
        </section>

        {/* FAQ Content */}
        <FAQSection externalSearchQuery={searchQuery || undefined} />

        {/* Contact CTA */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white border border-gray-200 rounded-2xl p-10 shadow-sm"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 mb-5">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Can't Find What You're Looking For?
              </h2>
              <p className="text-gray-600 mb-6">
                Send us a message and we'll get back to you within 24 hours.
              </p>
              <a
                href="https://mail.google.com/mail/?view=cm&to=Romeo@caberu.be&su=Question%20About%20Caberu"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                <Mail className="w-4 h-4" />
                Email Romeo@caberu.be
              </a>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;
