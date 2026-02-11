import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Cookie, Shield, Settings } from "lucide-react";
import { logger } from "@/lib/logger";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface CookieConsentProps {
  isAuthenticated?: boolean;
}

export function CookieConsent({ isAuthenticated = false }: CookieConsentProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always true, can't be disabled
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Only show banner if user is authenticated
    if (!isAuthenticated) {
      return;
    }

    // Check if user has already consented
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      // Show banner after a short delay
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    } else {
      // Load saved preferences
      try {
        const savedPreferences = JSON.parse(consent);
        setPreferences(savedPreferences);
      } catch (error) {
        logger.error("Failed to parse cookie preferences:", error);
      }
    }
  }, [isAuthenticated]);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem("cookie-consent", JSON.stringify(prefs));
    setShowBanner(false);
    setShowSettings(false);

    // Update analytics consent using the analytics manager
    import('@/lib/analytics').then(({ analytics }) => {
      analytics.setConsent(prefs.analytics);
    }).catch(() => {
      // Analytics module not available
    });

    // Update Google Analytics consent mode (if gtag is available)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        'analytics_storage': prefs.analytics ? 'granted' : 'denied',
        'ad_storage': prefs.marketing ? 'granted' : 'denied',
        'ad_user_data': prefs.marketing ? 'granted' : 'denied',
        'ad_personalization': prefs.marketing ? 'granted' : 'denied',
      });
    }

    // Also update localStorage key that analytics.ts checks
    localStorage.setItem('analytics_consent', prefs.analytics.toString());
  };

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    savePreferences(allAccepted);
  };

  const acceptNecessary = () => {
    const necessaryOnly = {
      necessary: true,
      analytics: false,
      marketing: false,
    };
    savePreferences(necessaryOnly);
  };

  const saveCustomPreferences = () => {
    savePreferences(preferences);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
        <Card className="max-w-5xl mx-auto p-6 shadow-2xl border-2 bg-white/95 backdrop-blur-sm">
          <button
            onClick={() => setShowBanner(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close cookie banner"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="p-3 rounded-full bg-blue-100">
                <Cookie className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                We Value Your Privacy
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                We use cookies to enhance your browsing experience, provide personalized content,
                and analyze our traffic. We also share information about your use of our site with
                our analytics partners. By clicking "Accept All", you consent to our use of cookies.{" "}
                <a
                  href="/privacy"
                  className="text-blue-600 hover:text-blue-700 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Learn more
                </a>
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Customize
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={acceptNecessary}
              >
                Necessary Only
              </Button>
              <Button
                size="sm"
                onClick={acceptAll}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Accept All
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Cookie Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Cookie Preferences
            </DialogTitle>
            <DialogDescription>
              Manage your cookie preferences. You can enable or disable different types of cookies below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Necessary Cookies */}
            <div className="space-y-3 pb-4 border-b">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <Label className="text-base font-semibold">
                    Necessary Cookies
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    These cookies are essential for the website to function properly.
                    They enable basic functions like page navigation and access to secure areas.
                    The website cannot function properly without these cookies.
                  </p>
                </div>
                <Switch
                  checked={preferences.necessary}
                  disabled
                  className="mt-1"
                />
              </div>
              <p className="text-xs text-gray-500 italic">
                Always enabled - Required for site functionality
              </p>
            </div>

            {/* Analytics Cookies */}
            <div className="space-y-3 pb-4 border-b">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <Label htmlFor="analytics" className="text-base font-semibold cursor-pointer">
                    Analytics Cookies
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    These cookies help us understand how visitors interact with our website by
                    collecting and reporting information anonymously. This helps us improve our
                    website and provide better service.
                  </p>
                </div>
                <Switch
                  id="analytics"
                  checked={preferences.analytics}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, analytics: checked })
                  }
                  className="mt-1"
                />
              </div>
            </div>

            {/* Marketing Cookies */}
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <Label htmlFor="marketing" className="text-base font-semibold cursor-pointer">
                    Marketing Cookies
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    These cookies are used to track visitors across websites to display
                    relevant advertisements. They also help measure the effectiveness of
                    advertising campaigns.
                  </p>
                </div>
                <Switch
                  id="marketing"
                  checked={preferences.marketing}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, marketing: checked })
                  }
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={acceptNecessary}
              className="w-full sm:w-auto"
            >
              Reject All
            </Button>
            <Button
              onClick={saveCustomPreferences}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              Save Preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
