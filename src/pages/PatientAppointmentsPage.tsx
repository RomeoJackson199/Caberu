import React, { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Plus, Clock, CheckCircle2, CalendarX, Sparkles } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { AppointmentsTab } from "@/components/patients/AppointmentsTab";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeader, StatCard, AnimatedBackground } from "@/components/ui/polished-components";
import { useNavigate } from "react-router-dom";
import { useBusinessTemplate } from "@/hooks/useBusinessTemplate";

export default function PatientAppointmentsPage() {
  const { hasFeature, loading: templateLoading } = useBusinessTemplate();
  const hasAIChat = !templateLoading && hasFeature('aiChat');
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<'upcoming' | 'past' | 'book'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    upcoming: 0,
    completed: 0,
    total: 0,
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user as any);

      if (data.user) {
        // Fetch appointment stats
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', data.user.id)
          .single();

        if (profile) {
          const { data: appointments } = await supabase
            .from('appointments')
            .select('id, status, appointment_date')
            .eq('patient_id', profile.id);

          if (appointments) {
            const now = new Date();
            const upcoming = appointments.filter(a =>
              new Date(a.appointment_date) > now && a.status !== 'cancelled'
            ).length;
            const completed = appointments.filter(a => a.status === 'completed').length;

            setStats({
              upcoming,
              completed,
              total: appointments.length,
            });
          }
        }
      }

      setLoading(false);
    };

    fetchUser();
  }, []);

  return (
    <div className="space-y-6 pb-8">
      {/* Header with animated background */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-6 border border-blue-100">
        <AnimatedBackground />

        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
                  <Calendar className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                {t.pnav.care.appointments || "My Appointments"}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Manage your appointments and view your visit history
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                size="lg"
                className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
                onClick={() => {
                  try { localStorage.setItem('pd_section', 'assistant'); } catch {}
                  window.dispatchEvent(new CustomEvent('dashboard:changeSection', { detail: { section: 'assistant' } }));
                  navigate('/dashboard');
                }}
                aria-label={t.bookAppointment}
              >
                <Plus className="h-4 w-4" />
                {t.bookAppointment || "Book Appointment"}
              </Button>

              {hasAIChat && (
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2"
                  onClick={() => navigate('/chat')}
                  aria-label="AI Assistant"
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">AI Assistant</span>
                </Button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <StatCard
                title="Upcoming"
                value={stats.upcoming}
                icon={Clock}
                description="Scheduled appointments"
                gradient="from-blue-500 to-cyan-500"
                loading={loading}
              />
              <StatCard
                title="Completed"
                value={stats.completed}
                icon={CheckCircle2}
                description="Past visits"
                gradient="from-green-500 to-emerald-500"
                loading={loading}
              />
              <StatCard
                title="Total"
                value={stats.total}
                icon={Calendar}
                description="All appointments"
                gradient="from-purple-500 to-pink-500"
                loading={loading}
              />
            </div>
          )}
        </div>
      </div>

      {/* Tabs Section */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="upcoming" className="gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">{t.upcoming || "Upcoming"}</span>
                <span className="sm:hidden">Upcoming</span>
              </TabsTrigger>
              <TabsTrigger value="past" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="hidden sm:inline">{t.past || "Past"}</span>
                <span className="sm:hidden">Past</span>
              </TabsTrigger>
              <TabsTrigger value="book" className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t.book || "Book New"}</span>
                <span className="sm:hidden">Book</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-0">
              {user ? (
                <AppointmentsTab user={user} />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading appointments...</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="past" className="mt-0">
              {user ? (
                <AppointmentsTab user={user} />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading appointments...</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="book" className="mt-0">
              {user ? (
                <AppointmentsTab user={user} onOpenAssistant={hasAIChat ? () => navigate('/chat') : undefined} />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading booking form...</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

