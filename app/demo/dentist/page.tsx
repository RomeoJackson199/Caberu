"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar, 
  Users, 
  MessageSquare, 
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Home,
  Settings,
  Bell,
  Search,
  Plus,
  ChevronRight,
  TrendingUp,
  DollarSign
} from "lucide-react"

export default function DemoDentistDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard")

  const todayAppointments = [
    { id: 1, time: "9:00 AM", patient: "John Smith", type: "Cleaning", status: "confirmed" },
    { id: 2, time: "10:30 AM", patient: "Emma Wilson", type: "Check-up", status: "confirmed" },
    { id: 3, time: "11:30 AM", patient: "Michael Brown", type: "Crown Fitting", status: "pending" },
    { id: 4, time: "2:00 PM", patient: "Sarah Davis", type: "Root Canal", status: "confirmed" },
    { id: 5, time: "3:30 PM", patient: "James Johnson", type: "Extraction", status: "confirmed" },
  ]

  const stats = [
    { label: "Today's Appointments", value: "8", icon: Calendar, trend: "+2 from yesterday" },
    { label: "Active Patients", value: "142", icon: Users, trend: "+12 this month" },
    { label: "Unread Messages", value: "5", icon: MessageSquare, trend: "3 urgent" },
    { label: "Revenue (MTD)", value: "$24,580", icon: DollarSign, trend: "+18% vs last month" },
  ]

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "patients", label: "Patients", icon: Users },
    { id: "appointments", label: "Appointments", icon: Calendar },
    { id: "messages", label: "Messages", icon: MessageSquare, badge: 5 },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Demo Banner */}
      <div className="bg-primary text-primary-foreground px-4 py-2 text-center text-sm">
        <span className="font-medium">Demo Mode</span> - This is a preview of the dentist dashboard.{" "}
        <Link href="/signup" className="underline hover:no-underline">
          Sign up to get started
        </Link>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-background min-h-[calc(100vh-36px)] hidden md:block">
          <div className="p-4 border-b">
            <Link href="/" className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="font-bold">Caberu</span>
            </Link>
          </div>
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  activeTab === item.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto">
                    {item.badge}
                  </Badge>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">Good morning, Dr. Smith</h1>
              <p className="text-muted-foreground">Here&apos;s what&apos;s happening today</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Bell className="h-4 w-4" />
              </Button>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Appointment
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <stat.icon className="h-5 w-5 text-primary" />
                    </div>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                  <div className="text-xs text-green-600 mt-1">{stat.trend}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Today's Schedule */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Today&apos;s Schedule</CardTitle>
                  <CardDescription>You have {todayAppointments.length} appointments today</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {todayAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-center w-16 text-sm font-medium">
                        <Clock className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        {appointment.time}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{appointment.patient}</div>
                        <div className="text-sm text-muted-foreground">{appointment.type}</div>
                      </div>
                      <Badge
                        variant={appointment.status === "confirmed" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {appointment.status === "confirmed" ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <AlertCircle className="h-3 w-3 mr-1" />
                        )}
                        {appointment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Patient
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Appointment
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Reports
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
