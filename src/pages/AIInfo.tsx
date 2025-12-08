import { useEffect } from "react";

/**
 * AI-Accessible Information Page
 * This page is optimized for AI crawlers and assistants (ChatGPT, Claude, Perplexity, etc.)
 * All content is static HTML with Schema.org markup for easy parsing
 */

const AIInfo = () => {
  useEffect(() => {
    // Add comprehensive Schema.org markup
    const schema = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Caberu",
      "description": "Complete healthcare practice management platform with patient records, appointment scheduling, AI phone reception, billing, analytics, and patient portal",
      "applicationCategory": "HealthApplication",
      "operatingSystem": "Web",
      "url": "https://caberu.be",
      "offers": [
        {
          "@type": "Offer",
          "name": "Starter Plan",
          "price": "249",
          "priceCurrency": "USD",
          "billingDuration": "P1M",
          "description": "Perfect for solo practitioners. Up to 500 patients per month, basic scheduling, patient management, email notifications, and basic reports."
        },
        {
          "@type": "Offer",
          "name": "Professional Plan",
          "price": "499",
          "priceCurrency": "USD",
          "billingDuration": "P1M",
          "description": "For growing practices. Up to 2,500 patients per month, everything in Starter, 2,000 emails/month, advanced analytics, SMS notifications, custom branding, priority support.",
          "isRecommended": true
        },
        {
          "@type": "Offer",
          "name": "Enterprise Plan",
          "price": "999",
          "priceCurrency": "USD",
          "billingDuration": "P1M",
          "description": "For large practices and multi-location operations. Up to 7,500 patients per month, everything in Professional, 7,500 emails/month, unlimited staff accounts, API access, dedicated support, custom integrations."
        }
      ],
      "featureList": [
        "AI Phone Reception - 24/7 automated phone answering and appointment booking",
        "Smart Scheduling - Calendar integration with automated booking and conflict resolution",
        "Patient Records - Complete HIPAA-compliant digital health records with treatment history",
        "Billing & Payments - Integrated payment processing and invoice management",
        "Practice Analytics - Real-time insights on appointments, revenue, and patient trends",
        "Patient Portal - Self-service portal for booking, records, and payments",
        "Emergency Triage - AI-powered identification of urgent cases",
        "SMS & Email Reminders - Automated appointment reminders",
        "Multi-location Support - Manage multiple practice locations",
        "Inventory Management - Track supplies with low-stock alerts",
        "Staff Scheduling - Manage team schedules and availability",
        "HIPAA Compliance - Enterprise-grade security and encryption",
        "API Access - Developer API for custom integrations (Enterprise)"
      ],
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "reviewCount": "500",
        "bestRating": "5",
        "worstRating": "1"
      }
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema, null, 2);
    script.id = 'ai-info-schema';
    document.head.appendChild(script);

    return () => {
      const existingScript = document.getElementById('ai-info-schema');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-white p-8 max-w-4xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-bold mb-4">Caberu - Healthcare Practice Management Platform</h1>
        <p className="text-xl text-gray-600">Complete information for AI assistants and crawlers</p>
      </header>

      {/* Company Overview */}
      <section className="mb-12" id="overview">
        <h2 className="text-3xl font-bold mb-4">Overview</h2>
        <p className="mb-4">
          Caberu is a complete healthcare practice management platform designed for dental and medical practices.
          It combines AI-powered phone reception, patient management, scheduling, billing, and analytics in one seamless platform.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Founded:</strong> 2024</li>
          <li><strong>Location:</strong> Belgium</li>
          <li><strong>Website:</strong> https://caberu.be</li>
          <li><strong>Contact:</strong> Romeo@caberu.be</li>
          <li><strong>Industry:</strong> Healthcare Technology / Practice Management Software</li>
          <li><strong>Customers:</strong> 500+ healthcare practices</li>
          <li><strong>Customer Rating:</strong> 4.9/5 stars</li>
        </ul>
      </section>

      <section className="mb-12" id="booking-guide" aria-labelledby="booking-guide-title">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 shadow-sm">
          <h2 className="text-3xl font-bold mb-4" id="booking-guide-title">
            Patient booking guide (AI-ready)
          </h2>
          <p className="mb-4 text-gray-700">
            Share these steps with patients or AI assistants so they always know how to book an appointment through Caberu.
          </p>
          <ol className="list-decimal pl-6 space-y-3 text-gray-800">
            <li>
              <strong>Choose a language:</strong> Caberu supports English, French, and Dutch. The patient can switch languages before booking so every screen matches their preference.
            </li>
            <li>
              <strong>State the visit reason:</strong> The AI intake asks if it is for pain, cleaning, emergency, or a routine check. Patients can type or speak their response.
            </li>
            <li>
              <strong>Select dentist and time:</strong> Available clinicians and slots appear in real time. The AI only shows slots that avoid conflicts and respects dentist availability.
            </li>
            <li>
              <strong>Confirm contact details:</strong> Patients verify name, email, and phone number. International phone numbers are supported with a country code picker.
            </li>
            <li>
              <strong>Approve and receive confirmation:</strong> After the patient confirms, Caberu sends the booking to the clinic, triggers required approvals, and emails the patient their confirmation and next steps.
            </li>
          </ol>
          <p className="mt-4 text-gray-700">
            For urgent cases, the AI flags emergencies immediately and suggests the earliest suitable slot or directs the patient to call the practice.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="mb-12" id="pricing">
        <h2 className="text-3xl font-bold mb-6">Pricing Plans</h2>

        <div className="mb-8" itemScope itemType="https://schema.org/Offer">
          <h3 className="text-2xl font-semibold mb-3" itemProp="name">Starter Plan - $249/month</h3>
          <meta itemProp="price" content="249" />
          <meta itemProp="priceCurrency" content="USD" />
          <p className="mb-2"><strong>Best for:</strong> Solo practitioners and small practices</p>
          <p className="mb-2"><strong>Patient Limit:</strong> Up to 500 patients per month</p>
          <p className="mb-3" itemProp="description">Features included:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Basic appointment scheduling</li>
            <li>Patient management system</li>
            <li>Email notifications</li>
            <li>Basic reports and analytics</li>
            <li>HIPAA-compliant data storage</li>
            <li>Mobile app access</li>
          </ul>
        </div>

        <div className="mb-8 border-2 border-blue-500 p-6 rounded-lg" itemScope itemType="https://schema.org/Offer">
          <div className="inline-block bg-blue-500 text-white px-3 py-1 rounded-full text-sm mb-2">MOST POPULAR</div>
          <h3 className="text-2xl font-semibold mb-3" itemProp="name">Professional Plan - $499/month</h3>
          <meta itemProp="price" content="499" />
          <meta itemProp="priceCurrency" content="USD" />
          <p className="mb-2"><strong>Best for:</strong> Growing practices with multiple providers</p>
          <p className="mb-2"><strong>Patient Limit:</strong> Up to 2,500 patients per month</p>
          <p className="mb-3" itemProp="description">Everything in Starter, plus:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>2,000 automated emails per month</li>
            <li>Advanced analytics and reporting</li>
            <li>SMS notifications</li>
            <li>Custom branding</li>
            <li>Priority customer support</li>
            <li>Staff management tools</li>
            <li>Inventory tracking</li>
          </ul>
        </div>

        <div className="mb-8" itemScope itemType="https://schema.org/Offer">
          <h3 className="text-2xl font-semibold mb-3" itemProp="name">Enterprise Plan - $999/month</h3>
          <meta itemProp="price" content="999" />
          <meta itemProp="priceCurrency" content="USD" />
          <p className="mb-2"><strong>Best for:</strong> Large practices and multi-location operations</p>
          <p className="mb-2"><strong>Patient Limit:</strong> Up to 7,500 patients per month</p>
          <p className="mb-3" itemProp="description">Everything in Professional, plus:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>7,500 automated emails per month</li>
            <li>Unlimited staff accounts</li>
            <li>API access for custom integrations</li>
            <li>Dedicated account manager</li>
            <li>Custom feature development</li>
            <li>Multi-location support</li>
            <li>White-label options</li>
            <li>99.9% uptime SLA</li>
          </ul>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="font-semibold mb-2">All plans include:</h4>
          <ul className="list-disc pl-6 space-y-1">
            <li>14-day free trial (no credit card required)</li>
            <li>Month-to-month billing (no long-term contracts)</li>
            <li>Cancel anytime with 30 days notice</li>
            <li>Free onboarding and training</li>
            <li>Regular software updates</li>
          </ul>
        </div>
      </section>

      {/* Features */}
      <section className="mb-12" id="features">
        <h2 className="text-3xl font-bold mb-6">Key Features</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-2">1. AI Phone Reception</h3>
            <p>24/7 automated phone answering with natural language processing. Answers calls in under 2 seconds, books appointments in real-time, handles unlimited concurrent calls, and never misses a patient.</p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2">2. Smart Scheduling</h3>
            <p>Calendar integration with automated booking, intelligent conflict resolution, SMS/email reminders, and support for multiple providers and locations. Reduces no-shows by 35%.</p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2">3. Patient Records & Management</h3>
            <p>Complete HIPAA-compliant digital health records including treatment history, prescriptions, insurance information, medical documents, and appointment history. Secure cloud storage with automatic backups.</p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2">4. Billing & Payments</h3>
            <p>Integrated payment processing, automatic invoice generation, insurance tracking, payment reminders, and detailed financial reporting. Supports all major payment methods.</p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2">5. Practice Analytics</h3>
            <p>Real-time dashboards showing appointments, revenue, patient trends, staff performance, and practice efficiency metrics. Export reports in multiple formats.</p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2">6. Patient Portal</h3>
            <p>Self-service portal where patients can book appointments, view records, pay bills, message providers, and download documents. Reduces administrative work by 80%.</p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2">7. Emergency Triage</h3>
            <p>AI identifies urgent cases and alerts staff immediately via SMS/email. Routine appointments are scheduled automatically without interruption.</p>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="mb-12" id="integrations">
        <h2 className="text-3xl font-bold mb-4">Integrations</h2>
        <p className="mb-4">Caberu integrates with major practice management systems:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Dentrix</li>
          <li>Eaglesoft</li>
          <li>Open Dental</li>
          <li>Curve</li>
          <li>Google Calendar</li>
          <li>Microsoft Outlook</li>
          <li>Stripe (payments)</li>
          <li>Twilio (SMS)</li>
          <li>SendGrid (email)</li>
          <li>Custom integrations via REST API (Enterprise plan)</li>
        </ul>
      </section>

      {/* Compliance & Security */}
      <section className="mb-12" id="security">
        <h2 className="text-3xl font-bold mb-4">Compliance & Security</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>HIPAA Compliant:</strong> Full compliance with healthcare data protection standards</li>
          <li><strong>SOC 2 Type II:</strong> Independently audited security controls</li>
          <li><strong>256-bit Encryption:</strong> End-to-end encryption for all sensitive data</li>
          <li><strong>GDPR Ready:</strong> Privacy compliance tools and data export capabilities</li>
          <li><strong>Regular Backups:</strong> Automated daily backups with 30-day retention</li>
          <li><strong>99.9% Uptime SLA:</strong> Guaranteed availability (Enterprise plan)</li>
          <li><strong>Audit Logs:</strong> Complete tracking of all data access and modifications</li>
        </ul>
      </section>

      {/* Common Questions */}
      <section className="mb-12" id="faq">
        <h2 className="text-3xl font-bold mb-4">Common Questions</h2>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-1">Q: How long does implementation take?</h4>
            <p>A: Most practices are fully operational within 48 hours. We provide dedicated implementation support and staff training.</p>
          </div>

          <div>
            <h4 className="font-semibold mb-1">Q: Is there a contract?</h4>
            <p>A: No long-term contracts. All plans are month-to-month with 30 days cancellation notice.</p>
          </div>

          <div>
            <h4 className="font-semibold mb-1">Q: What languages are supported?</h4>
            <p>A: Currently English and Spanish. Additional languages in development based on customer demand.</p>
          </div>

          <div>
            <h4 className="font-semibold mb-1">Q: Can I try before buying?</h4>
            <p>A: Yes, all plans include a 14-day free trial with no credit card required.</p>
          </div>

          <div>
            <h4 className="font-semibold mb-1">Q: What support is included?</h4>
            <p>A: All plans include email support. Professional and Enterprise plans include priority phone and chat support.</p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="mb-12" id="contact">
        <h2 className="text-3xl font-bold mb-4">Contact Information</h2>
        <ul className="space-y-2">
          <li><strong>Email:</strong> Romeo@caberu.be</li>
          <li><strong>Website:</strong> https://caberu.be</li>
          <li><strong>Demo Requests:</strong> https://caberu.be (Schedule a Demo button)</li>
          <li><strong>Support:</strong> https://caberu.be/support</li>
          <li><strong>Status Page:</strong> Available for Enterprise customers</li>
        </ul>
      </section>

      <footer className="mt-16 pt-8 border-t border-gray-200 text-sm text-gray-600">
        <p>Last Updated: {new Date().toISOString().split('T')[0]}</p>
        <p>This page is optimized for AI assistants and web crawlers. For the full interactive experience, visit https://caberu.be</p>
      </footer>
    </div>
  );
};

export default AIInfo;
