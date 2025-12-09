import { Card } from "@/components/ui/card";
import { Shield, FileText, Globe, Bell, Eye, Users, Database, Lock } from "lucide-react";
import { Header } from "@/components/homepage/Header";
import { Footer } from "@/components/homepage/Footer";
import { Link } from "react-router-dom";

const DataProcessingAgreement = () => {
    return (
        <div className="min-h-screen bg-background">
            <Header user={null} minimal />

            <main className="max-w-4xl mx-auto px-4 py-12 space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex p-3 rounded-full bg-purple-100">
                        <FileText className="h-10 w-10 text-purple-600" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900">Data Processing Agreement</h1>
                    <p className="text-gray-600">
                        GDPR Article 28 Compliance | Version 1.0 | Effective: December 9, 2025
                    </p>
                </div>

                {/* Introduction */}
                <section className="space-y-4">
                    <p className="text-gray-700 leading-relaxed">
                        This Data Processing Agreement ("DPA") forms part of the Terms of Service between
                        <strong> Caberu SRL</strong> ("Processor") and the dental practice ("Controller")
                        using Caberu's services to process patient health data.
                    </p>

                    <Card className="p-4 bg-blue-50 border-blue-200">
                        <p className="text-sm text-gray-700">
                            <strong>Purpose:</strong> This DPA ensures GDPR compliance when Caberu processes
                            patient health data (special category data under Article 9) on behalf of dental practices.
                        </p>
                    </Card>
                </section>

                {/* 1. Definitions */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900">1. Definitions</h2>
                    <ul className="space-y-2 text-gray-700 text-sm">
                        <li><strong>"Controller"</strong> – The dental practice using Caberu to manage patient data</li>
                        <li><strong>"Processor"</strong> – Caberu SRL, processing data on behalf of the Controller</li>
                        <li><strong>"Personal Data"</strong> – Any data relating to an identified or identifiable natural person</li>
                        <li><strong>"Special Category Data"</strong> – Health data requiring explicit consent (GDPR Art. 9)</li>
                        <li><strong>"Sub-processor"</strong> – Third parties engaged by Processor to process data</li>
                    </ul>
                </section>

                {/* 2. Scope of Processing */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Database className="h-6 w-6 text-purple-600" />
                        2. Scope of Processing
                    </h2>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border p-3 text-left">Category</th>
                                    <th className="border p-3 text-left">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border p-3 font-medium">Subject Matter</td>
                                    <td className="border p-3">Dental practice management software</td>
                                </tr>
                                <tr>
                                    <td className="border p-3 font-medium">Duration</td>
                                    <td className="border p-3">Duration of service agreement + 30 days</td>
                                </tr>
                                <tr>
                                    <td className="border p-3 font-medium">Nature & Purpose</td>
                                    <td className="border p-3">Storage, retrieval, and display of patient health records, appointment scheduling, billing</td>
                                </tr>
                                <tr>
                                    <td className="border p-3 font-medium">Data Categories</td>
                                    <td className="border p-3">Patient names, contact info, health records, treatment history, prescriptions, X-rays</td>
                                </tr>
                                <tr>
                                    <td className="border p-3 font-medium">Data Subjects</td>
                                    <td className="border p-3">Patients of the dental practice</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 3. Processor Obligations */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Lock className="h-6 w-6 text-purple-600" />
                        3. Processor Obligations (GDPR Article 28(3))
                    </h2>

                    <div className="space-y-3">
                        {[
                            { title: "a) Documented Instructions", desc: "Process data only on documented instructions from the Controller" },
                            { title: "b) Confidentiality", desc: "Ensure all personnel processing data are bound by confidentiality obligations" },
                            { title: "c) Security Measures", desc: "Implement appropriate technical and organizational security measures (see Section 5)" },
                            { title: "d) Sub-processing", desc: "Only engage sub-processors with prior written consent (see Section 4)" },
                            { title: "e) Data Subject Rights", desc: "Assist Controller in responding to data subject requests (access, rectification, erasure)" },
                            { title: "f) Breach Notification", desc: "Notify Controller of data breaches without undue delay (max 48 hours)" },
                            { title: "g) Data Deletion", desc: "Delete or return all personal data upon termination of services" },
                            { title: "h) Audits", desc: "Make available all information necessary to demonstrate compliance and allow for audits" },
                        ].map((item, i) => (
                            <Card key={i} className="p-4">
                                <h4 className="font-semibold text-sm">{item.title}</h4>
                                <p className="text-sm text-gray-600">{item.desc}</p>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* 4. Sub-processors */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="h-6 w-6 text-purple-600" />
                        4. Authorized Sub-processors
                    </h2>

                    <p className="text-sm text-gray-600 mb-4">
                        The Controller authorizes the use of the following sub-processors:
                    </p>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border p-3 text-left">Sub-processor</th>
                                    <th className="border p-3 text-left">Purpose</th>
                                    <th className="border p-3 text-left">Location</th>
                                    <th className="border p-3 text-left">Safeguards</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border p-3 font-medium">Supabase Inc.</td>
                                    <td className="border p-3">Database hosting, authentication</td>
                                    <td className="border p-3">🇪🇺 EU (Frankfurt)</td>
                                    <td className="border p-3">SOC 2 Type II, GDPR DPA</td>
                                </tr>
                                <tr>
                                    <td className="border p-3 font-medium">Stripe Inc.</td>
                                    <td className="border p-3">Payment processing</td>
                                    <td className="border p-3">🇪🇺 EU</td>
                                    <td className="border p-3">PCI-DSS Level 1, SCCs</td>
                                </tr>
                                <tr>
                                    <td className="border p-3 font-medium">Google LLC</td>
                                    <td className="border p-3">Analytics (anonymized)</td>
                                    <td className="border p-3">🇪🇺 EU / 🇺🇸 US</td>
                                    <td className="border p-3">SCCs, IP anonymization</td>
                                </tr>
                                <tr>
                                    <td className="border p-3 font-medium">Resend Inc.</td>
                                    <td className="border p-3">Transactional emails</td>
                                    <td className="border p-3">🇺🇸 US</td>
                                    <td className="border p-3">SCCs, GDPR compliant</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <p className="text-xs text-gray-500">
                        We will notify the Controller of any intended changes to sub-processors with 30 days advance notice.
                    </p>
                </section>

                {/* 5. Security Measures */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="h-6 w-6 text-purple-600" />
                        5. Technical & Organizational Measures
                    </h2>

                    <div className="grid md:grid-cols-2 gap-4">
                        <Card className="p-4">
                            <h4 className="font-semibold mb-2">🔐 Encryption</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• TLS 1.3 for data in transit</li>
                                <li>• AES-256 for data at rest</li>
                                <li>• Bcrypt password hashing</li>
                            </ul>
                        </Card>
                        <Card className="p-4">
                            <h4 className="font-semibold mb-2">🔑 Access Control</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• Row Level Security (RLS)</li>
                                <li>• Role-based access control</li>
                                <li>• Multi-factor authentication</li>
                            </ul>
                        </Card>
                        <Card className="p-4">
                            <h4 className="font-semibold mb-2">🔄 Availability</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• 99.9% uptime SLA</li>
                                <li>• Daily encrypted backups</li>
                                <li>• Disaster recovery plan</li>
                            </ul>
                        </Card>
                        <Card className="p-4">
                            <h4 className="font-semibold mb-2">📋 Audit</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• Comprehensive audit logging</li>
                                <li>• Access monitoring</li>
                                <li>• Regular security reviews</li>
                            </ul>
                        </Card>
                    </div>
                </section>

                {/* 6. International Transfers */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Globe className="h-6 w-6 text-purple-600" />
                        6. International Data Transfers
                    </h2>
                    <p className="text-gray-700 leading-relaxed">
                        All primary patient data is stored within the <strong>European Union</strong> (Supabase EU region).
                        Where transfers outside the EU occur (e.g., Google Analytics), they are protected by:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                        <li>EU Standard Contractual Clauses (SCCs)</li>
                        <li>Additional technical measures (IP anonymization, encryption)</li>
                        <li>Data minimization principles</li>
                    </ul>
                </section>

                {/* 7. Data Breach Notification */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Bell className="h-6 w-6 text-purple-600" />
                        7. Data Breach Notification
                    </h2>
                    <Card className="p-4 bg-orange-50 border-orange-200">
                        <p className="text-sm text-gray-700">
                            <strong>Processor Commitment:</strong> In case of a personal data breach,
                            Caberu will notify the Controller within <strong>48 hours</strong> of becoming aware,
                            providing:
                        </p>
                        <ul className="list-disc list-inside text-sm text-gray-700 mt-2 space-y-1">
                            <li>Nature of the breach</li>
                            <li>Categories and approximate number of data subjects affected</li>
                            <li>Likely consequences</li>
                            <li>Measures taken to address the breach</li>
                        </ul>
                    </Card>
                </section>

                {/* 8. Audit Rights */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Eye className="h-6 w-6 text-purple-600" />
                        8. Audit Rights
                    </h2>
                    <p className="text-gray-700 leading-relaxed text-sm">
                        The Controller may conduct audits (or appoint an independent auditor) to verify compliance
                        with this DPA. Audits must be arranged with reasonable notice (minimum 30 days) and may
                        not disrupt normal business operations.
                    </p>
                </section>

                {/* 9. Termination */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900">9. Termination & Data Return</h2>
                    <p className="text-gray-700 leading-relaxed text-sm">
                        Upon termination of services, Caberu will (at Controller's choice):
                    </p>
                    <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                        <li>Return all personal data in a portable format (JSON/CSV)</li>
                        <li>Delete all personal data and certify deletion in writing</li>
                        <li>Data will be deleted within 30 days unless legal retention applies</li>
                    </ul>
                </section>

                {/* Contact */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900">10. Contact</h2>
                    <Card className="p-6 bg-purple-50 border-purple-200">
                        <p className="text-sm text-gray-700">
                            <strong>Caberu SRL</strong><br />
                            Hertogenweg 20, Belgium<br />
                            Data Protection Contact: <a href="mailto:Romeo@caberu.be" className="text-purple-600 hover:underline">Romeo@caberu.be</a>
                        </p>
                    </Card>
                </section>

                {/* Footer */}
                <div className="text-center text-sm text-gray-500 pt-8 border-t">
                    <p>© {new Date().getFullYear()} Caberu SRL. All rights reserved.</p>
                    <p className="mt-2">
                        <Link to="/privacy" className="text-purple-600 hover:underline">Privacy Policy</Link>
                        {" • "}
                        <Link to="/terms" className="text-purple-600 hover:underline">Terms of Service</Link>
                        {" • "}
                        <Link to="/" className="text-purple-600 hover:underline">Home</Link>
                    </p>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default DataProcessingAgreement;
