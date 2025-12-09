import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";
import { Link } from "react-router-dom";

interface CookiePreferences {
    essential: boolean; // Always true, cannot be disabled
    analytics: boolean;
    timestamp: string;
}

const COOKIE_CONSENT_KEY = "caberu_cookie_consent";

/**
 * Global Cookie Consent Banner
 * Displays on first visit and allows users to accept/decline analytics cookies
 * Essential cookies are always enabled (required for the service)
 */
export const CookieConsentBanner = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

    useEffect(() => {
        // Check if consent has already been given
        const existingConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
        if (!existingConsent) {
            // Show banner after a short delay for better UX
            const timer = setTimeout(() => setIsVisible(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const saveConsent = (preferences: CookiePreferences) => {
        localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(preferences));

        // Update Google Analytics consent if available
        if (typeof window !== "undefined" && (window as any).gtag) {
            (window as any).gtag("consent", "update", {
                analytics_storage: preferences.analytics ? "granted" : "denied",
            });
        }

        setIsVisible(false);
    };

    const handleAcceptAll = () => {
        saveConsent({
            essential: true,
            analytics: true,
            timestamp: new Date().toISOString(),
        });
    };

    const handleAcceptEssential = () => {
        saveConsent({
            essential: true,
            analytics: false,
            timestamp: new Date().toISOString(),
        });
    };

    const handleSavePreferences = () => {
        saveConsent({
            essential: true,
            analytics: analyticsEnabled,
            timestamp: new Date().toISOString(),
        });
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white/95 backdrop-blur-sm border-t shadow-lg animate-in slide-in-from-bottom">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-start gap-4">
                    <Cookie className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />

                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">🍪 Cookie Preferences</h3>

                        {!showDetails ? (
                            <>
                                <p className="text-sm text-gray-600 mb-4">
                                    We use cookies to enhance your experience. Essential cookies are required for the service to function.
                                    Analytics cookies help us improve Caberu.{" "}
                                    <Link to="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                                </p>

                                <div className="flex flex-wrap gap-2">
                                    <Button onClick={handleAcceptAll} size="sm">
                                        Accept All
                                    </Button>
                                    <Button onClick={handleAcceptEssential} variant="outline" size="sm">
                                        Essential Only
                                    </Button>
                                    <Button
                                        onClick={() => setShowDetails(true)}
                                        variant="ghost"
                                        size="sm"
                                    >
                                        Manage Preferences
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-3 mb-4">
                                    {/* Essential Cookies */}
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div>
                                            <p className="font-medium text-sm">Essential Cookies</p>
                                            <p className="text-xs text-gray-500">Required for authentication and security</p>
                                        </div>
                                        <span className="text-xs text-green-600 font-medium">Always On</span>
                                    </div>

                                    {/* Analytics Cookies */}
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div>
                                            <p className="font-medium text-sm">Analytics Cookies</p>
                                            <p className="text-xs text-gray-500">Help us improve Caberu (Google Analytics)</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={analyticsEnabled}
                                                onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button onClick={handleSavePreferences} size="sm">
                                        Save Preferences
                                    </Button>
                                    <Button
                                        onClick={() => setShowDetails(false)}
                                        variant="ghost"
                                        size="sm"
                                    >
                                        Back
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0"
                        onClick={handleAcceptEssential}
                        title="Close (accept essential only)"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

/**
 * Hook to check if analytics cookies are enabled
 */
export const useAnalyticsCookiesEnabled = (): boolean => {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
        if (consent) {
            try {
                const parsed = JSON.parse(consent) as CookiePreferences;
                setEnabled(parsed.analytics);
            } catch {
                setEnabled(false);
            }
        }
    }, []);

    return enabled;
};

export default CookieConsentBanner;
