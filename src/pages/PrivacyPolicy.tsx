import { Card } from "@/components/ui/card";
import { Shield, Lock, Eye, FileText, Mail, Users, Database, Globe, AlertTriangle, Bell } from "lucide-react";
import { Header } from "@/components/homepage/Header";
import { Footer } from "@/components/homepage/Footer";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header user={null} minimal />

      <main className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-blue-100">
            <Shield className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-gray-600">
            Effective Date: December 9, 2025 | Last Updated: December 9, 2025
          </p>
        </div>

        {/* 1. Who We Are */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">1. Who We Are</h2>
          <Card className="p-6 bg-gray-50">
            <p className="font-semibold mb-2">Caberu SRL</p>
            <p className="text-gray-700">Hertogenweg 20, Belgium</p>
            <p className="text-gray-700">Email: <a href="mailto:Romeo@caberu.be" className="text-blue-600 hover:underline">Romeo@caberu.be</a></p>
            <p className="text-gray-700">Website: <a href="https://caberu.be" className="text-blue-600 hover:underline">https://caberu.be</a></p>
          </Card>
          <p className="text-gray-700 leading-relaxed">
            Caberu provides an AI-powered dental practice management platform ("Service") for dental practices across the European Union.
          </p>
        </section>

        {/* 2. Our Role Under GDPR */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            2. Our Role Under GDPR
          </h2>
          <p className="text-gray-700 leading-relaxed">
            Caberu acts in <strong>two different roles</strong> depending on the data:
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">2.1 Data Controller</h3>
              <p className="text-sm text-gray-600 mb-2">(for Dental Practice Accounts)</p>
              <p className="text-gray-700 text-sm">
                When you (a dental practice) create an account with Caberu, <strong>we are the Data Controller</strong> for your business information (practice name, dentist accounts, contact details, billing information).
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">2.2 Data Processor</h3>
              <p className="text-sm text-gray-600 mb-2">(for Patient Health Data)</p>
              <p className="text-gray-700 text-sm">
                When you use Caberu to manage your patients' health records, <strong>you (the dental practice) are the Data Controller</strong> and <strong>we are the Data Processor</strong>. We process patient health data only on your behalf.
              </p>
            </Card>
          </div>
        </section>

        {/* 3. What Data We Collect */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            3. What Data We Collect
          </h2>

          <div className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">3.1 For Dental Practices (when you sign up)</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                <li>Practice name and business information</li>
                <li>Dentist names and professional credentials</li>
                <li>Contact information (email, phone, address)</li>
                <li>Billing and payment information</li>
                <li>Login credentials (email, encrypted password)</li>
              </ul>
            </Card>

            <Card className="p-6 border-orange-200 bg-orange-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">3.2 For Patients (Health Data - Special Category under GDPR Article 9)</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                <li>Personal information (name, date of birth, contact details)</li>
                <li>Dental medical history and conditions</li>
                <li>Treatment records and diagnoses</li>
                <li>Prescriptions and medications</li>
                <li>Appointment history</li>
                <li>Clinical notes and X-rays</li>
                <li>Insurance information</li>
              </ul>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">3.3 Technical Data (Collected Automatically)</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                <li>Device information (browser type, operating system)</li>
                <li>IP address and location data</li>
                <li>Pages visited and features used</li>
                <li>Session duration and cookies</li>
              </ul>
            </Card>
          </div>
        </section>

        {/* 4. Legal Basis for Processing */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Lock className="h-6 w-6 text-blue-600" />
            4. Legal Basis for Processing (GDPR Article 6 & 9)
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 text-left">Data Type</th>
                  <th className="border p-3 text-left">Legal Basis</th>
                  <th className="border p-3 text-left">GDPR Article</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-3 font-medium">Dental practice business data</td>
                  <td className="border p-3">Contract performance</td>
                  <td className="border p-3">Art. 6(1)(b)</td>
                </tr>
                <tr className="bg-orange-50">
                  <td className="border p-3 font-medium">Patient health data</td>
                  <td className="border p-3">Processing on behalf of Controller + Explicit consent</td>
                  <td className="border p-3">Art. 6(1)(b) + Art. 9(2)(a)</td>
                </tr>
                <tr>
                  <td className="border p-3 font-medium">Payment information</td>
                  <td className="border p-3">Contract + Legal obligation</td>
                  <td className="border p-3">Art. 6(1)(b) + Art. 6(1)(c)</td>
                </tr>
                <tr>
                  <td className="border p-3 font-medium">Analytics</td>
                  <td className="border p-3">Legitimate interest + Consent</td>
                  <td className="border p-3">Art. 6(1)(f) + Art. 6(1)(a)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <Card className="p-4 bg-orange-50 border-orange-200">
            <p className="text-sm text-gray-700">
              <strong>Special Note on Health Data:</strong> Health data is special category data under GDPR Article 9. We process it only with explicit consent from the patient AND on behalf of the dental practice (as their Data Processor).
            </p>
          </Card>
        </section>

        {/* 5. How We Use Your Data */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">5. How We Use Your Data</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6 bg-green-50 border-green-200">
              <h3 className="font-semibold text-green-800 mb-3">✅ We DO:</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>✓ Provide and maintain the Service</li>
                <li>✓ Create and manage dental practice accounts</li>
                <li>✓ Enable appointment scheduling</li>
                <li>✓ Store patient health records</li>
                <li>✓ Process payments and billing</li>
                <li>✓ Send appointment reminders</li>
                <li>✓ Provide customer support</li>
                <li>✓ Improve our Service</li>
                <li>✓ Comply with legal obligations</li>
              </ul>
            </Card>

            <Card className="p-6 bg-red-50 border-red-200">
              <h3 className="font-semibold text-red-800 mb-3">❌ We DO NOT:</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>✗ Sell your data to third parties</li>
                <li>✗ Use patient health data for marketing</li>
                <li>✗ Share data except as described</li>
              </ul>
            </Card>
          </div>
        </section>

        {/* 6. Data Sharing */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="h-6 w-6 text-blue-600" />
            6. Data Sharing and Disclosure
          </h2>

          <h3 className="text-lg font-semibold">6.1 Service Providers (Data Sub-Processors)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 text-left">Provider</th>
                  <th className="border p-3 text-left">Purpose</th>
                  <th className="border p-3 text-left">Location</th>
                  <th className="border p-3 text-left">Safeguards</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-3 font-medium">Supabase</td>
                  <td className="border p-3">Database & Auth</td>
                  <td className="border p-3">EU</td>
                  <td className="border p-3">GDPR compliant</td>
                </tr>
                <tr>
                  <td className="border p-3 font-medium">Google Analytics</td>
                  <td className="border p-3">Website analytics</td>
                  <td className="border p-3">EU & US</td>
                  <td className="border p-3">Anonymized IP</td>
                </tr>
                <tr>
                  <td className="border p-3 font-medium">Stripe</td>
                  <td className="border p-3">Payments</td>
                  <td className="border p-3">EU</td>
                  <td className="border p-3">PCI-DSS</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 7. International Transfers */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="h-6 w-6 text-blue-600" />
            7. International Data Transfers
          </h2>
          <p className="text-gray-700 leading-relaxed">
            <strong>All data is stored within the European Union</strong> (Supabase EU region). Google Analytics may transfer anonymized analytics data to the US, covered by Standard Contractual Clauses (SCCs) and IP anonymization.
          </p>
        </section>

        {/* 8. Data Security */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Lock className="h-6 w-6 text-blue-600" />
            8. Data Security
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">🔒 Encryption</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• TLS 1.3 in transit</li>
                <li>• AES-256 at rest</li>
                <li>• Bcrypt password hashing</li>
              </ul>
            </Card>
            <Card className="p-4">
              <h3 className="font-semibold mb-2">🔐 Access Controls</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Row Level Security</li>
                <li>• Multi-factor authentication</li>
                <li>• 15-minute session timeout</li>
              </ul>
            </Card>
          </div>
        </section>

        {/* 9. Data Retention */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">9. Data Retention</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 text-left">Data Type</th>
                  <th className="border p-3 text-left">Retention</th>
                  <th className="border p-3 text-left">Reason</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-3">Patient health records</td>
                  <td className="border p-3">30 years</td>
                  <td className="border p-3">Belgian medical records law</td>
                </tr>
                <tr>
                  <td className="border p-3">Practice accounts</td>
                  <td className="border p-3">Until deleted + 90 days</td>
                  <td className="border p-3">Service provision</td>
                </tr>
                <tr>
                  <td className="border p-3">Billing records</td>
                  <td className="border p-3">7 years</td>
                  <td className="border p-3">Tax laws</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 10. Your Rights */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Eye className="h-6 w-6 text-blue-600" />
            10. Your Rights Under GDPR
          </h2>

          <div className="grid md:grid-cols-2 gap-3">
            {[
              { right: "Right of Access", article: "Art. 15", desc: "Request a copy of your data" },
              { right: "Right to Rectification", article: "Art. 16", desc: "Correct inaccurate data" },
              { right: "Right to Erasure", article: "Art. 17", desc: "Request deletion of your data" },
              { right: "Right to Restrict Processing", article: "Art. 18", desc: "Limit how we use your data" },
              { right: "Right to Data Portability", article: "Art. 20", desc: "Receive data in JSON/CSV" },
              { right: "Right to Object", article: "Art. 21", desc: "Object to processing" },
              { right: "Right to Withdraw Consent", article: "Art. 7(3)", desc: "Withdraw consent anytime" },
            ].map((item, i) => (
              <Card key={i} className="p-4">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-sm">✅ {item.right}</h3>
                  <span className="text-xs text-gray-500">{item.article}</span>
                </div>
                <p className="text-xs text-gray-600">{item.desc}</p>
              </Card>
            ))}
          </div>

          <Card className="p-4 bg-blue-50 border-blue-200">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              How to Exercise Your Rights
            </h3>
            <p className="text-sm text-gray-700">
              Log into your account → Settings → Data & Privacy, or email <a href="mailto:Romeo@caberu.be" className="text-blue-600 hover:underline">Romeo@caberu.be</a> with "Data Request" in subject. We respond within <strong>30 days</strong>.
            </p>
          </Card>
        </section>

        {/* 11. Data Breach */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
            11. Data Breach Notification
          </h2>
          <p className="text-gray-700 leading-relaxed">
            In the event of a data breach, we will notify the <strong>Belgian Data Protection Authority within 72 hours</strong> (GDPR Art. 33) and affected individuals without undue delay if high risk (GDPR Art. 34).
          </p>
        </section>

        {/* 12. Contact */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="h-6 w-6 text-blue-600" />
            12. Contact & Complaints
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Data Protection Officer</h3>
              <p className="text-sm text-gray-700">
                Email: <a href="mailto:Romeo@caberu.be" className="text-blue-600 hover:underline">Romeo@caberu.be</a><br />
                Subject: "Data Protection Inquiry"
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-2">Complaints</h3>
              <p className="text-sm text-gray-700">
                Belgian Data Protection Authority (APD/GBA)<br />
                Rue de la Presse 35, 1000 Brussels<br />
                <a href="https://www.autoriteprotectiondonnees.be" className="text-blue-600 hover:underline">autoriteprotectiondonnees.be</a>
              </p>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pt-8 border-t">
          <p>© {new Date().getFullYear()} Caberu SRL. All rights reserved.</p>
          <p className="mt-2">
            <Link to="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
            {" • "}
            <Link to="/" className="text-blue-600 hover:underline">Home</Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
