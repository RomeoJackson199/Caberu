import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, Target, Heart, Shield, Zap, Users, Globe } from "lucide-react"

export default function AboutPage() {
  const values = [
    {
      icon: Heart,
      title: "Patient-Centered",
      description: "We put patients and their care at the heart of everything we build."
    },
    {
      icon: Shield,
      title: "Trust & Security",
      description: "HIPAA-compliant systems that protect sensitive healthcare data."
    },
    {
      icon: Zap,
      title: "Innovation",
      description: "Leveraging AI and modern technology to improve healthcare workflows."
    },
    {
      icon: Users,
      title: "Collaboration",
      description: "Building tools that connect healthcare teams and their patients."
    }
  ]

  const stats = [
    { value: "500+", label: "Healthcare Practices" },
    { value: "1M+", label: "Appointments Managed" },
    { value: "50K+", label: "Healthcare Professionals" },
    { value: "15+", label: "Countries" }
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

      <main>
        {/* Hero */}
        <section className="container mx-auto px-4 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Transforming Healthcare Management
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              We&apos;re on a mission to make healthcare administration simpler, smarter, 
              and more efficient for practices of all sizes.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="border-y bg-muted/30">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-3xl mx-auto text-center">
              <Target className="h-12 w-12 text-primary mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
              <p className="text-lg text-muted-foreground">
                To empower healthcare professionals with intuitive technology that reduces 
                administrative burden, improves patient experiences, and allows practitioners 
                to focus on what matters most - providing excellent care.
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-2">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Values */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Values</h2>
            <p className="text-muted-foreground">
              The principles that guide everything we do
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {values.map((value) => (
              <Card key={value.title}>
                <CardContent className="p-6 text-center">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <value.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Global */}
        <section className="border-t bg-muted/30">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto text-center">
              <Globe className="h-12 w-12 text-primary mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">Global Reach, Local Focus</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Caberu serves healthcare practices across multiple countries while maintaining 
                compliance with local healthcare regulations and privacy laws.
              </p>
              <Button asChild>
                <Link href="/signup">Join Us Today</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
