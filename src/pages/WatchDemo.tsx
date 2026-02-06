import React from "react";
import { Player } from "@remotion/player";
import { CaberuMarketingPremium } from "../../remotion/CaberuMarketingPremium";
import { Header } from "@/components/homepage/Header";
import { Footer } from "@/components/homepage/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Play, Calendar, Phone, BarChart3, Shield } from "lucide-react";

const WatchDemo = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header user={null} minimal={false} />

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-background pt-24">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              <span className="text-sm font-medium text-blue-400">
                Product Demo
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent mb-4">
              See Caberu in Action
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Watch how Caberu transforms dental practice management with AI-powered scheduling, voice assistants, and real-time analytics.
            </p>
          </div>

          {/* Video Player */}
          <div className="relative max-w-5xl mx-auto mb-12">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 rounded-2xl blur-lg" />

            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50 bg-slate-900">
              <Player
                component={CaberuMarketingPremium}
                durationInFrames={1800}
                compositionWidth={1920}
                compositionHeight={1080}
                fps={30}
                controls
                autoPlay
                loop
                style={{
                  width: "100%",
                  aspectRatio: "16/9",
                }}
                inputProps={{
                  title: "Caberu - AI-Powered Practice Management",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features highlight section */}
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          Everything you saw in the demo, and more
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {[
            {
              icon: Calendar,
              title: "Smart Scheduling",
              description:
                "AI-powered slot finding in under 27ms. Auto-reminders via SMS and email.",
              color: "text-blue-500",
              bg: "bg-blue-500/10",
            },
            {
              icon: Phone,
              title: "AI Voice Assistant",
              description:
                "Never miss a call. 24/7 AI receptionist that books appointments automatically.",
              color: "text-green-500",
              bg: "bg-green-500/10",
            },
            {
              icon: BarChart3,
              title: "Real-time Analytics",
              description:
                "Revenue tracking, patient flow analysis, and business intelligence dashboard.",
              color: "text-purple-500",
              bg: "bg-purple-500/10",
            },
            {
              icon: Shield,
              title: "GDPR Compliant",
              description:
                "Built for Belgian healthcare. End-to-end encryption, ISO 27001 ready.",
              color: "text-cyan-500",
              bg: "bg-cyan-500/10",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow"
            >
              <div
                className={`w-10 h-10 rounded-lg ${feature.bg} flex items-center justify-center mb-4`}
              >
                <feature.icon className={`w-5 h-5 ${feature.color}`} />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center py-12 border-t">
          <h3 className="text-2xl font-bold mb-4">Ready to transform your practice?</h3>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Start your free 14-day trial today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/signup">
                Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/pricing">View Pricing</Link>
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default WatchDemo;
