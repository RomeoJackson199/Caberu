import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Calendar,
  CreditCard,
  MessageSquare,
  CheckCircle,
  Video,
  Sparkles,
  MapPin,
  Stethoscope,
  User,
  Mail,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { useCurrency } from "@/hooks/useCurrency";
import { useBusinessTemplate } from "@/hooks/useBusinessTemplate";
import { differenceInHours } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CardData {
  id: string;
  priority: number;
  component: React.ReactNode;
}

export interface PriorityHomeCardsProps {
  nextAppointment?: {
    id: string;
    date: string;
    time?: string | null;
    dentistName?: string | null;
    dentistSpecialization?: string | null;
    dentistBio?: string | null;
    dentistEmail?: string | null;
    dentistPhone?: string | null;
    dentistProfilePicture?: string | null;
    status?: string;
    isVirtual?: boolean;
    joinUrl?: string | null;
    location?: string | null;
    visitType?: string;
  } | null;
  totalDueCents: number;
  dentistId?: string | null;
  onNavigateTo: (section: 'appointments' | 'payments', appointmentId?: string) => void;
  onOpenAssistant?: () => void;
  onBookAppointment?: () => void;
}

export const PriorityHomeCards: React.FC<PriorityHomeCardsProps> = ({
  nextAppointment,
  totalDueCents,
  dentistId,
  onNavigateTo,
  onOpenAssistant,
  onBookAppointment,
}) => {
  const { t } = useLanguage();
  const { settings: currencySettings } = useCurrency(dentistId || undefined);
  const { hasFeature, loading: templateLoading } = useBusinessTemplate();
  const hasAIChat = !templateLoading && hasFeature('aiChat');
  const unpaid = totalDueCents > 0;
  const [showDentistDialog, setShowDentistDialog] = useState(false);

  const formatVisitContext = (value?: string | null) => {
    if (!value) return null;
    const normalized = value.replace(/[_-]+/g, " ").trim();
    if (!normalized) return null;
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const handleJoinClick = () => {
    if (!nextAppointment) return;
    if (nextAppointment.joinUrl) {
      window.open(nextAppointment.joinUrl, "_blank", "noopener,noreferrer");
    } else {
      onNavigateTo("appointments");
    }
  };

  // Calculate priority scores
  const cards = useMemo(() => {
    const result: CardData[] = [];

    // 1. Payment card - highest priority if unpaid
    const paymentPriority = unpaid ? 100 : 10;
    result.push({
      id: 'payment',
      priority: paymentPriority,
      component: (
        <Card className={cn(
          "h-full transition-all duration-200",
          unpaid && "border-destructive/50 bg-destructive/5"
        )}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <CreditCard className={cn("h-5 w-5", unpaid ? "text-destructive" : "text-success")} />
                {t.balance}
              </span>
              {unpaid && <Badge variant="destructive">{t.due}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className={cn("text-2xl font-bold font-heading", unpaid ? "text-destructive" : "text-success")}>
                {currencySettings.format(totalDueCents / 100)}
              </p>
              <p className="text-sm text-muted-foreground">
                {unpaid ? t.amountDue : t.allPaid}
              </p>
              {unpaid && (
                <Button
                  onClick={() => onNavigateTo('payments')}
                  className="w-full bg-destructive hover:bg-destructive/90"
                  size="sm"
                >
                  {t.payNow}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )
    });

    // 2. Appointment card - high priority if upcoming soon
    let appointmentPriority = 50;
    if (nextAppointment) {
      const hoursUntil = differenceInHours(new Date(nextAppointment.date), new Date());
      if (hoursUntil <= 24) appointmentPriority = 90;
      else if (hoursUntil <= 72) appointmentPriority = 70;
    } else {
      appointmentPriority = 40;
    }

    result.push({
      id: 'appointment',
      priority: appointmentPriority,
      component: (
        <Card className="h-full border-2 transition-all duration-200 hover:border-primary/30 hover:shadow-md md:col-span-2 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                {t.nextAppointment}
              </span>
              {nextAppointment && (
                <Badge className="bg-success/10 text-success border-success/20">{t.confirmed}</Badge>
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
                      <button
                        className="text-sm text-primary hover:underline mt-1 inline-flex items-center gap-1 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setShowDentistDialog(true); }}
                      >
                        <User className="h-3 w-3" />
                        Dr. {nextAppointment.dentistName}
                      </button>
                    )}
                    {nextAppointment.location && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(nextAppointment.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline mt-1 inline-flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MapPin className="h-3 w-3" />
                        {nextAppointment.location}
                      </a>
                    )}
                    {!nextAppointment.location && nextAppointment.visitType && (
                      <p className="text-sm text-muted-foreground mt-1 capitalize">
                        {formatVisitContext(nextAppointment.visitType)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="outline" onClick={() => onNavigateTo('appointments', nextAppointment.id)}>
                      {t.reschedule}
                    </Button>
                    {(nextAppointment.isVirtual || nextAppointment.joinUrl) ? (
                      <Button size="sm" className="bg-primary" onClick={handleJoinClick}>
                        <Video className="h-4 w-4 mr-1" />
                        {t.join}
                      </Button>
                    ) : (
                      <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground text-center">
                        {formatVisitContext(nextAppointment.visitType) || 'In-person'}
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
                >
                  {t.bookAppointment}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )
    });


    // 4. AI Assistant / Booking card
    result.push({
      id: 'assistant',
      priority: 30,
      component: hasAIChat ? (
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="h-full"
        >
          <Card
            role="button"
            tabIndex={0}
            onClick={onOpenAssistant}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenAssistant?.();
              }
            }}
            className="h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 border-0 overflow-hidden relative bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30"
          >
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
              <div className="absolute -bottom-8 -left-4 w-32 h-32 rounded-full bg-white/5" />
              <div className="absolute top-1/2 right-4 w-2 h-2 rounded-full bg-white/30" />
            </div>

            <CardContent className="p-5 flex flex-col h-full relative z-10">
              {/* Header row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-300 border-2 border-white animate-pulse" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm leading-tight">{t.aiAssistant}</p>
                    <p className="text-emerald-100 text-xs">Online now</p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-0 text-xs font-medium backdrop-blur-sm">
                  AI
                </Badge>
              </div>

              {/* Prompt chips */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {[t.bookingAppointments, t.dentalQuestions].map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-white text-xs font-medium backdrop-blur-sm border border-white/20"
                  >
                    <MessageSquare className="h-2.5 w-2.5 flex-shrink-0" />
                    {chip}
                  </span>
                ))}
              </div>

              {/* CTA */}
              <Button
                size="sm"
                className="w-full bg-white text-emerald-700 hover:bg-emerald-50 font-semibold border-0 shadow-sm mt-auto"
                tabIndex={-1}
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                {t.startChat}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <Card
          role="button"
          tabIndex={0}
          onClick={onBookAppointment}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onBookAppointment?.();
            }
          }}
          className="h-full transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 bg-gradient-to-br from-orange-50/50 to-orange-100/30 dark:from-orange-900/10 dark:to-orange-900/5 border-orange-200/50"
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-orange-600" />
              {t.bookAppointment}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm font-medium">Schedule your next visit</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-orange-600" />
                  Choose available times
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
            </div>
          </CardContent>
        </Card>
      )
    });

    return result;
  }, [nextAppointment, totalDueCents, unpaid, hasAIChat, currencySettings, t, onNavigateTo, onOpenAssistant, onBookAppointment]);

  // Always sort cards by priority - higher priority appears first
  const orderedCards = useMemo(() => {
    return [...cards].sort((a, b) => b.priority - a.priority);
  }, [cards]);

  const dentistInitials = nextAppointment?.dentistName
    ? nextAppointment.dentistName.split(' ').map(n => n[0]).join('').toUpperCase()
    : '?';

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {orderedCards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className={cn(
              card.id === 'appointment' && "md:col-span-2 lg:col-span-2"
            )}
          >
            {card.component}
          </motion.div>
        ))}
      </div>

      {/* Dentist Info Dialog - matching booking flow design */}
      <Dialog open={showDentistDialog} onOpenChange={setShowDentistDialog}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0">
          {nextAppointment?.dentistName && (
            <>
              {/* Profile header with gradient */}
              <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background pt-8 pb-6 px-6">
                <DialogHeader className="items-center text-center space-y-4">
                  <Avatar className="h-28 w-28 ring-4 ring-background shadow-2xl">
                    <AvatarImage
                      src={nextAppointment.dentistProfilePicture || undefined}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-3xl font-bold">
                      {dentistInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-2xl font-bold">
                      Dr. {nextAppointment.dentistName}
                    </DialogTitle>
                    <Badge variant="secondary" className="mt-2">
                      <Stethoscope className="h-3 w-3 mr-1" />
                      {nextAppointment.dentistSpecialization || "General Dentistry"}
                    </Badge>
                  </div>
                </DialogHeader>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-5">
                {/* Bio */}
                {nextAppointment.dentistBio && (
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-semibold text-foreground">About</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{nextAppointment.dentistBio}</p>
                  </div>
                )}

                {/* Contact info */}
                <div className="space-y-2.5">
                  {nextAppointment.dentistEmail && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Mail className="h-4 w-4" />
                      </div>
                      <span className="text-muted-foreground">{nextAppointment.dentistEmail}</span>
                    </div>
                  )}
                  {nextAppointment.dentistPhone && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Phone className="h-4 w-4" />
                      </div>
                      <span className="text-muted-foreground">{nextAppointment.dentistPhone}</span>
                    </div>
                  )}
                  {nextAppointment.location && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <span className="text-muted-foreground">{nextAppointment.location}</span>
                    </div>
                  )}
                </div>

                {/* Next appointment info */}
                <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl px-4 py-3">
                  <Calendar className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-xs text-emerald-600/70 font-medium">{t.nextAppointment}</p>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      {nextAppointment.date}, {nextAppointment.time}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
