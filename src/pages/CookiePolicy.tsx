import { Card } from "@/components/ui/card";
import { Cookie, Shield, BarChart, Target, Settings } from "lucide-react";
import { Header } from "@/components/homepage/Header";
import { Footer } from "@/components/homepage/Footer";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CookiePolicy = () => {
  const handleWithdrawConsent = () => {
    // Clear consent
    localStorage.removeItem('cookie-consent');
    localStorage.removeItem('analytics_consent');

    // Reload page to show banner again
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={null} minimal />

      <main className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-blue-100">
            <Cookie className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Cookie Policy</h1>
          <p className="text-gray-600">
            Effective Date: February 11, 2026 | Last Updated: February 11, 2026
          </p>
        </div>

        {/* Introduction */}
        <section className="space-y-4">
          <p className="text-gray-700 leading-relaxed">
            This Cookie Policy explains how Caberu SRL ("we", "us", or "our") uses cookies and similar
            tracking technologies on our website <a href="https://caberu.be" className="text-blue-600 hover:underline">https://caberu.be</a>.
          </p>
          <p className="text-gray-700 leading-relaxed">
            We respect your privacy and are committed to being transparent about the cookies we use.
            You have full control over which cookies you accept.
          </p>
        </section>

        {/* What are Cookies */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">What Are Cookies?</h2>
          <p className="text-gray-700 leading-relaxed">
            Cookies are small text files that are stored on your device (computer, tablet, or mobile)
            when you visit a website. They help websites remember your preferences and improve your
            browsing experience.
          </p>
        </section>

        {/* Cookies We Use */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Cookies We Use</h2>

          {/* Essential Cookies */}
          <Card className="p-6 border-green-200 bg-green-50">
            <div className="flex items-start gap-4">
              <Shield className="h-8 w-8 text-green-600 flex-shrink-0" />
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-900">1. Essential Cookies (Always Active)</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  These cookies are necessary for the website to function and cannot be disabled.
                  They enable basic features like secure login, session management, and page navigation.
                </p>

                <div className="mt-4 space-y-3">
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <div className="font-semibold text-gray-800 mb-2">sb-auth-token</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Purpose:</strong> User authentication and session management</p>
                      <p><strong>Duration:</strong> Session (deleted when browser closes)</p>
                      <p><strong>Provider:</strong> Supabase (our authentication provider)</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <div className="font-semibold text-gray-800 mb-2">cookie-consent</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Purpose:</strong> Stores your cookie preferences</p>
                      <p><strong>Duration:</strong> 1 year</p>
                      <p><strong>Provider:</strong> Caberu</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <div className="font-semibold text-gray-800 mb-2">theme</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Purpose:</strong> Remembers your light/dark mode preference</p>
                      <p><strong>Duration:</strong> Persistent</p>
                      <p><strong>Provider:</strong> Caberu</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Analytics Cookies */}
          <Card className="p-6 border-blue-200 bg-blue-50">
            <div className="flex items-start gap-4">
              <BarChart className="h-8 w-8 text-blue-600 flex-shrink-0" />
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-900">2. Analytics Cookies (Optional)</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  These cookies help us understand how visitors interact with our website by collecting
                  information anonymously. They help us improve our service and fix bugs.
                </p>

                <div className="mt-4 space-y-3">
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <div className="font-semibold text-gray-800 mb-2">_ga</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Purpose:</strong> Distinguishes unique users for Google Analytics</p>
                      <p><strong>Duration:</strong> 2 years</p>
                      <p><strong>Provider:</strong> Google Analytics</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <div className="font-semibold text-gray-800 mb-2">_gid</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Purpose:</strong> Distinguishes users for Google Analytics</p>
                      <p><strong>Duration:</strong> 24 hours</p>
                      <p><strong>Provider:</strong> Google Analytics</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <div className="font-semibold text-gray-800 mb-2">_ga_[container-id]</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Purpose:</strong> Persists session state for Google Analytics 4</p>
                      <p><strong>Duration:</strong> 2 years</p>
                      <p><strong>Provider:</strong> Google Analytics 4</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-300">
                  <p className="text-sm text-gray-700">
                    <strong>Note:</strong> We use IP anonymization for all analytics cookies to protect your privacy.
                    No personally identifiable information is collected through analytics.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Marketing Cookies */}
          <Card className="p-6 border-purple-200 bg-purple-50">
            <div className="flex items-start gap-4">
              <Target className="h-8 w-8 text-purple-600 flex-shrink-0" />
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-900">3. Marketing Cookies (Optional)</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  These cookies track visitors across websites to display relevant advertisements.
                  Currently, we do not use marketing cookies. This section is reserved for future use.
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* How to Control Cookies */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-600" />
            How to Control Cookies
          </h2>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Withdraw Your Consent</h3>
            <p className="text-gray-700 text-sm mb-4">
              You can change your cookie preferences at any time by clicking the button below.
              This will clear your current preferences and show the cookie banner again.
            </p>
            <Button onClick={handleWithdrawConsent} variant="outline">
              Change Cookie Preferences
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Browser Settings</h3>
            <p className="text-gray-700 text-sm mb-3">
              You can also control cookies through your browser settings:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
              <li>
                <strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data
              </li>
              <li>
                <strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data
              </li>
              <li>
                <strong>Safari:</strong> Preferences → Privacy → Cookies and website data
              </li>
              <li>
                <strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and site data
              </li>
            </ul>
            <p className="text-sm text-gray-600 mt-3">
              Note: Blocking essential cookies may prevent parts of the website from functioning properly.
            </p>
          </Card>
        </section>

        {/* Third-Party Services */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Third-Party Services</h2>
          <p className="text-gray-700 leading-relaxed">
            We use the following third-party services that may set cookies:
          </p>
          <Card className="p-6">
            <ul className="space-y-3 text-sm text-gray-700">
              <li>
                <strong>Google Analytics 4:</strong> Website traffic analysis and user behavior insights
                <div className="ml-4 mt-1 text-xs text-gray-600">
                  Privacy policy: <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</a>
                </div>
              </li>
              <li>
                <strong>Google Tag Manager:</strong> Tag management system for analytics
                <div className="ml-4 mt-1 text-xs text-gray-600">
                  Privacy policy: <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</a>
                </div>
              </li>
              <li>
                <strong>Supabase:</strong> Backend services including authentication and database
                <div className="ml-4 mt-1 text-xs text-gray-600">
                  Privacy policy: <a href="https://supabase.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://supabase.com/privacy</a>
                </div>
              </li>
            </ul>
          </Card>
        </section>

        {/* Updates to This Policy */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Updates to This Policy</h2>
          <p className="text-gray-700 leading-relaxed">
            We may update this Cookie Policy from time to time to reflect changes in our practices
            or for legal reasons. The "Last Updated" date at the top will show when changes were made.
          </p>
        </section>

        {/* Contact */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Contact Us</h2>
          <Card className="p-6 bg-gray-50">
            <p className="text-gray-700 mb-3">
              If you have questions about this Cookie Policy or our use of cookies, please contact us:
            </p>
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>Caberu SRL</strong></p>
              <p>Hertogenweg 20, Belgium</p>
              <p>Email: <a href="mailto:Romeo@caberu.be" className="text-blue-600 hover:underline">Romeo@caberu.be</a></p>
            </div>
          </Card>
        </section>

        {/* Related Policies */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Related Policies</h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/privacy">
              <Button variant="outline" size="sm">Privacy Policy</Button>
            </Link>
            <Link to="/terms">
              <Button variant="outline" size="sm">Terms of Service</Button>
            </Link>
            <Link to="/dpa">
              <Button variant="outline" size="sm">Data Processing Agreement</Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CookiePolicy;
