import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Centralized SEO configuration per route
const seoMap: Record<string, { title: string; description: string; structuredData?: object }>
  = {
  "/": {
    title: "Caberu — AI-Powered Dental Practice Management Software",
    description: "Complete dental practice management platform with AI-powered scheduling, patient records, billing, and inventory tracking. HIPAA-compliant solution for modern dental practices.",
    structuredData: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://caberu.be/#organization",
          name: "Caberu",
          url: "https://caberu.be",
          logo: {
            "@type": "ImageObject",
            url: "https://caberu.be/lovable-uploads/bd9069b9-f5b0-427d-8acb-8b6a25ccba24.png"
          },
          description: "AI-powered dental practice management software for modern dental professionals",
          sameAs: [
            "https://twitter.com/caberu_be"
          ],
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "Customer Support",
            availableLanguage: ["English"]
          }
        },
        {
          "@type": "WebSite",
          "@id": "https://caberu.be/#website",
          url: "https://caberu.be",
          name: "Caberu",
          description: "Complete Dental Practice Management Platform",
          publisher: {
            "@id": "https://caberu.be/#organization"
          },
          potentialAction: {
            "@type": "SearchAction",
            target: "https://caberu.be/?s={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        },
        {
          "@type": "SoftwareApplication",
          name: "Caberu",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web Browser",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "EUR"
          },
          description: "AI-powered dental practice management software with scheduling, patient records, billing, and inventory management"
        },
        {
          "@type": "MedicalBusiness",
          "@id": "https://caberu.be/#medicalbusiness",
          name: "Caberu - Dental Practice Management Software",
          description: "HIPAA-compliant dental practice management software trusted by dental professionals worldwide",
          url: "https://caberu.be",
          logo: {
            "@type": "ImageObject",
            url: "https://caberu.be/lovable-uploads/bd9069b9-f5b0-427d-8acb-8b6a25ccba24.png"
          },
          medicalSpecialty: "Dentistry",
          priceRange: "$$",
          sameAs: [
            "https://twitter.com/caberu_be"
          ]
        },
        {
          "@type": "Service",
          "@id": "https://caberu.be/#service",
          serviceType: "Dental Practice Management Software",
          provider: {
            "@id": "https://caberu.be/#organization"
          },
          areaServed: "Worldwide",
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Dental Practice Management Services",
            itemListElement: [
              {
                "@type": "OfferCatalog",
                name: "Appointment Scheduling",
                itemListElement: [
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "AI-Powered Appointment Scheduling",
                      description: "Smart scheduling system with automated booking, reminders, and calendar management"
                    }
                  }
                ]
              },
              {
                "@type": "OfferCatalog",
                name: "Patient Management",
                itemListElement: [
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "Electronic Health Records",
                      description: "Secure, HIPAA-compliant patient records and history management"
                    }
                  }
                ]
              },
              {
                "@type": "OfferCatalog",
                name: "Practice Analytics",
                itemListElement: [
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "Practice Performance Analytics",
                      description: "Real-time insights, KPIs, and revenue tracking for dental practices"
                    }
                  }
                ]
              }
            ]
          }
        }
      ]
    }
  },
  "/about": {
    title: "About Caberu — Modern Dental Practice Management Software",
    description: "Learn about Caberu's mission to transform dental practice management with AI-powered scheduling, patient care, and practice optimization tools. Founded in 2024 by Romeo Jackson and Thomas Iordache.",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      mainEntity: {
        "@type": "Organization",
        "@id": "https://caberu.be/#organization",
        name: "Caberu",
        alternateName: "Caberu SRL",
        url: "https://caberu.be",
        logo: {
          "@type": "ImageObject",
          url: "https://caberu.be/lovable-uploads/bd9069b9-f5b0-427d-8acb-8b6a25ccba24.png"
        },
        description: "AI-powered dental practice management platform designed to help modern dental professionals reduce administrative burden and enhance patient care",
        foundingDate: "2024",
        founder: [
          {
            "@type": "Person",
            name: "Romeo Jackson",
            jobTitle: "Co-Founder & CEO"
          },
          {
            "@type": "Person",
            name: "Thomas Iordache",
            jobTitle: "Co-Founder & CTO"
          }
        ],
        areaServed: "Worldwide",
        sameAs: [
          "https://twitter.com/caberu_be"
        ],
        knowsAbout: [
          "Dental Practice Management",
          "Healthcare Software",
          "Artificial Intelligence",
          "HIPAA Compliance",
          "Patient Management",
          "Appointment Scheduling"
        ]
      }
    }
  },
  "/pricing": {
    title: "Pricing Plans — Affordable Dental Practice Management | Caberu",
    description: "Flexible pricing plans for dental practices of all sizes. Start free and scale as you grow. No hidden fees. HIPAA-compliant and secure.",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Caberu Dental Practice Management Software",
      description: "Complete dental practice management platform with AI-powered features",
      brand: {
        "@type": "Brand",
        name: "Caberu"
      },
      offers: [
        {
          "@type": "Offer",
          name: "Free Plan",
          price: "0",
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock"
        },
        {
          "@type": "Offer",
          name: "Professional Plan",
          price: "49",
          priceCurrency: "EUR",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "49",
            priceCurrency: "EUR",
            unitText: "MONTH"
          },
          availability: "https://schema.org/InStock"
        },
        {
          "@type": "Offer",
          name: "Enterprise Plan",
          price: "99",
          priceCurrency: "EUR",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "99",
            priceCurrency: "EUR",
            unitText: "MONTH"
          },
          availability: "https://schema.org/InStock"
        }
      ]
    }
  },
  "/dentists": {
    title: "Find Dentists — Browse Profiles, Reviews & Availability | Caberu",
    description: "Browse verified dentist profiles with ratings and real-time availability. Book appointments with the right dental expert for your needs.",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Find Dentists",
      description: "Browse verified dentist profiles with ratings and real-time availability",
      provider: {
        "@id": "https://caberu.be/#organization"
      },
      mainEntity: {
        "@type": "ItemList",
        name: "Dental Professionals Directory",
        description: "Verified dentists available for appointments",
        numberOfItems: "50+"
      }
    }
  },
  "/dashboard": {
    title: "Dashboard — Appointments, Tasks & Insights",
    description: "Manage appointments, patients, and tasks with real-time insights and secure records.",
  },
  "/support": {
    title: "Help & Support — FAQs, Documentation & Guides | Caberu",
    description: "Get help with Caberu dental practice management software. Find answers to common questions, tutorials, and comprehensive documentation.",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Is Caberu HIPAA compliant?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, Caberu is fully HIPAA compliant. We use industry-standard encryption, secure data storage, and follow all required healthcare data protection regulations."
          }
        },
        {
          "@type": "Question",
          name: "How does AI-powered scheduling work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Our AI analyzes patient needs, provider availability, and practice patterns to suggest optimal appointment times. It also helps with emergency triage and automated booking confirmations."
          }
        },
        {
          "@type": "Question",
          name: "Can I import my existing patient data?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, Caberu supports importing patient data from CSV files and integrates with many popular dental practice management systems for seamless data migration."
          }
        },
        {
          "@type": "Question",
          name: "What kind of support do you offer?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "We offer email support, comprehensive documentation, video tutorials, and live chat support for premium plans. Our team is dedicated to helping your practice succeed."
          }
        },
        {
          "@type": "Question",
          name: "Is there a free trial?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, we offer a free plan that includes basic features. You can upgrade to paid plans anytime to access advanced features like multi-provider support and advanced analytics."
          }
        }
      ]
    }
  },
  "/login": {
    title: "Login — Access Your Dental Practice Dashboard | Caberu",
    description: "Sign in to your Caberu account to manage appointments, patient records, billing, and more. Secure dental practice management portal.",
  },
  "/signup": {
    title: "Sign Up — Start Your Free Trial | Caberu",
    description: "Create your free Caberu account and start managing your dental practice today. No credit card required. HIPAA-compliant and secure.",
  },
  "/book-appointment": {
    title: "Book Appointment — AI-Powered Dental Booking | Caberu",
    description: "Book your dental appointment with AI-powered scheduling. Fast, secure, and convenient online booking for dental practices.",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Book Dental Appointment",
      description: "AI-powered dental appointment booking system",
      provider: {
        "@id": "https://caberu.be/#organization"
      },
      mainEntity: {
        "@type": "HowTo",
        name: "How to Book a Dental Appointment",
        description: "Simple steps to book your dental appointment online",
        step: [
          {
            "@type": "HowToStep",
            name: "Select Your Dentist",
            text: "Browse available dentists and choose the one that best fits your needs",
            position: 1
          },
          {
            "@type": "HowToStep",
            name: "Choose Date & Time",
            text: "Pick from available appointment slots that work with your schedule",
            position: 2
          },
          {
            "@type": "HowToStep",
            name: "Confirm Booking",
            text: "Review your appointment details and confirm your booking instantly",
            position: 3
          }
        ]
      }
    }
  },
  "/privacy": {
    title: "Privacy Policy — HIPAA-Compliant Data Protection | Caberu",
    description: "Learn how Caberu protects your healthcare data with HIPAA-compliant security, encryption, and privacy policies. Your data security is our priority.",
  },
  "/terms": {
    title: "Terms of Service — Usage Agreement & Policies | Caberu",
    description: "Read the terms of service and usage policies for Caberu dental practice management software. Transparent and fair terms for healthcare providers.",
  },
  "/chat": {
    title: "AI Dental Assistant — Instant Chat Support & Triage | Caberu",
    description: "Chat with our AI dental assistant for instant answers, appointment booking, and emergency triage. 24/7 intelligent patient support.",
  },
  "/feature-detail": {
    title: "Features — Comprehensive Dental Practice Management Tools | Caberu",
    description: "Explore Caberu's comprehensive suite of dental practice management features including AI scheduling, patient records, billing, analytics, and more.",
  },
  "/payment-success": {
    title: "Payment Successful — Thank You | Caberu",
    description: "Your payment has been processed successfully. Thank you for choosing Caberu for your dental practice management needs.",
  },
  "/payment-cancelled": {
    title: "Payment Cancelled — No Charge Applied | Caberu",
    description: "Your payment has been cancelled. No charges have been applied to your account. You can try again or contact support if you need assistance.",
  },
  "/claim": {
    title: "Claim Your Account — Verify Your Dental Practice | Caberu",
    description: "Verify and claim your dental practice account on Caberu. Get started with AI-powered practice management.",
  },
  "/messages": {
    title: "Messages — Secure Practice Communication | Caberu",
    description: "Manage secure messages with patients and staff. HIPAA-compliant messaging for dental practices.",
  },
  "/invite": {
    title: "Team Invite — Join Your Dental Practice | Caberu",
    description: "Accept your invitation to join a dental practice team on Caberu. Collaborate with colleagues on patient care.",
  },
  "/faq": {
    title: "FAQ — Common Questions About Dental Practice Management | Caberu",
    description: "Find answers to frequently asked questions about Caberu's dental practice management software, pricing, HIPAA compliance, data migration, and more.",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Caberu?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Caberu is an AI-powered dental practice management platform that handles scheduling, patient records, billing, inventory, analytics, and communications — all in one HIPAA-compliant system."
          }
        },
        {
          "@type": "Question",
          name: "Is Caberu HIPAA and GDPR compliant?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Caberu uses industry-standard encryption, row-level security, and follows all required healthcare data protection regulations for both HIPAA and GDPR compliance."
          }
        },
        {
          "@type": "Question",
          name: "How much does Caberu cost?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Caberu offers a free plan for basic features. Paid plans start at $49/month for professionals and $99/month for enterprise, with no hidden fees."
          }
        }
      ]
    }
  },
  "/ai-info": {
    title: "AI Features — Intelligent Dental Practice Automation | Caberu",
    description: "Explore Caberu's AI-powered features: smart scheduling, dental AI chat assistant, voice call AI, automated reminders, and intelligent slot recommendations.",
  },
  "/watch-demo": {
    title: "Watch Demo — See Caberu in Action | Caberu",
    description: "Watch a live demo of Caberu's dental practice management platform. See AI scheduling, patient management, billing, and analytics features in action.",
  },
  "/cookies": {
    title: "Cookie Policy — How We Use Cookies | Caberu",
    description: "Learn about how Caberu uses cookies and similar technologies. Manage your cookie preferences for our dental practice management platform.",
  },
  "/fr/cookies": {
    title: "Politique de Cookies — Utilisation des Cookies | Caberu",
    description: "Découvrez comment Caberu utilise les cookies et technologies similaires. Gérez vos préférences de cookies pour notre plateforme de gestion de cabinet dentaire.",
  },
  "/nl/cookies": {
    title: "Cookiebeleid — Hoe Wij Cookies Gebruiken | Caberu",
    description: "Ontdek hoe Caberu cookies en vergelijkbare technologieën gebruikt. Beheer uw cookievoorkeuren voor ons tandartspraktijk managementplatform.",
  },
  "/fr/privacy": {
    title: "Politique de Confidentialité — Protection des Données RGPD | Caberu",
    description: "Découvrez comment Caberu protège vos données de santé avec une sécurité conforme au RGPD, le chiffrement et des politiques de confidentialité strictes.",
  },
  "/nl/privacy": {
    title: "Privacybeleid — AVG-conforme Gegevensbescherming | Caberu",
    description: "Ontdek hoe Caberu uw gezondheidsgegevens beschermt met AVG-conforme beveiliging, encryptie en strikte privacyrichtlijnen.",
  },
  "/dpa": {
    title: "Data Processing Agreement — GDPR Compliance | Caberu",
    description: "Review Caberu's Data Processing Agreement (DPA) for GDPR-compliant handling of healthcare data. Transparent data processing terms for dental practices.",
  },
};

