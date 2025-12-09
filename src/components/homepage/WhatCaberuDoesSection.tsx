import { CheckCircle2, Zap, Shield, Globe } from "lucide-react";
import { motion } from "framer-motion";

export const WhatCaberuDoesSection = () => {
    return (
        <section className="py-24 bg-slate-900 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <h2 className="text-4xl font-bold text-white mb-6">
                            The All-in-One Operating System for Modern Dentistry
                        </h2>
                        <p className="text-xl text-gray-300 leading-relaxed">
                            Caberu replaces fragmented tools with a single, intelligent platform. From AI reception to clinical records, we handle the busywork so you can focus on patient care.
                        </p>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {/* Feature 1 */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-800/50 border border-slate-700 hover:shadow-lg hover:bg-slate-800/70 transition-all duration-300"
                    >
                        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 text-blue-400">
                            <Zap className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-4">Automate Operations</h3>
                        <p className="text-gray-300">
                            Our AI handles phone calls, scheduling, and reminders 24/7. Reduce administrative overhead by 60% and never miss a patient inquiry.
                        </p>
                    </motion.div>

                    {/* Feature 2 */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-800/50 border border-slate-700 hover:shadow-lg hover:bg-slate-800/70 transition-all duration-300"
                    >
                        <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-6 text-purple-400">
                            <Shield className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-4">Secure & Compliant</h3>
                        <p className="text-gray-300">
                            Enterprise-grade security with GDPR compliance, security audits, and 256-bit encryption. Your patient data is safe with us.
                        </p>
                    </motion.div>

                    {/* Feature 3 */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-800/50 border border-slate-700 hover:shadow-lg hover:bg-slate-800/70 transition-all duration-300"
                    >
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-6 text-green-400">
                            <Globe className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-4">Grow Your Practice</h3>
                        <p className="text-gray-300">
                            Integrated marketing tools, reputation management, and analytics help you attract more patients and retain them for life.
                        </p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};
