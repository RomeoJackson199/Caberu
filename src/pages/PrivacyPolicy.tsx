import { AiDisclaimer } from "@/components/AiDisclaimer";
import { Card } from "@/components/ui/card";
import { Shield, Lock, Eye, FileText, Mail, Calendar } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-blue-100">
            <Shield className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-gray-600">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Important Notice */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <p className="text-gray-800 leading-relaxed">
            <strong>Important:</strong> If you are entering data for a patient under 16 years of age, you confirm
            that you are their parent or legal guardian and that you consent to the processing of their personal data
            as described in this policy.
          </p>
        </Card>

        {/* Introduction */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">1. Introduction</h2>
          <p className="text-gray-700 leading-relaxed">
            Caberu ("we", "our", or "us") is committed to protecting your privacy and personal information. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your information when you use our dental practice management
            platform. We comply with the General Data Protection Regulation (GDPR), Health Insurance Portability and Accountability
            Act (HIPAA), and other applicable data protection laws.
          </p>
        </section>

        {/* What Data We Collect */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            2. Information We Collect
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">2.1 Personal Information</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li><strong>Identity data:</strong> Full name, date of birth, gender</li>
                <li><strong>Contact data:</strong> Email address, phone number, mailing address</li>
                <li><strong>Account data:</strong> Username, password (encrypted), security questions</li>
                <li><strong>Financial data:</strong> Payment information, billing address, insurance details</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">2.2 Health Information (PHI)</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Medical and dental history</li>
                <li>Treatment records and clinical notes</li>
                <li>Prescriptions and medication information</li>
                <li>X-rays, photographs, and other medical images</li>
                <li>Appointment history and future appointments</li>
                <li>Insurance and health plan information</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">2.3 Technical Data</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>IP address, browser type, and version</li>
                <li>Device information and operating system</li>
                <li>Time zone settings and location data</li>
                <li>Usage data (pages visited, features used, time spent)</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </div>
          </div>
        </section>

        {/* How We Use Data */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">3. How We Use Your Information</h2>
          <p className="text-gray-700 leading-relaxed">We use your information for the following purposes:</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Healthcare Services
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm ml-2">
                <li>Schedule and manage appointments</li>
                <li>Provide dental treatment and care</li>
                <li>Send appointment reminders</li>
                <li>Maintain medical records</li>
              </ul>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Lock className="h-5 w-5 text-blue-600" />
                Platform Operations
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm ml-2">
                <li>Create and manage user accounts</li>
                <li>Process payments and billing</li>
                <li>Provide customer support</li>
                <li>Improve platform features</li>
              </ul>
            </Card>
          </div>
        </section>

        {/* Data Access */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Eye className="h-6 w-6 text-blue-600" />
            4. Who Can Access Your Data
          </h2>
          <p className="text-gray-700 leading-relaxed">
            Your personal and health information is accessible only to authorized parties:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>Your dental provider:</strong> The dentist(s) and clinic staff you have authorized to view your records</li>
            <li><strong>Platform administrators:</strong> Our technical staff, only for system maintenance and support purposes</li>
            <li><strong>Service providers:</strong> Trusted third parties who assist in operating our platform (e.g., hosting providers, payment processors)</li>
            <li><strong>Legal authorities:</strong> When required by law or to protect rights and safety</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-4">
            We <strong>never</strong> sell your personal or health information to third parties.
          </p>
        </section>

        {/* Data Storage */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">5. How We Store and Protect Your Data</h2>
          <div className="space-y-3">
            <p className="text-gray-700 leading-relaxed">
              <strong>Storage Location:</strong> All data is stored on secure, GDPR-compliant servers with data centers
              in the EU and US, ensuring compliance with European data protection requirements.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Encryption:</strong> We use industry-standard encryption (AES-256) for data at rest and TLS 1.3 for data in transit.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Access Controls:</strong> Role-based access control (RBAC) ensures only authorized personnel can access sensitive data.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Backups:</strong> Regular automated backups are performed and encrypted, with a 30-day retention period.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Security Monitoring:</strong> 24/7 monitoring for suspicious activity, regular security audits, and penetration testing.
            </p>
          </div>
        </section>

        {/* Your Rights */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">6. Your Privacy Rights</h2>
          <p className="text-gray-700 leading-relaxed">Under GDPR and other privacy laws, you have the following rights:</p>

          <div className="space-y-3">
            <Card className="p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-1">Right to Access</h3>
              <p className="text-gray-700 text-sm">Request a copy of all personal data we hold about you</p>
            </Card>

            <Card className="p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-1">Right to Rectification</h3>
              <p className="text-gray-700 text-sm">Request correction of inaccurate or incomplete data</p>
            </Card>

            <Card className="p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-1">Right to Erasure ("Right to be Forgotten")</h3>
              <p className="text-gray-700 text-sm">Request deletion of your personal data (subject to legal obligations)</p>
            </Card>

            <Card className="p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-1">Right to Data Portability</h3>
              <p className="text-gray-700 text-sm">Receive your data in a structured, machine-readable format</p>
            </Card>

            <Card className="p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-1">Right to Object</h3>
              <p className="text-gray-700 text-sm">Object to processing of your personal data for specific purposes</p>
            </Card>

            <Card className="p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-1">Right to Restrict Processing</h3>
              <p className="text-gray-700 text-sm">Request limitation of processing in certain circumstances</p>
            </Card>
          </div>

          <p className="text-gray-700 leading-relaxed mt-4">
            To exercise any of these rights, please contact us at <strong>privacy@Caberu.com</strong>.
            We will respond within 30 days.
          </p>
        </section>

        {/* Legal Basis */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">7. Legal Basis for Processing</h2>
          <p className="text-gray-700 leading-relaxed">We process your data based on:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>Explicit consent:</strong> You provide consent when creating an account and during registration</li>
            <li><strong>Contract fulfillment:</strong> Processing necessary to provide healthcare services you requested</li>
            <li><strong>Legal obligation:</strong> Compliance with healthcare regulations and record-keeping requirements</li>
            <li><strong>Legitimate interests:</strong> Platform improvement, fraud prevention, and security</li>
          </ul>
        </section>

        {/* Data Retention */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">8. Data Retention</h2>
          <p className="text-gray-700 leading-relaxed">
            <strong>Active accounts:</strong> We retain your data for as long as your account is active or as needed to provide services.
          </p>
          <p className="text-gray-700 leading-relaxed">
            <strong>Inactive accounts:</strong> Patient data from inactive accounts (no activity for 24 months) will be deleted
            unless the dental practice has a legal obligation to retain medical records for a longer period (typically 7-10 years
            depending on local healthcare regulations).
          </p>
          <p className="text-gray-700 leading-relaxed">
            <strong>Deleted accounts:</strong> Upon account deletion, we will delete or anonymize your personal data within 90 days,
            except where retention is required by law.
          </p>
        </section>

        {/* Cookies */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">9. Cookies and Tracking</h2>
          <p className="text-gray-700 leading-relaxed">
            We use cookies and similar technologies to enhance your experience. You can manage cookie preferences through
            our cookie consent banner. Essential cookies are required for platform functionality and cannot be disabled.
          </p>
        </section>

        {/* International Transfers */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">10. International Data Transfers</h2>
          <p className="text-gray-700 leading-relaxed">
            Your data may be transferred to and processed in countries outside your country of residence. We ensure appropriate
            safeguards are in place, including Standard Contractual Clauses (SCCs) approved by the European Commission.
          </p>
        </section>

        {/* Children's Privacy */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">11. Children's Privacy</h2>
          <p className="text-gray-700 leading-relaxed">
            We do not knowingly collect personal information from children under 16 without parental consent. If you are a parent
            or guardian and believe your child has provided us with personal information without consent, please contact us immediately.
          </p>
        </section>

        {/* Changes to Policy */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">12. Changes to This Policy</h2>
          <p className="text-gray-700 leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of significant changes by email or through
            a prominent notice on our platform. Continued use of the platform after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        {/* Contact */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="h-6 w-6 text-blue-600" />
            13. Contact Us
          </h2>
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="space-y-2 text-gray-700">
              <p><strong>For privacy-related inquiries or to exercise your rights:</strong></p>
              <p>Email: <a href="mailto:privacy@Caberu.com" className="text-blue-600 hover:underline">privacy@Caberu.com</a></p>
              <p>Data Protection Officer: dpo@Caberu.com</p>
              <p className="mt-4"><strong>For general support:</strong></p>
              <p>Email: <a href="mailto:support@Caberu.com" className="text-blue-600 hover:underline">support@Caberu.com</a></p>
            </div>
          </Card>
        </section>

        {/* AI Disclaimer */}
        <AiDisclaimer />

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pt-8 border-t">
          <p>© {new Date().getFullYear()} Caberu. All rights reserved.</p>
          <p className="mt-2">
            This privacy policy is effective as of the date listed above and supersedes all previous versions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
