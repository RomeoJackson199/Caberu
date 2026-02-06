import { Header } from "@/components/homepage/Header";
import { Footer } from "@/components/homepage/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Mail, HelpCircle, Clock, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const Support = () => {
  const gmailComposeUrl =
    "https://mail.google.com/mail/?view=cm&to=Romeo@caberu.be&su=Support%20Request%20-%20Caberu";

  return (
    <div className="min-h-screen bg-white">
      <Header user={null} minimal={false} />

      <main className="pt-20">
        {/* Hero */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 mb-6">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
                How Can We Help?
              </h1>
              <p className="text-xl text-gray-600 max-w-xl mx-auto">
                Reach out to us directly and we'll get back to you as soon as
                possible.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Email Contact Card */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-gray-200 rounded-2xl p-8 sm:p-10 shadow-sm"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Send Us an Email
              </h2>
              <p className="text-gray-600 mb-8">
                Whether you have a question about your account, need help with a
                feature, or want to report an issue — just send us a message.
              </p>

              <div className="space-y-6">
                {/* Gmail button */}
                <a
                  href={gmailComposeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button size="lg" className="w-full text-base py-6">
                    <Mail className="w-5 h-5 mr-2" />
                    Email Us via Gmail
                  </Button>
                </a>

                {/* Or use any email client */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-gray-500">
                      or use any email client
                    </span>
                  </div>
                </div>

                <a
                  href="mailto:Romeo@caberu.be"
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-center font-medium"
                >
                  Romeo@caberu.be
                </a>
              </div>

              {/* Response time */}
              <div className="mt-8 flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    We typically respond within 24 hours
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Monday – Friday, 9:00 AM – 6:00 PM CET
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* FAQ Link */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white border border-gray-200 rounded-2xl p-8 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <HelpCircle className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Check Our FAQ
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Find quick answers to common questions about Caberu.
                  </p>
                </div>
              </div>
              <Link to="/faq">
                <Button variant="outline" className="flex-shrink-0">
                  View FAQ
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Support;
