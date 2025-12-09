import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, Zap, Users, Heart, Award, Clock } from "lucide-react";
import { Header } from "@/components/homepage/Header";
import { Footer } from "@/components/homepage/Footer";
import { Logo } from "@/components/Logo";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header user={null} minimal={false} />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 border-b pt-24">
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <div className="flex justify-center mb-8">
            <Logo variant="full" size="lg" className="h-16" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 text-center">
            Transforming Healthcare Management
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl text-center mx-auto">
            Caberu is the AI-powered healthcare practice management platform designed to help modern healthcare professionals reduce administrative burden, enhance patient care, and grow their practice with confidence.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Story Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-6">Our Story</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Founded in 2024, Caberu was born from a simple observation: dental professionals spend too much time on administrative tasks and not enough time with their patients. Our founders, Romeo Jackson and Thomas Iordache, experienced this firsthand while working with dental practices across Europe.
            </p>
            <p>
              We saw dentists drowning in paperwork, struggling with outdated scheduling systems, and losing valuable time to manual data entry. Meanwhile, patients faced long wait times, difficulty booking appointments, and fragmented communication. We knew there had to be a better way.
            </p>
            <p>
              That's why we created Caberu - an intelligent, GDPR-compliant platform that automates the busywork so dental professionals can focus on what they do best: providing exceptional patient care. Today, practices using Caberu report up to 40% reduction in administrative overhead and significantly improved patient satisfaction scores.
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-6">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            To empower dental practices with intelligent automation that improves efficiency, enhances patient experiences, and enables providers to deliver the highest quality care.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg border bg-card">
              <Zap className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Intelligent Automation</h3>
              <p className="text-sm text-muted-foreground">
                AI-powered scheduling, billing, and patient communication that saves hours every day.
              </p>
            </div>

            <div className="p-6 rounded-lg border bg-card">
              <Heart className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Better Patient Care</h3>
              <p className="text-sm text-muted-foreground">
                Easy booking, instant access to treatment history, and timely appointment reminders.
              </p>
            </div>

            <div className="p-6 rounded-lg border bg-card">
              <Shield className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Security First</h3>
              <p className="text-sm text-muted-foreground">
                GDPR-compliant with end-to-end encryption, security audited, and enterprise-grade security.
              </p>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-6">Our Values</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <Users className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Patient-Centric Design</h3>
                <p className="text-muted-foreground">
                  Every feature we build is designed to improve the patient experience and strengthen the patient-provider relationship.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Award className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Excellence in Execution</h3>
                <p className="text-muted-foreground">
                  We're committed to delivering a platform that's reliable, intuitive, and exceeds expectations. Quality is non-negotiable.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Clock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Respect for Time</h3>
                <p className="text-muted-foreground">
                  Your time is precious. We're obsessed with eliminating inefficiencies and giving you back hours in your day.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-6">Leadership Team</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-6 rounded-lg border bg-card">
              <div className="mb-4">
                <h3 className="text-xl font-semibold">Romeo Jackson</h3>
                <p className="text-sm text-blue-600">Co-Founder & CEO</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Romeo brings extensive experience in healthcare technology and artificial intelligence. His vision for AI-driven practice management continues to shape Caberu's product strategy.
              </p>
            </div>

            <div className="p-6 rounded-lg border bg-card">
              <div className="mb-4">
                <h3 className="text-xl font-semibold">Thomas Iordache</h3>
                <p className="text-sm text-blue-600">Co-Founder & CTO</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Thomas leads our engineering team with a focus on building secure, scalable healthcare infrastructure. His expertise ensures Caberu meets the highest standards for medical data protection.
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="mb-16 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 rounded-xl p-8">
          <h2 className="text-3xl font-bold tracking-tight mb-8 text-center">Caberu by the Numbers</h2>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">40%</div>
              <div className="text-sm text-muted-foreground">Reduction in Admin Time</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">10,000+</div>
              <div className="text-sm text-muted-foreground">Appointments Scheduled</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime Guarantee</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">24/7</div>
              <div className="text-sm text-muted-foreground">AI Assistant Availability</div>
            </div>
          </div>
        </section>

        {/* Company Info */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-6">Company Information</h2>
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong>Caberu SRL</strong> is a healthcare technology company headquartered in Europe, dedicated to transforming dental practice management through artificial intelligence and modern software design.
            </p>
            <div className="space-y-2 text-muted-foreground">
              <p><strong>Founded:</strong> 2024</p>
              <p><strong>Founders:</strong> Romeo Jackson & Thomas Iordache</p>
              <p><strong>Headquarters:</strong> Europe</p>
              <p><strong>Compliance:</strong> GDPR Ready, Security Audited</p>
              <p><strong>Industry:</strong> Healthcare Technology / Dental Software</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center py-12 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Practice?</h2>
          <p className="text-lg mb-6 opacity-90">
            Join dental practices that are saving time and improving patient care with Caberu.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/signup">
              <Button size="lg" variant="secondary" className="gap-2">
                Start Free Trial
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline" className="gap-2 bg-white/10 hover:bg-white/20 text-white border-white/30">
                View Pricing
              </Button>
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default About;

