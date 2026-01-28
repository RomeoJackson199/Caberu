import React, { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Plus, Clock, CheckCircle2, Sparkles } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { AppointmentsTab } from "@/components/patients/AppointmentsTab";
import { supabase } from "@/integrations/supabase/client";
import { PageHeaderWithGradient, IconTabTrigger, PageContainer } from "@/components/ui/layout-components";
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
    <PageContainer>
      <PageHeaderWithGradient
        icon={Calendar}
        title={t.pnav.care.appointments || "My Appointments"}
        description="Manage your appointments and view your visit history"
        iconGradient="from-blue-500 to-purple-500"
        actions={
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
        }
        stats={[
          {
            title: "Upcoming",
            value: stats.upcoming,
            icon: Clock,
            description: "Scheduled appointments",
            gradient: "from-blue-500 to-cyan-500",
          },
          {
            title: "Completed",
            value: stats.completed,
            icon: CheckCircle2,
            description: "Past visits",
            gradient: "from-green-500 to-emerald-500",
          },
          {
            title: "Total",
            value: stats.total,
            icon: Calendar,
            description: "All appointments",
            gradient: "from-purple-500 to-pink-500",
          },
        ]}
        loading={loading}
      />

      <Card className="border-2">
        <CardContent className="pt-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <IconTabTrigger value="upcoming" icon={Clock} label={t.upcoming || "Upcoming"} mobileLabel="Upcoming" />
              <IconTabTrigger value="past" icon={CheckCircle2} label={t.past || "Past"} mobileLabel="Past" />
              <IconTabTrigger value="book" icon={Plus} label={t.book || "Book New"} mobileLabel="Book" />
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
    </PageContainer>
  );
}

