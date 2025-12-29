import React, { useMemo, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Calendar,
  Pill,
  CreditCard,
  MessageSquare,
  ChevronRight,
  CheckCircle,
  Video,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { useCurrency } from "@/hooks/useCurrency";
import { useBusinessTemplate } from "@/hooks/useBusinessTemplate";
import { differenceInHours } from "date-fns";

interface CardData {
  id: string;
  priority: number; // higher = more important
  component: React.ReactNode;
}

export interface PriorityHomeCardsProps {
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
  totalDueCents: number;
  dentistId?: string | null;
  onNavigateTo: (section: 'appointments' | 'care' | 'payments') => void;
  onOpenAssistant?: () => void;
  onBookAppointment?: () => void;
}

export const PriorityHomeCards: React.FC<PriorityHomeCardsProps> = ({
  nextAppointment,
  activePrescriptions,
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

  // Track previous order to prevent jitter
  const [stableOrder, setStableOrder] = useState<string[]>([]);
  const initialRenderRef = useRef(true);

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
      appointmentPriority = 40; // No appointment, still important
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
                      <Button size="sm" className="bg-primary" onClick={handleJoinClick}>
                        <Video className="h-4 w-4 mr-1" />
                        {t.join}
                      </Button>
                    ) : (
                      <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground text-center">
                        {nextAppointment.location || formatVisitContext(nextAppointment.visitType) || 'In-person'}
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

    // 3. Prescriptions card - promote if has active prescriptions
    const prescriptionPriority = activePrescriptions > 0 ? 60 : 20;
    result.push({
      id: 'prescriptions',
      priority: prescriptionPriority,
      component: (
        <Card
          role="button"
          tabIndex={0}
          onClick={() => onNavigateTo('care')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigateTo('care');
            }
          }}
          className="h-full border-l-4 border-l-primary transition-all duration-200 hover:shadow-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-purple-600" />
                {t.prescriptions}
              </span>
              {activePrescriptions > 0 && (
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
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
      )
    });

    // 4. AI Assistant / Booking card
    result.push({
      id: 'assistant',
      priority: 30,
      component: (
        <Card
          role="button"
          tabIndex={0}
          onClick={hasAIChat ? onOpenAssistant : onBookAppointment}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              hasAIChat ? onOpenAssistant?.() : onBookAppointment?.();
            }
          }}
          className={cn(
            "h-full transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2",
            hasAIChat
              ? "bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 dark:from-emerald-900/10 dark:to-emerald-900/5 border-emerald-200/50"
              : "bg-gradient-to-br from-orange-50/50 to-orange-100/30 dark:from-orange-900/10 dark:to-orange-900/5 border-orange-200/50"
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
      )
    });

    return result;
  }, [nextAppointment, activePrescriptions, totalDueCents, unpaid, hasAIChat, currencySettings, t, onNavigateTo, onOpenAssistant, onBookAppointment]);

  // Calculate new order - only update if priorities change significantly
  useEffect(() => {
    const newOrder = [...cards]
      .sort((a, b) => b.priority - a.priority)
      .map(c => c.id);

    // On first render, set the order
    if (initialRenderRef.current) {
      setStableOrder(newOrder);
      initialRenderRef.current = false;
      return;
    }

    // Only update order if priorities have meaningfully changed
    // This prevents jitter from minor re-renders
    const currentPriorities = stableOrder.map(id => cards.find(c => c.id === id)?.priority || 0);
    const newPriorities = newOrder.map(id => cards.find(c => c.id === id)?.priority || 0);

    const hasSignificantChange = currentPriorities.some((p, i) => 
      Math.abs(p - newPriorities[i]) > 20
    );

    if (hasSignificantChange || stableOrder.length === 0) {
      setStableOrder(newOrder);
    }
  }, [cards, stableOrder]);

  // Use stable order for rendering
  const orderedCards = useMemo(() => {
    if (stableOrder.length === 0) {
      return cards.sort((a, b) => b.priority - a.priority);
    }
    return stableOrder.map(id => cards.find(c => c.id === id)).filter(Boolean) as CardData[];
  }, [stableOrder, cards]);

  return (
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
  );
};