export function upsertMetaTag(name: string, content: string) {
  if (!content) return;
  let el = document.querySelector(`meta[name='${name}']`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function setCanonical(url: string) {
  const href = url.replace(/\/$/, "");
  let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

export function setJsonLd(data?: object) {
  // Remove previous JSON-LD blocks added by us
  const existing = document.querySelectorAll("script[data-seo-jsonld='true']");
  existing.forEach((n) => n.parentElement?.removeChild(n));

  if (!data) return;
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.setAttribute("data-seo-jsonld", "true");
  script.text = JSON.stringify(data);
  document.head.appendChild(script);
}

// Generate breadcrumb structured data
function generateBreadcrumbs(pathname: string) {
  const pathParts = pathname.split('/').filter(Boolean);
  if (pathParts.length === 0) return null;

  const breadcrumbList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://caberu.be/"
      }
    ]
  };

  let currentPath = "";
  pathParts.forEach((part, index) => {
    currentPath += `/${part}`;
    const pageName = part
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    breadcrumbList.itemListElement.push({
      "@type": "ListItem",
      position: index + 2,
      name: pageName,
      item: `https://caberu.be${currentPath}`
    });
  });

  return breadcrumbList;
}

function addBreadcrumbSchema(pathname: string) {
  const breadcrumbs = generateBreadcrumbs(pathname);
  if (!breadcrumbs) return;

  // Remove previous breadcrumb schema
  const existing = document.querySelectorAll("script[data-breadcrumb-jsonld='true']");
  existing.forEach((n) => n.parentElement?.removeChild(n));

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.setAttribute("data-breadcrumb-jsonld", "true");
  script.text = JSON.stringify(breadcrumbs);
  document.head.appendChild(script);
}

export function applySEO(pathname: string) {
  const basis = seoMap[pathname] || {
    title: "Caberu — Complete Dental Practice Management",
    description: "AI-powered dental practice management platform for modern dental professionals.",
  };

  // Title (under 60 chars recommended)
  document.title = basis.title;
  // Meta description (under 160 chars)
  upsertMetaTag("description", basis.description);

  // Canonical
  const base = window.location.origin;
  setCanonical(`${base}${pathname}`);

  // Open Graph & Twitter basics
  upsertMetaTag("og:title", basis.title);
  upsertMetaTag("og:description", basis.description);
  upsertMetaTag("og:url", `${base}${pathname}`);
  upsertMetaTag("og:image:alt", "Caberu - AI-Powered Dental Practice Management Software");
  upsertMetaTag("twitter:title", basis.title);
  upsertMetaTag("twitter:description", basis.description);

  // Structured data if provided
  setJsonLd(basis.structuredData);

  // Add breadcrumb schema for all non-homepage pages
  if (pathname !== "/") {
    addBreadcrumbSchema(pathname);
  }
}

export const SeoManager = () => {
  const location = useLocation();
  useEffect(() => {
    applySEO(location.pathname);
  }, [location.pathname]);
  return null;
};
