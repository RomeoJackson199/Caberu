import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { handleAnalyticsConsent } from "@/lib/googleAnalytics";

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface CookieConsentProps {
  isAuthenticated?: boolean;
}

function Toggle({
  on,
  onChange,
  label,
  emoji,
  desc,
}: {
  on: boolean;
  onChange: ((val: boolean) => void) | null;
  label: string;
  emoji: string;
  desc: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        background: on ? "#eff6ff" : "#f9fafb",
        borderRadius: 14,
        border: `2px solid ${on ? "#bfdbfe" : "#e5e7eb"}`,
        transition: "all 0.2s",
        cursor: onChange ? "pointer" : "default",
      }}
      onClick={onChange ? () => onChange(!on) : undefined}
    >
      <div style={{ fontSize: 28 }}>{emoji}</div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#1e3a5f",
            fontFamily: "Georgia, serif",
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{desc}</div>
      </div>
      <div
        style={{
          width: 44,
          height: 24,
          borderRadius: 99,
          background: on
            ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
            : "#d1d5db",
          position: "relative",
          transition: "background 0.25s",
          flexShrink: 0,
          boxShadow: on ? "0 2px 8px rgba(59,130,246,0.4)" : "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 3,
            left: on ? 23 : 3,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "white",
            transition: "left 0.25s",
            boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
          }}
        />
      </div>
    </div>
  );
}

export function CookieConsent({ isAuthenticated = false }: CookieConsentProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [view, setView] = useState<"banner" | "customize">("banner");
  const [analytics, setAnalytics] = useState(true);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    } else {
      try {
        const savedPreferences: CookiePreferences = JSON.parse(consent);
        setAnalytics(savedPreferences.analytics);
      } catch (error) {
        logger.error("Failed to parse cookie preferences:", error);
      }
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem("cookie-consent", JSON.stringify(prefs));
    setShowBanner(false);
    setAccepted(true);

    import("@/lib/analytics")
      .then(({ analytics: analyticsModule }) => {
        analyticsModule.setConsent(prefs.analytics);
      })
      .catch(() => {
        // Analytics module not available
      });

    handleAnalyticsConsent(prefs.analytics, prefs.marketing);
    localStorage.setItem("analytics_consent", prefs.analytics.toString());

    setTimeout(() => setAccepted(false), 4000);
  };

  const acceptAll = () => {
    savePreferences({ necessary: true, analytics: true, marketing: true });
  };

  const handleSave = () => {
    savePreferences({ necessary: true, analytics, marketing: false });
  };

  if (!showBanner && !accepted) return null;

  return (
    <>
      <style>{`
        @keyframes slideUp { from { opacity:0; transform: translateX(-50%) translateY(40px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }
        @keyframes wiggle { 0%,100%{transform:rotate(-5deg)} 50%{transform:rotate(5deg)} }
        @keyframes popIn { from { opacity:0; transform: translateX(-50%) scale(0.92); } to { opacity:1; transform: translateX(-50%) scale(1); } }
        .caberu-cookie-accept-btn:hover { transform: scale(1.04) !important; }
        .caberu-cookie-grey-btn:hover { background: #f3f4f6 !important; }
      `}</style>

      {/* Main Banner */}
      {showBanner && view === "banner" && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "white",
            borderRadius: 24,
            padding: "28px 32px",
            maxWidth: 440,
            width: "90%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            zIndex: 1000,
            border: "3px solid #bfdbfe",
            animation: "slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div
              style={{
                fontSize: 48,
                animation: "wiggle 1.2s ease-in-out infinite",
                display: "inline-block",
              }}
            >
              🍪
            </div>
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#1e3a5f",
                  fontFamily: "Georgia, serif",
                }}
              >
                Time for a check-up… on cookies!
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "#6b7280",
                  marginTop: 8,
                  lineHeight: 1.6,
                }}
              >
                We use cookies to keep Caberu running smoothly — no sugar, no
                calories, and doctor-approved. 🩺 They help us remember your
                preferences and improve your experience.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <button
              className="caberu-cookie-accept-btn"
              onClick={acceptAll}
              style={{
                flex: 1,
                background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                color: "white",
                border: "none",
                borderRadius: 12,
                padding: "13px 0",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                transition: "transform 0.15s",
                boxShadow: "0 4px 14px rgba(59,130,246,0.4)",
              }}
            >
              Accept All
            </button>
            <button
              className="caberu-cookie-grey-btn"
              onClick={() => setView("customize")}
              style={{
                flex: 1,
                background: "white",
                color: "#6b7280",
                border: "2px solid #e5e7eb",
                borderRadius: 12,
                padding: "13px 0",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
            >
              Customize ⚙️
            </button>
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#9ca3af",
              marginTop: 12,
              textAlign: "center",
            }}
          >
            By accepting, you agree to our{" "}
            <a
              href="/cookies"
              style={{ textDecoration: "underline", cursor: "pointer", color: "inherit" }}
            >
              Cookie Policy
            </a>{" "}
            · Caberu Healthcare Solutions
          </div>
        </div>
      )}

      {/* Customize Panel */}
      {showBanner && view === "customize" && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "white",
            borderRadius: 24,
            padding: "28px 32px",
            maxWidth: 460,
            width: "90%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
            zIndex: 1000,
            border: "3px solid #bfdbfe",
            animation: "popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 6,
            }}
          >
            <button
              onClick={() => setView("banner")}
              style={{
                background: "#eff6ff",
                border: "none",
                borderRadius: 8,
                width: 30,
                height: 30,
                fontSize: 16,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ←
            </button>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#1e3a5f",
                fontFamily: "Georgia, serif",
              }}
            >
              Your cookie prescription 📋
            </div>
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#9ca3af",
              marginBottom: 20,
              paddingLeft: 42,
            }}
          >
            Pick what you're comfortable with — we won't judge!
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Toggle
              on={true}
              onChange={null}
              emoji="🏥"
              label="Essential (always on)"
              desc="Keeps the platform alive. Non-negotiable, like washing your hands."
            />
            <Toggle
              on={analytics}
              onChange={setAnalytics}
              emoji="📊"
              label="Analytics"
              desc="Helps us see what's working — totally anonymous, no sneaky stuff."
            />
          </div>

          <button
            className="caberu-cookie-accept-btn"
            onClick={handleSave}
            style={{
              width: "100%",
              marginTop: 20,
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              color: "white",
              border: "none",
              borderRadius: 12,
              padding: "14px 0",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              transition: "transform 0.15s",
              boxShadow: "0 4px 14px rgba(59,130,246,0.4)",
            }}
          >
            Save my prescription 💊
          </button>
          <div
            style={{
              fontSize: 11,
              color: "#9ca3af",
              marginTop: 12,
              textAlign: "center",
            }}
          >
            <a
              href="/cookies"
              style={{ textDecoration: "underline", cursor: "pointer", color: "inherit" }}
            >
              Cookie Policy
            </a>{" "}
            · Caberu Healthcare Solutions
          </div>
        </div>
      )}

      {/* Confirmation Toast */}
      {accepted && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1e3a5f",
            color: "white",
            borderRadius: 99,
            padding: "12px 24px",
            fontSize: 15,
            fontWeight: 700,
            zIndex: 1000,
          }}
        >
          ✅ Cookie preferences saved — you're all set!
        </div>
      )}
    </>
  );
}
