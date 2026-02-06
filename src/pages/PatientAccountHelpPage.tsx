import { Mail, HelpCircle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";

export default function PatientAccountHelpPage() {
  const { t } = useLanguage();

  const gmailComposeUrl =
    "https://mail.google.com/mail/?view=cm&to=Romeo@caberu.be&su=Patient%20Support%20Request%20-%20Caberu";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <HelpCircle className="h-5 w-5" /> {t.pnav.account.help}
      </h1>

      {/* Contact Support */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900 mb-1">
                {t.contactSupport}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Send us an email and we'll get back to you within 24 hours.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href={gmailComposeUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm">
                    <Mail className="h-4 w-4 mr-2" />
                    Email via Gmail
                  </Button>
                </a>
                <a href="mailto:Romeo@caberu.be">
                  <Button variant="outline" size="sm">
                    Romeo@caberu.be
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Link */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-purple-100 rounded-lg">
              <HelpCircle className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900 mb-1">
                Frequently Asked Questions
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Find answers about appointments, billing, privacy, and more.
              </p>
              <Link to="/faq">
                <Button variant="outline" size="sm">
                  View FAQ
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Policy Link */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Learn how we protect your data
            </p>
            <Link to="/privacy">
              <Button variant="ghost" size="sm" className="text-blue-600">
                {t.privacyPolicyLink}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
