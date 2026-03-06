import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Navigation2,
  RefreshCw,
  Pill,
  ClipboardList as ClipboardListIcon,
  CreditCard,
  MessageSquare,
  Heart,
  Activity,
  Clock,
  TrendingUp,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Star,
  Shield,
  Zap,
  Video,
  ArrowRight,
  Info,
  CheckCircle,
  Target,
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RecallBanner } from "@/components/patients/RecallBanner";
import { supabase } from "@/integrations/supabase/client";
import { getPatientActiveRecall, RecallRecord } from "@/lib/recalls";
import { useLanguage } from "@/hooks/useLanguage";
import { useCurrency } from "@/hooks/useCurrency";
import { useCurrentDentist } from "@/hooks/useCurrentDentist";
import { useBusinessTemplate } from '@/hooks/useBusinessTemplate';
import { TimeGreeting, AvatarWithInitials, AnimatedStatCard } from "@/components/ui/page-enhancements";
import { StaggeredList } from "@/components/ui/micro-interactions";
import { PriorityHomeCards } from "./PriorityHomeCards";
import { AboutBusinessCard } from "@/components/dashboard";

export interface HomeTabProps {
  userId: string;
  firstName?: string | null;
  profileImageUrl?: string | null;
  nextAppointment?: {
    id: string;
    date: string;
    time?: string | null;
    dentistName?: string | null;
    status?: string;
    isVirtual?: boolean;
    joinUrl?: string | null;
    location?: string | null;
    visitType?: string;
  } | null;
  totalDueCents: number;
  onNavigateTo: (section: 'appointments' | 'payments') => void;
  onOpenAssistant?: () => void;
  onBookAppointment?: () => void;
}

export const HomeTab = React.memo<HomeTabProps>(({
  userId,
  firstName,
  profileImageUrl,
  nextAppointment,
  totalDueCents,
  onNavigateTo,
  onOpenAssistant,
  onBookAppointment,
}) => {
  const [greeting, setGreeting] = useState("");
  const unpaid = totalDueCents > 0;
  const [activeRecall, setActiveRecall] = useState<RecallRecord | null>(null);
  const [dentistId, setDentistId] = useState<string | null>(null);
  const { t } = useLanguage();
  const { settings: currencySettings } = useCurrency(dentistId || undefined);
  const { hasFeature, loading: templateLoading } = useBusinessTemplate();
  const hasAIChat = !templateLoading && hasFeature('aiChat');

  useEffect(() => {
    (async () => {
      // Load patient profile id, active recall, and dentist
      const { data: profile } = await supabase.from('secure_profiles_view').select('id').eq('user_id', userId).single();
      if (profile?.id) {
        const rec = await getPatientActiveRecall(profile.id);
        setActiveRecall(rec);

        // Get patient's dentist from most recent appointment
        const { data: recentAppointment } = await supabase
          .from('appointments_decrypted')
          .select('dentist_id')
          .eq('patient_id', profile.id)
          .order('appointment_date', { ascending: false })
          .limit(1)
          .single();

        if (recentAppointment?.dentist_id) {
          setDentistId(recentAppointment.dentist_id);
        }
      }
    })();
  }, [userId]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting(t.goodMorning);
    else if (hour < 18) setGreeting(t.goodAfternoon);
    else setGreeting(t.goodEvening);
  }, [t]);

  // Mock data for demonstration - would come from API
  const healthRating = 85;
  const visitsThisYear = 3;
  const coverageUsed = 65;
  const healthImprovement = 12;

  const handleJoinClick = () => {
    if (!nextAppointment) return;
    if (nextAppointment.joinUrl) {
      if (typeof window !== "undefined") {
        window.open(nextAppointment.joinUrl, "_blank", "noopener,noreferrer");
      }
    } else {
      onNavigateTo("appointments");
    }
  };

  const formatVisitContext = (value?: string | null) => {
    if (!value) return null;
    const normalized = value.replace(/[_-]+/g, " ").trim();
    if (!normalized) return null;
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  return (
    <div className="px-4 md:px-6 py-4 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Header with Enhanced Components */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-4">
          <AvatarWithInitials
            name={firstName || 'Patient'}
            imageUrl={profileImageUrl || undefined}
            size="lg"
            showStatus
            status="online"
          />
          <TimeGreeting name={firstName || undefined} showDate={true} />
        </div>
      </motion.div>

      {activeRecall && (
        <div>
          <RecallBanner recall={activeRecall} />
        </div>
      )}

      {/* Dynamic Priority Cards */}
      <PriorityHomeCards
        nextAppointment={nextAppointment}
        activePrescriptions={activePrescriptions}
        totalDueCents={totalDueCents}
        dentistId={dentistId}
        onNavigateTo={onNavigateTo}
        onOpenAssistant={onOpenAssistant}
        onBookAppointment={onBookAppointment}
      />

      {/* About this Business */}
      <AboutBusinessCard />
    </div>
  );
});

HomeTab.displayName = 'HomeTab';