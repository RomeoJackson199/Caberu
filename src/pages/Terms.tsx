import { Card } from "@/components/ui/card";
import { Scale, Users, Shield, AlertCircle, Mail } from "lucide-react";

const Terms = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-blue-100">
            <Scale className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Terms of Service</h1>
          <p className="text-gray-600">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Important Notice */}
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <p className="text-gray-800 leading-relaxed">
                <strong>Please read these Terms of Service carefully.</strong> By accessing or using Caberu,
                you agree to be bound by these terms. If you disagree with any part of these terms, you may
                not access the service.
              </p>
            </div>
          </div>
        </Card>

        {/* Introduction */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">1. Agreement to Terms</h2>
          <p className="text-gray-700 leading-relaxed">
            These Terms of Service ("Terms") govern your access to and use of Caberu's website, mobile application,
            and services (collectively, the "Service"). Caberu ("we," "us," or "our") provides a dental practice
            management platform designed for dental professionals and their patients.
          </p>
          <p className="text-gray-700 leading-relaxed">
            By creating an account or using our Service, you agree to these Terms, our Privacy Policy, and any additional
            terms that apply to specific features of the Service.
          </p>
        </section>

        {/* Eligibility */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            2. Eligibility
          </h2>
          <p className="text-gray-700 leading-relaxed">
            You must be at least 18 years old to use our Service. By using the Service, you represent and warrant that:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>You are at least 18 years of age</li>
            <li>You have the legal capacity to enter into these Terms</li>
            <li>You will provide accurate and complete information during registration</li>
            <li>You will not use the Service for any illegal or unauthorized purpose</li>
            <li>Your use of the Service will comply with all applicable laws and regulations</li>
          </ul>
        </section>

        {/* User Accounts */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">3. User Accounts</h2>

          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-gray-800">3.1 Account Creation</h3>
            <p className="text-gray-700 leading-relaxed">
              To access certain features of the Service, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your password</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-gray-800">3.2 Account Types</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Patient Accounts</h4>
                <p className="text-gray-700 text-sm">
                  For individuals seeking dental care. Patients can book appointments, view records,
                  and communicate with dental providers.
                </p>
              </Card>
              <Card className="p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Provider Accounts</h4>
                <p className="text-gray-700 text-sm">
                  For licensed dental professionals. Providers can manage patients, appointments,
                  billing, and practice operations.
                </p>
              </Card>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-gray-800">3.3 Account Termination</h3>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to suspend or terminate your account if you violate these Terms or engage in
              activities that could harm our Service or other users.
            </p>
          </div>
        </section>

        {/* Use of Service */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">4. Use of the Service</h2>

          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-gray-800">4.1 Permitted Uses</h3>
            <p className="text-gray-700 leading-relaxed">You may use the Service to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Schedule and manage dental appointments</li>
              <li>Store and access dental health records (with proper authorization)</li>
              <li>Communicate with dental care providers</li>
              <li>Process payments for dental services</li>
              <li>Manage dental practice operations (for providers)</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-gray-800">4.2 Prohibited Uses</h3>
            <p className="text-gray-700 leading-relaxed">You agree NOT to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon the rights of others</li>
              <li>Transmit harmful code (viruses, malware, etc.)</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>Use the Service for any fraudulent purpose</li>
              <li>Impersonate any person or entity</li>
              <li>Collect or store personal data of other users without authorization</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Use automated means to access the Service without permission</li>
            </ul>
          </div>
        </section>

        {/* Medical Disclaimer */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            5. Medical Disclaimer
          </h2>
          <Card className="p-6 bg-red-50 border-red-200">
            <p className="text-gray-800 leading-relaxed mb-3">
              <strong>Important:</strong> Caberu is a practice management platform, not a medical advice service.
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>The Service does not provide medical or dental advice, diagnosis, or treatment</li>
              <li>AI features are for informational purposes only and should not replace professional judgment</li>
              <li>Always seek the advice of qualified health providers with questions about medical conditions</li>
              <li>Never disregard professional medical advice or delay seeking it based on Service content</li>
              <li>In case of a medical emergency, call emergency services immediately</li>
            </ul>
          </Card>
        </section>

        {/* Intellectual Property */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">6. Intellectual Property</h2>

          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-gray-800">6.1 Our IP</h3>
            <p className="text-gray-700 leading-relaxed">
              The Service, including its source code, databases, functionality, software, website designs, audio,
              video, text, photographs, and graphics (collectively, "Content") are owned by Caberu and are
              protected by copyright, trademark, and other intellectual property laws.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-gray-800">6.2 Your Data</h3>
            <p className="text-gray-700 leading-relaxed">
              You retain ownership of all data you submit to the Service ("User Data"). By submitting User Data,
              you grant us a license to use, store, and process it solely to provide the Service to you.
            </p>
          </div>
        </section>

        {/* Fees and Payment */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">7. Pricing and Payment</h2>

          <h3 className="text-lg font-semibold">Current Pricing (as of December 2025)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 text-left">Plan</th>
                  <th className="border p-3 text-left">Price</th>
                  <th className="border p-3 text-left">Patients/Month</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-3 font-medium">Starter</td>
                  <td className="border p-3">€249/month</td>
                  <td className="border p-3">Up to 500</td>
                </tr>
                <tr>
                  <td className="border p-3 font-medium">Professional</td>
                  <td className="border p-3">€499/month</td>
                  <td className="border p-3">Up to 2,500</td>
                </tr>
                <tr>
                  <td className="border p-3 font-medium">Enterprise</td>
                  <td className="border p-3">€999/month</td>
                  <td className="border p-3">Up to 7,500</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500">Prices exclude VAT.</p>

          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>14-day money-back guarantee</strong> for first-time customers (EU Consumer Rights)</li>
            <li>Billed monthly in advance; cancel anytime</li>
            <li>30 days notice for price changes</li>
            <li>€25 late payment fee applies after 15 days</li>
          </ul>
        </section>

        {/* Data and Privacy */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">8. Data Protection and Privacy</h2>
          <p className="text-gray-700 leading-relaxed">
            Your use of the Service is also governed by our <a href="/privacy" className="text-blue-600 hover:underline font-semibold">Privacy Policy</a>.
            We comply with <strong>GDPR</strong> and other applicable EU data protection regulations.
          </p>
          <p className="text-gray-700 leading-relaxed">
            By using the Service, you agree to our <strong>Data Processing Agreement</strong> (DPA), which governs how we process patient health data on your behalf (GDPR Article 28).
          </p>
        </section>

        {/* Limitation of Liability */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">9. Limitation of Liability</h2>
          <p className="text-gray-700 leading-relaxed">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND</li>
            <li>WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED OR ERROR-FREE</li>
            <li>WE ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES</li>
            <li>OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS</li>
          </ul>
        </section>

        {/* Indemnification */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">10. Indemnification</h2>
          <p className="text-gray-700 leading-relaxed">
            You agree to indemnify and hold harmless Caberu and its officers, directors, employees, and agents
            from any claims, damages, losses, liabilities, and expenses arising from:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Your use of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any rights of another party</li>
            <li>Any User Data you submit</li>
          </ul>
        </section>

        {/* Changes to Terms */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">11. Changes to Terms</h2>
          <p className="text-gray-700 leading-relaxed">
            We reserve the right to modify these Terms at any time. We will notify you of significant changes by:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Posting the updated Terms on our website</li>
            <li>Updating the "Last Updated" date</li>
            <li>Sending you an email notification (for material changes)</li>
          </ul>
          <p className="text-gray-700 leading-relaxed">
            Continued use of the Service after changes constitutes acceptance of the updated Terms.
          </p>
        </section>

        {/* Governing Law */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">12. Governing Law and Disputes</h2>
          <p className="text-gray-700 leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of <strong>Belgium</strong>.
            Courts of Belgium have exclusive jurisdiction.
          </p>
          <p className="text-gray-700 leading-relaxed">
            <strong>EU Online Dispute Resolution:</strong> <a href="https://ec.europa.eu/consumers/odr" className="text-blue-600 hover:underline">https://ec.europa.eu/consumers/odr</a>
          </p>
        </section>

        {/* Severability */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">13. Severability</h2>
          <p className="text-gray-700 leading-relaxed">
            If any provision of these Terms is found to be unenforceable, the remaining provisions will remain
            in full force and effect.
          </p>
        </section>

        {/* Contact */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="h-6 w-6 text-blue-600" />
            14. Contact Information
          </h2>
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="space-y-2 text-gray-700">
              <p><strong>Caberu SRL</strong></p>
              <p>Hertogenweg 20, Belgium</p>
              <p className="mt-2">Email: <a href="mailto:Romeo@caberu.be" className="text-blue-600 hover:underline">Romeo@caberu.be</a></p>
              <p>Website: <a href="https://caberu.be" className="text-blue-600 hover:underline">https://caberu.be</a></p>
            </div>
          </Card>
        </section>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pt-8 border-t">
          <p>© {new Date().getFullYear()} Caberu. All rights reserved.</p>
          <p className="mt-2">
            By using Caberu, you agree to these Terms of Service and our{" "}
            <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Terms;
