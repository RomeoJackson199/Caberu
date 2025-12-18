import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { RecallBanner } from "@/components/patient/RecallBanner";
import { supabase } from "@/integrations/supabase/client";
import { getPatientActiveRecall, RecallRecord } from "@/lib/recalls";
import { useLanguage } from "@/hooks/useLanguage";
import { useCurrency } from "@/hooks/useCurrency";
import { useCurrentDentist } from "@/hooks/useCurrentDentist";
import { useBusinessTemplate } from '@/hooks/useBusinessTemplate';

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
  activePrescriptions: number;
  activeTreatmentPlans: number;
  totalDueCents: number;
  onNavigateTo: (section: 'appointments' | 'care' | 'payments') => void;
  onOpenAssistant?: () => void;
  onBookAppointment?: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  userId,
  firstName,
  profileImageUrl,
  nextAppointment,
  activePrescriptions,
  activeTreatmentPlans,
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
      const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', userId).single();
      if (profile?.id) {
        const rec = await getPatientActiveRecall(profile.id);
        setActiveRecall(rec);

        // Get patient's dentist from most recent appointment
        const { data: recentAppointment } = await supabase
          .from('appointments')
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
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-4">
          <Avatar className="h-12 w-12 md:h-14 md:w-14">
            <AvatarImage src={profileImageUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {firstName?.[0]?.toUpperCase() || 'P'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {greeting}, {firstName || 'Patient'}!
            </h1>
            <p className="text-muted-foreground">{t.hereIsYourHealthOverview}</p>
          </div>
        </div>
      </motion.div>

      {activeRecall && (
        <div>
          <RecallBanner recall={activeRecall} />
        </div>
      )}

      {/* Primary Cards Section - In specified order */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* 1. Next Appointment Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-2 lg:col-span-4"
        >
          <Card
            className="h-full border-2 hover:border-primary/30 transition-all hover:shadow-lg"
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  {t.nextAppointment}
                </span>
                {nextAppointment && (
                  <Badge className="bg-green-100 text-green-800">{t.confirmed}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextAppointment ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold">{nextAppointment.date}</p>
                      <p className="text-muted-foreground">{nextAppointment.time || 'Time TBD'}</p>
                      {nextAppointment.dentistName && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Dr. {nextAppointment.dentistName}
                        </p>
                      )}
                      {nextAppointment.location && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {nextAppointment.location}
                        </p>
                      )}
                      {!nextAppointment.location && nextAppointment.visitType && (
                        <p className="text-sm text-muted-foreground mt-1 capitalize">
                          {formatVisitContext(nextAppointment.visitType)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" variant="outline" onClick={() => onNavigateTo('appointments')}>
                        {t.reschedule}
                      </Button>
                      {(nextAppointment.isVirtual || nextAppointment.joinUrl) ? (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleJoinClick}>
                          <Video className="h-4 w-4 mr-1" />
                          {t.join}
                        </Button>
                      ) : (
                        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground text-center">
                          {nextAppointment.location || formatVisitContext(nextAppointment.visitType) || 'In-person visit'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground mb-3">{t.noUpcomingAppointments}</p>
                  <Button
                    onClick={onBookAppointment || (() => onNavigateTo('appointments'))}
                    className="w-full"
                    aria-label="Book appointment"
                  >
                    {t.bookAppointment}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 2. Prescriptions Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card
            role="button"
            tabIndex={0}
            onClick={() => onNavigateTo('care')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onNavigateTo('care');
              }
            }}
            className="h-full border-l-4 border-l-primary hover:border-l-2 hover:border-l-primary transition-all hover:shadow-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Pill className="h-5 w-5 text-purple-600" />
                  {t.prescriptions}
                </span>
                {activePrescriptions > 0 && (
                  <Badge className="bg-purple-100 text-purple-800">
                    {activePrescriptions} {t.active}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold">{activePrescriptions}</p>
                <p className="text-sm text-muted-foreground">{t.activeMedications}</p>
                <Button variant="link" className="p-0 h-auto text-primary hover:underline">
                  {t.viewInCareTab}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 3. Outstanding Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className={cn(
            "h-full hover:shadow-lg transition-all",
            unpaid && "border-red-200 bg-red-50/50 dark:bg-red-900/10"
          )}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <CreditCard className={cn("h-5 w-5", unpaid ? "text-red-600" : "text-green-600")} />
                  {t.balance}
                </span>
                {unpaid && (
                  <Badge variant="destructive">{t.due}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className={cn("text-2xl font-bold font-heading", unpaid ? "text-error" : "text-success")}>
                  {currencySettings.format(totalDueCents / 100)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {unpaid ? t.amountDue : t.allPaid}
                </p>
                {unpaid && (
                  <Button
                    onClick={() => onNavigateTo('payments')}
                    className="w-full bg-error hover:bg-error/90 text-error-foreground"
                    size="sm"
                  >
                    {t.payNow}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 4. AI Assistant / Classic Booking Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="md:col-span-2 lg:col-span-1"
        >
          <Card
            role="button"
            tabIndex={0}
            onClick={hasAIChat ? onOpenAssistant : onBookAppointment}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (hasAIChat) {
                  onOpenAssistant?.();
                } else {
                  onBookAppointment?.();
                }
              }
            }}
            className={cn(
              "h-full hover:shadow-md transition-all cursor-pointer focus:outline-none focus-visible:ring-2",
              hasAIChat
                ? "bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 dark:from-emerald-900/10 dark:to-emerald-900/5 border-emerald-200/50 focus-visible:ring-emerald-300"
                : "bg-gradient-to-br from-orange-50/50 to-orange-100/30 dark:from-orange-900/10 dark:to-orange-900/5 border-orange-200/50 focus-visible:ring-orange-300"
            )}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  {hasAIChat ? (
                    <MessageSquare className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Calendar className="h-5 w-5 text-orange-600" />
                  )}
                  {hasAIChat ? t.aiAssistant : t.bookAppointment}
                </span>
                {hasAIChat && (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {hasAIChat ? (
                  <>
                    <p className="text-sm font-medium">{t.getInstantHelpWith}</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                        {t.bookingAppointments}
                      </li>
                      <li className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                        {t.dentalQuestions}
                      </li>
                      <li className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                        {t.emergencyTriage}
                      </li>
                    </ul>
                    <Button variant="secondary" className="w-full mt-3" size="sm">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {t.startChat}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium">Schedule your next visit</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-orange-600" />
                        Choose available times
                      </li>
                      <li className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-orange-600" />
                        Select your service
                      </li>
                      <li className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-orange-600" />
                        Instant confirmation
                      </li>
                    </ul>
                    <Button variant="secondary" className="w-full mt-3" size="sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      {t.bookNow}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};