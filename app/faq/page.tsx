"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, ChevronDown, ChevronUp } from "lucide-react"

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs = [
    {
      question: "What is Caberu?",
      answer: "Caberu is a comprehensive practice management platform designed for healthcare professionals. It includes scheduling, patient management, clinical tools, analytics, and more - all in one integrated system."
    },
    {
      question: "Is Caberu HIPAA compliant?",
      answer: "Yes, Caberu is fully HIPAA compliant. We implement industry-standard encryption, access controls, audit logging, and other security measures to protect patient health information (PHI)."
    },
    {
      question: "How much does Caberu cost?",
      answer: "Caberu offers flexible pricing plans starting at $49/month for small practices. We also offer a Professional plan at $99/month and custom Enterprise pricing for larger organizations. All plans include a 14-day free trial."
    },
    {
      question: "Can I import my existing patient data?",
      answer: "Yes, Caberu supports data import from most common practice management systems. Our onboarding team will help you migrate your existing data safely and efficiently."
    },
    {
      question: "Does Caberu integrate with other software?",
      answer: "Caberu integrates with popular tools including Google Calendar, payment processors, and various EHR systems. Enterprise customers can access our API for custom integrations."
    },
    {
      question: "What kind of support do you offer?",
      answer: "We offer email support for all customers, with priority support for Professional plan users. Enterprise customers receive a dedicated account manager and 24/7 phone support."
    },
    {
      question: "Can I try Caberu before committing?",
      answer: "Absolutely! All plans include a 14-day free trial with full access to features. No credit card required to start your trial."
    },
    {
      question: "Is there a mobile app?",
      answer: "Yes, Caberu offers native mobile apps for iOS and Android, allowing you to manage your practice on the go. The web application is also fully responsive and works great on tablets."
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-bold">Caberu</span>
          </Link>
          <Button asChild>
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
            <p className="text-muted-foreground text-lg">
              Find answers to common questions about Caberu
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardContent className="p-0">
                  <button
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="w-full flex items-center justify-between p-6 text-left"
                  >
                    <span className="font-medium pr-4">{faq.question}</span>
                    {openIndex === index ? (
                      <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                  {openIndex === index && (
                    <div className="px-6 pb-6 pt-0">
                      <p className="text-muted-foreground">{faq.answer}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
            <p className="text-muted-foreground mb-6">
              Can&apos;t find the answer you&apos;re looking for? Our support team is here to help.
            </p>
            <Button asChild>
              <Link href="/support">Contact Support</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
