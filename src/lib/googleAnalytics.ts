/**
 * Google Analytics & Google Tag Manager - GDPR Compliant Dynamic Loader
 *
 * This module handles the dynamic loading of GA/GTM ONLY after user consent.
 * It also provides functions to remove analytics cookies when consent is withdrawn.
 */

// Google Analytics and GTM configuration
const GA_MEASUREMENT_ID = 'G-9LGVN77ZBR';
const GTM_CONTAINER_ID = 'GTM-523X3ZCD';

// Track if analytics scripts have been loaded
let analyticsLoaded = false;
let gtmLoaded = false;

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

/**
 * Initialize dataLayer and gtag function if not already present
 */
function initializeDataLayer() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function() {
    window.dataLayer.push(arguments);
  };
}

/**
 * Update Google Consent Mode
 */
export function updateGoogleConsentMode(analyticsEnabled: boolean, marketingEnabled: boolean = false) {
  initializeDataLayer();

  window.gtag('consent', 'update', {
    'analytics_storage': analyticsEnabled ? 'granted' : 'denied',
    'ad_storage': marketingEnabled ? 'granted' : 'denied',
    'ad_user_data': marketingEnabled ? 'granted' : 'denied',
    'ad_personalization': marketingEnabled ? 'granted' : 'denied',
  });
}

/**
 * Load Google Analytics (GA4) dynamically
 */
export function loadGoogleAnalytics(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (analyticsLoaded) {
      resolve();
      return;
    }

    try {
      initializeDataLayer();

      // Create and inject GA4 script
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;

      script.onload = () => {
        // Configure GA4
        window.gtag('js', new Date());
        window.gtag('config', GA_MEASUREMENT_ID, {
          'anonymize_ip': true, // IP anonymization for GDPR
          'allow_google_signals': false, // Disable Google signals by default
        });

        analyticsLoaded = true;
        console.debug('[Analytics] Google Analytics loaded successfully');
        resolve();
      };

      script.onerror = () => {
        console.error('[Analytics] Failed to load Google Analytics');
        reject(new Error('Failed to load Google Analytics'));
      };

      document.head.appendChild(script);
    } catch (error) {
      console.error('[Analytics] Error loading Google Analytics:', error);
      reject(error);
    }
  });
}

/**
 * Load Google Tag Manager (GTM) dynamically
 */
export function loadGoogleTagManager(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (gtmLoaded) {
      resolve();
      return;
    }

    try {
      initializeDataLayer();

      // Push GTM start event
      window.dataLayer.push({
        'gtm.start': new Date().getTime(),
        event: 'gtm.js'
      });

      // Create and inject GTM script
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`;

      script.onload = () => {
        gtmLoaded = true;
        console.debug('[Analytics] Google Tag Manager loaded successfully');
        resolve();
      };

      script.onerror = () => {
        console.error('[Analytics] Failed to load Google Tag Manager');
        reject(new Error('Failed to load Google Tag Manager'));
      };

      const firstScript = document.getElementsByTagName('script')[0];
      firstScript?.parentNode?.insertBefore(script, firstScript);
    } catch (error) {
      console.error('[Analytics] Error loading Google Tag Manager:', error);
      reject(error);
    }
  });
}

/**
 * Load all analytics scripts (GA + GTM)
 */
export async function loadAnalytics(): Promise<void> {
  try {
    await Promise.all([
      loadGoogleAnalytics(),
      loadGoogleTagManager(),
    ]);
    console.debug('[Analytics] All analytics scripts loaded');
  } catch (error) {
    console.error('[Analytics] Failed to load analytics:', error);
  }
}

/**
 * Remove all Google Analytics and GTM cookies
 * This is called when user rejects analytics or withdraws consent
 */
export function removeAnalyticsCookies() {
  const cookiesToRemove = [
    '_ga',
    '_ga_' + GA_MEASUREMENT_ID.replace('G-', ''),
    '_gid',
    '_gat',
    '_gat_gtag_' + GA_MEASUREMENT_ID.replace('-', '_'),
    '_gcl_au',
    '_gac_gb_' + GTM_CONTAINER_ID,
    '_dc_gtm_' + GTM_CONTAINER_ID.replace('-', '_'),
  ];

  // Remove cookies from all domains and paths
  const domains = [
    window.location.hostname,
    '.' + window.location.hostname,
    '.caberu.be',
    'caberu.be',
  ];

  const paths = ['/', '/fr', '/nl', '/en'];

  cookiesToRemove.forEach(cookieName => {
    domains.forEach(domain => {
      paths.forEach(path => {
        // Remove cookie
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${domain}; path=${path}`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
      });
    });

    // Also remove without domain specification
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });

  console.debug('[Analytics] Analytics cookies removed');
}

/**
 * Initialize analytics based on saved consent
 * This should be called once on app initialization
 */
export function initializeAnalyticsFromConsent() {
  try {
    // Check for saved consent
    const consentJson = localStorage.getItem('cookie-consent');
    const analyticsConsent = localStorage.getItem('analytics_consent');

    let shouldLoadAnalytics = false;

    if (consentJson) {
      try {
        const consent = JSON.parse(consentJson);
        shouldLoadAnalytics = consent.analytics === true;
      } catch (e) {
        console.error('[Analytics] Failed to parse cookie consent:', e);
      }
    } else if (analyticsConsent === 'true') {
      shouldLoadAnalytics = true;
    }

    if (shouldLoadAnalytics) {
      // Update consent mode to granted
      updateGoogleConsentMode(true, false);

      // Load analytics scripts after a short delay (non-blocking)
      setTimeout(() => {
        loadAnalytics().catch(console.error);
      }, 100);
    } else {
      // Ensure consent mode is denied (already set in index.html, but double-check)
      updateGoogleConsentMode(false, false);
    }
  } catch (error) {
    console.error('[Analytics] Error initializing analytics:', error);
  }
}

/**
 * Handle analytics consent change (accept or reject)
 */
export function handleAnalyticsConsent(analyticsEnabled: boolean, marketingEnabled: boolean = false) {
  // Update consent mode
  updateGoogleConsentMode(analyticsEnabled, marketingEnabled);

  if (analyticsEnabled) {
    // Load analytics if not already loaded
    if (!analyticsLoaded || !gtmLoaded) {
      loadAnalytics().catch(console.error);
    }
  } else {
    // Remove analytics cookies
    removeAnalyticsCookies();
  }
}

/**
 * Check if analytics scripts are loaded
 */
export function isAnalyticsLoaded(): boolean {
  return analyticsLoaded && gtmLoaded;
}
