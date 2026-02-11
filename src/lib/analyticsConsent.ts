const GTM_ID = 'GTM-523X3ZCD';
const GA_MEASUREMENT_ID = 'G-9LGVN77ZBR';
const GTM_SCRIPT_ID = 'caberu-gtm-script';
const GA_SCRIPT_ID = 'caberu-ga-script';

let analyticsLoaded = false;

const GA_COOKIE_PREFIXES = ['_ga', '_gid', '_gat', '_gcl', '_dc_gtm'];

function ensureGtag() {
  const win = window as typeof window & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [key: string]: unknown;
  };

  win.dataLayer = win.dataLayer || [];

  if (!win.gtag) {
    win.gtag = function gtag(...args: unknown[]) {
      win.dataLayer?.push(args);
    };
  }

  return win.gtag;
}

function injectScript(id: string, src: string, target: 'head' | 'body' = 'head') {
  if (document.getElementById(id)) {
    return;
  }

  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;

  if (target === 'body') {
    document.body.appendChild(script);
    return;
  }

  document.head.appendChild(script);
}

function deleteCookieAcrossDomains(name: string) {
  const hostParts = window.location.hostname.split('.');
  const domains = hostParts.map((_, index) => `.${hostParts.slice(index).join('.')}`);

  document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;

  domains.forEach((domain) => {
    document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}; Secure; SameSite=None`;
  });
}

export function removeAnalyticsCookies() {
  const existingCookieNames = document.cookie
    .split(';')
    .map((cookie) => cookie.trim().split('=')[0])
    .filter(Boolean);

  const trackedCookies = existingCookieNames.filter((name) =>
    GA_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix)),
  );

  trackedCookies.forEach(deleteCookieAcrossDomains);
}

export function disableAnalyticsTracking() {
  const win = window as typeof window & {
    gtag?: (...args: unknown[]) => void;
    [key: string]: unknown;
  };

  win[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
  win.gtag = () => undefined;
  analyticsLoaded = false;

  [GTM_SCRIPT_ID, GA_SCRIPT_ID].forEach((id) => {
    document.getElementById(id)?.remove();
  });

  removeAnalyticsCookies();
}

export function enableAnalyticsTracking() {
  if (analyticsLoaded) {
    return;
  }

  const win = window as typeof window & {
    [key: string]: unknown;
  };

  win[`ga-disable-${GA_MEASUREMENT_ID}`] = false;

  const gtag = ensureGtag();

  injectScript(GTM_SCRIPT_ID, `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`);
  injectScript(GA_SCRIPT_ID, `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`);

  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });

  analyticsLoaded = true;
}

export function applyAnalyticsConsent(hasConsent: boolean) {
  if (hasConsent) {
    enableAnalyticsTracking();
    return;
  }

  disableAnalyticsTracking();
}

export function getStoredAnalyticsConsent() {
  const savedPreferences = localStorage.getItem('cookie-consent');

  if (!savedPreferences) {
    return false;
  }

  try {
    const parsed = JSON.parse(savedPreferences) as { analytics?: boolean };
    return Boolean(parsed.analytics);
  } catch {
    return false;
  }
}
