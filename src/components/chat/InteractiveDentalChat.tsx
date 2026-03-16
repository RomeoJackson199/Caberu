import { useState, useEffect, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Send, Bot, Info } from "lucide-react";
import { ChatMessage } from "@/types/chat";
import { format } from "date-fns";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { ChatLoadingIndicator } from "./ChatLoadingIndicator";
import { generateBotResponse } from "./aiUtils";
import {
  PrivacyConsentWidget,
  InlineCalendarWidget,
  TimeSlotsWidget,
  DentistSelectionWidget,
  AppointmentConfirmationWidget,
  PersonalInfoFormWidget,
} from "./InteractiveChatWidgets";
import { AIChatOnboardingDialog } from "./AIChatOnboardingDialog";
import { BookingReadyWidget } from "./BookingReadyWidget";
import { AppointmentSuccessWidget } from "./AppointmentSuccessWidget";
import { createAppointmentDateTime } from "@/lib/timezone";
import { logger } from '@/lib/logger';

interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}

interface DentistWithProfile {
  id: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface AppointmentData {
  id?: string;
  date?: Date;
  time?: string;
  dentist?: DentistWithProfile;
  reason?: string;
  [key: string]: unknown;
}

interface PrescriptionData {
  id: string;
  [key: string]: unknown;
}

interface InteractiveDentalChatProps {
  user: User | null;
  triggerBooking?: 'low' | 'medium' | 'high' | 'emergency' | false;
  onBookingTriggered?: () => void;
}

interface WidgetData {
  dentists?: DentistWithProfile[];
  recommendedDentists?: string[];
  availableTimeSlots?: TimeSlot[];
  slots?: TimeSlot[];
  selectedDentist?: DentistWithProfile;
  urgency?: number;
  outstandingAmount?: number;
  appointment?: AppointmentData;
  prescriptions?: PrescriptionData[];
  recommendedService?: string;
  symptomSummary?: string;
  [key: string]: unknown;
}

interface BookingFlowState {
  reason: string;
  selectedDentist: DentistWithProfile | null;
  selectedDate: Date | null;
  selectedTime: string;
  urgency: number;
  step: string;
}

export const InteractiveDentalChat = ({ 
  user, 
  triggerBooking, 
  onBookingTriggered 
}: InteractiveDentalChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const streamingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [hasConsented, setHasConsented] = useState(true);
  const [showConsentWidget, setShowConsentWidget] = useState(!user);
  const [activeWidget, setActiveWidget] = useState<string | null>(null);
  const [widgetData, setWidgetData] = useState<WidgetData>({});
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCustomAI, setHasCustomAI] = useState(false);
  const [customGreeting, setCustomGreeting] = useState<string | null>(null);
  const [isAIConfigLoaded, setIsAIConfigLoaded] = useState(false);
  const [userHasSentMessage, setUserHasSentMessage] = useState(false);

  // Booking flow state
  const [bookingFlow, setBookingFlow] = useState<BookingFlowState>({
    reason: '',
    selectedDentist: null,
    selectedDate: null,
    selectedTime: '',
    urgency: 1,
    step: 'dentist'
  });

  useLanguage();
  const { toast } = useToast();
  const { businessId, businessName } = useBusinessContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeWidget]);

  useEffect(() => {
    if (user) {
      setHasConsented(true);
      setShowConsentWidget(false);
      loadUserProfile();
      initializeChat();

      // Check database first, then localStorage as fallback
      const checkOnboardingStatus = async () => {
        const hasSeenLocally = localStorage.getItem("ai-chat-onboarding-seen");
        if (hasSeenLocally) return;
        
        try {
          const { data } = await supabase
            .from('tour_completions')
            .select('id')
            .eq('user_id', user.id)
            .eq('tour_type', 'ai-chat-onboarding')
            .maybeSingle();
          
          if (data) {
            // User completed tour before, sync localStorage
            localStorage.setItem('ai-chat-onboarding-seen', 'true');
            return;
          }
        } catch (error) {
          console.error('Failed to check tour status:', error);
        }
        
        // Show the guided AI introduction the first time users open the assistant
        const timeout = setTimeout(() => setShowOnboarding(true), 400);
        return () => clearTimeout(timeout);
      };
      
      checkOnboardingStatus();
    } else {
      setShowConsentWidget(true);
    }
  }, [user, isAIConfigLoaded, customGreeting]);

  useEffect(() => {
    if (triggerBooking && hasConsented) {
      if (triggerBooking === 'high' || triggerBooking === 'emergency') {
        startEmergencyBookingWithUrgency(triggerBooking);
      } else {
        startBookingFlow();
      }
      onBookingTriggered?.();
    }
  }, [triggerBooking, hasConsented, onBookingTriggered]);

  // Check if business has custom AI settings
  useEffect(() => {
    const loadAIConfig = async () => {
      try {
        // Resolve effective business ID
        let effectiveBusinessId = businessId;
        
        // If no businessId from context, try to get from URL slug
        if (!effectiveBusinessId) {
          const pathSegments = window.location.pathname.split('/').filter(Boolean);
          const slug = pathSegments[0];
          
          if (slug && slug !== 'chat' && slug !== 'dashboard') {
            const { data: businessBySlug } = await supabase
              .from('businesses')
              .select('id')
              .eq('slug', slug)
              .single();
            effectiveBusinessId = businessBySlug?.id || null;
          }
          
          // Final fallback to first active business
          if (!effectiveBusinessId) {
            const { data: firstBusiness } = await supabase
              .from('businesses')
              .select('id')
              .limit(1)
              .single();
            effectiveBusinessId = firstBusiness?.id || null;
          }
        }

        if (effectiveBusinessId) {
          const { data, error } = await supabase
            .from('businesses')
            .select('ai_greeting, ai_system_behavior, ai_personality_traits')
            .eq('id', effectiveBusinessId)
            .single();

          if (!error && data) {
            const hasCustomization = !!(
              data.ai_greeting ||
              data.ai_system_behavior ||
              (data.ai_personality_traits && (data.ai_personality_traits as string[]).length > 0)
            );
            setHasCustomAI(hasCustomization);
            
            // Store custom greeting for initial message
            if (data.ai_greeting) {
              setCustomGreeting(data.ai_greeting);
            }
          }
        }
      } catch (error) {
        logger.debug('Could not check AI customization:', error);
      } finally {
        setIsAIConfigLoaded(true);
      }
    };

    loadAIConfig();
  }, [businessId]);

  // Clean up streaming interval on unmount
  useEffect(() => {
    return () => {
      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current);
      }
    };
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const streamBotMessage = (
    botMessage: ChatMessage,
    onComplete: () => void
  ) => {
    const fullText = botMessage.message;
    // Split into tokens (words + whitespace) for smooth word-by-word reveal
    const tokens = fullText.split(/(\s+)/);
    let tokenIndex = 0;

    // Add message with empty text first
    setMessages(prev => [...prev, { ...botMessage, message: '' }]);
    setStreamingMessageId(botMessage.id);

    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
    }

    // Reveal ~2-3 tokens per tick at 25ms for a natural ~80 wpm feel
    streamingIntervalRef.current = setInterval(() => {
      tokenIndex = Math.min(tokenIndex + 3, tokens.length);
      const currentText = tokens.slice(0, tokenIndex).join('');

      setMessages(prev =>
        prev.map(m => m.id === botMessage.id ? { ...m, message: currentText } : m)
      );

      if (tokenIndex >= tokens.length) {
        clearInterval(streamingIntervalRef.current!);
        streamingIntervalRef.current = null;
        setStreamingMessageId(null);
        onComplete();
      }
    }, 25);
  };

  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      logger.error("Error loading user profile:", error);
    }
  };

  const initializeChat = () => {
    // Only initialize if AI config is loaded and no messages yet
    if (messages.length === 0 && isAIConfigLoaded) {
      // Use custom greeting if available, otherwise use default
      const defaultGreeting = user && userProfile ?
        `Hello ${userProfile.first_name}! 👋 I'm your booking assistant. Tell me about your symptoms or concerns and I'll help you book an appointment.` :
        `Hello! 👋 Welcome to First Smile AI. I'm your booking assistant — tell me about your dental concerns and I'll help you book an appointment. I don't provide medical advice.`;
      
      const welcomeMessage: ChatMessage = {
        id: crypto.randomUUID(),
        session_id: sessionId as any,
        message: customGreeting || defaultGreeting,
        is_bot: true,
        message_type: "text",
        created_at: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
    }
  };

  const saveMessage = async (message: ChatMessage) => {
    if (!user) return;
    
    try {
      await supabase.from("chat_messages").insert({
        session_id: message.session_id,
        user_id: user.id,
        message: message.message,
        is_bot: message.is_bot,
        message_type: message.message_type,
        metadata: message.metadata as any,
      });
    } catch (error) {
      logger.error("Error saving message:", error);
    }
  };

  const addBotMessage = (message: string, type: 'text' | 'success' | 'info' | 'warning' = 'text') => {
    const botMessage: ChatMessage = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      message,
      is_bot: true,
      message_type: type,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, botMessage]);
    saveMessage(botMessage);
  };


  const handleSuggestions = (suggestions: string[], recommendedDentists?: string[], recommendedService?: string, symptomSummary?: string) => {
    if (!suggestions || suggestions.length === 0) {
      return;
    }

    suggestions.forEach(suggestion => {
      const normalizedSuggestion = suggestion.toLowerCase().trim();

      // AI is restricted to booking only - only handle booking-ready widget
      if (normalizedSuggestion === 'booking-ready') {
        setActiveWidget('booking-ready');
        // Store recommended service and symptoms in widgetData
        setWidgetData(prev => ({
          ...prev,
          recommendedService,
          symptomSummary
        }));
      }
      // All other suggestions are ignored - AI only books appointments
    });
  };

  const handleConsent = (accepted: boolean) => {
    if (!accepted) {
      addBotMessage("Please log in to continue using First Smile AI.");
      setShowConsentWidget(false);
      return;
    }

    setHasConsented(true);
    setShowConsentWidget(false);
    addBotMessage("Welcome to First Smile AI! 🎉 Please log in to book appointments and access all features.");
  };


  const startBookingFlow = () => {
    if (!user) {
      addBotMessage(
        "Please log in to book an appointment. You can find the login button at the top right of the page."
      );
      return;
    }

    setBookingFlow({
      ...bookingFlow,
      reason: '',
      selectedDentist: null,
      selectedDate: null,
      selectedTime: '',
      step: 'reason'
    });

  };

  const startEmergencyBooking = () => {
    if (!user) {
      addBotMessage("Please log in to book an emergency appointment.");
      return;
    }

    setBookingFlow({ ...bookingFlow, reason: 'emergency', urgency: 3, step: 'dentist' });
    addBotMessage("🚨 **Emergency Booking** - I'll find you the earliest available slot with any dentist.");
    loadDentistsForBooking(true);
  };

  const startEmergencyBookingWithUrgency = (urgencyLevel: 'low' | 'medium' | 'high' | 'emergency') => {
    if (!user) {
      addBotMessage("Please log in to book an emergency appointment.");
      return;
    }

    const urgencyScore = urgencyLevel === 'emergency' ? 5 : 
                        urgencyLevel === 'high' ? 4 : 
                        urgencyLevel === 'medium' ? 3 : 2;

    setBookingFlow({ 
      ...bookingFlow, 
      reason: `${urgencyLevel} priority appointment`, 
      urgency: urgencyScore, 
      step: 'dentist' 
    });
    
    const urgencyMessage = urgencyLevel === 'emergency' ? 
      "🚨 **EMERGENCY** - Finding immediate care with available dentist..." :
      `⚡ **${urgencyLevel.toUpperCase()} PRIORITY** - Finding urgent appointment with available dentist...`;
    
    addBotMessage(urgencyMessage);
    loadDentistsForBooking(true); // Auto-select first available dentist for urgent cases
  };

  const loadDentistsForBooking = async (autoSelect = false, recommendedDentists?: string[]) => {
    try {
      const { data, error } = await supabase
        .from("dentists")
        .select(`
          id,
          specialization,
          profiles:profile_id (
            first_name,
            last_name
          )
        `)
        .eq("is_active", true);

      if (error) throw error;
      
      if (autoSelect && data && data.length > 0) {
        handleDentistSelection(data[0]);
      } else {
        setBookingFlow(prev => ({ ...prev, step: 'dentist' }));
        setWidgetData({ dentists: (data as unknown as DentistWithProfile[]) || [], recommendedDentists });
        setActiveWidget('dentist-selection');
        addBotMessage("Please choose your preferred dentist:");
      }
      
    } catch (error) {
      logger.error("Error fetching dentists:", error);
      addBotMessage("I couldn't load the dentist list. Please try again.");
    }
  };


  const handleDentistSelection = (dentist: any) => {
    setBookingFlow({ ...bookingFlow, selectedDentist: dentist, step: 'date' });
    setActiveWidget(null);
    
    addBotMessage(`Perfect! You selected **Dr. ${dentist.profiles?.first_name} ${dentist.profiles?.last_name}** 👨‍⚕️`);
    
    setTimeout(() => {
      setActiveWidget('calendar');
      addBotMessage("Now, please select your preferred date:");
    }, 1000);
  };

  const handleDateSelection = async (date: Date) => {
    if (!bookingFlow.selectedDentist) {
      toast({
        title: "Please select a dentist first",
        description: "Opening dentist selection...",
        variant: "destructive"
      });
      // Re-open dentist selection widget
      setActiveWidget('recommend-dentist');
      addBotMessage("Please select a dentist first before choosing a date.");
      return;
    }

    setBookingFlow({ ...bookingFlow, selectedDate: date, step: 'time' });
    setActiveWidget(null);

    const dateStr = format(date, 'yyyy-MM-dd');
    
    addBotMessage(`Date selected: **${format(date, "EEEE, MMMM d, yyyy")}** 📅`);
    addBotMessage("Loading available times... ⏳");
    
    try {
      // Use dynamic availability (working hours - vacations - booked appointments)
      
      // Import the availability function
      const { fetchDentistAvailability } = await import('@/lib/appointmentAvailability');
      
      // Get real availability data including appointments, vacation, and working hours
      const availabilitySlots = await fetchDentistAvailability(
        bookingFlow.selectedDentist.id,
        date
      );

      // Map to the widget format
      const slots = availabilitySlots.map(slot => ({
        time: slot.time.substring(0, 5), // Format: "HH:mm"
        available: slot.available && (bookingFlow.urgency >= 4 ? true : (slot.reason as string) !== 'emergency_only'),
        reason: slot.reason
      }));

      setWidgetData({ slots });
      
      const availableCount = slots.filter(s => s.available).length;
      
      // Always show time slots; no negative messages
      setActiveWidget('time-slots');
      addBotMessage("Please choose your preferred time:");
      
  } catch (error) {
    logger.error("Error fetching slots - Full error:", error);
    logger.error("Error details:", {
      dentistId: bookingFlow.selectedDentist?.id,
      date: dateStr,
      dentist: bookingFlow.selectedDentist
    });
    
    toast({
      title: "Couldn't load available times",
      description: "Please try again or select another dentist",
      variant: "destructive",
      duration: 5000,
    });
    
    addBotMessage("I couldn't load the available times. Please try selecting another dentist or a different date.");
    setTimeout(() => setActiveWidget('recommend-dentist'), 1000);
  }
};

  const handleTimeSelection = (time: string) => {
    setBookingFlow({ ...bookingFlow, selectedTime: time, step: 'confirm' });
    setActiveWidget(null);

    addBotMessage(`Time selected: **${time}** 🕐`);

    setTimeout(async () => {
      const appointmentData = {
        date: bookingFlow.selectedDate || undefined,
        time: time,
        dentist: bookingFlow.selectedDentist || undefined,
        reason: bookingFlow.reason
      };
      setWidgetData({ appointment: appointmentData });
      setActiveWidget('appointment-confirmation');
      addBotMessage("Please review and confirm your appointment:");
    }, 1000);
  };

  const handleAppointmentConfirmation = async () => {
    if (!user || !bookingFlow.selectedDate || !bookingFlow.selectedTime || !bookingFlow.selectedDentist) {
      addBotMessage("Missing information. Please start the booking process again.");
      return;
    }

    setActiveWidget(null);
    addBotMessage("Booking your appointment... ⏳");

    try {
      let profile;
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, phone, email")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingProfile) {
        // Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            email: user.email,
            first_name: '',
            last_name: ''
          })
          .select("id, first_name, last_name, phone, email")
          .single();
        
        if (createError) throw createError;
        profile = newProfile;
      } else {
        profile = existingProfile;
      }

      // Only require essential fields for booking (phone is optional)
      const requiredFields = ['first_name', 'last_name', 'email'] as const;
      const missingFields = requiredFields.filter(field => !(profile as Record<string, unknown>)[field]);
      
      if (missingFields.length > 0) {
        addBotMessage("I need some additional information to complete your booking. Please update your profile first.");
        setTimeout(() => setActiveWidget('personal-info'), 1000);
        return;
      }

      const appointmentDateTime = createAppointmentDateTime(
        bookingFlow.selectedDate,
        bookingFlow.selectedTime
      );

      // Generate AI appointment reason from conversation
      let appointmentReason = bookingFlow.reason || "General consultation";
      if (messages.length > 0) {
        try {
          const { generateAppointmentReason } = await import("@/lib/symptoms");
          const aiReason = await generateAppointmentReason(
            messages as any,
            { id: profile.id, first_name: profile.first_name, last_name: profile.last_name } as any
          );
          if (aiReason && aiReason !== "General consultation") {
            appointmentReason = aiReason;
          }
        } catch (err) {
          logger.error('Failed to generate AI reason:', err);
        }
      }

      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          patient_id: profile.id,
          dentist_id: bookingFlow.selectedDentist.id,
          appointment_date: appointmentDateTime.toISOString(),
          reason: appointmentReason,
          status: "confirmed",
           urgency: bookingFlow.urgency >= 5 ? "emergency" : 
                   bookingFlow.urgency === 4 ? "high" : 
                   bookingFlow.urgency === 3 ? "medium" : "low"
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Link all chat messages from this session to the appointment
      try {
        await supabase
          .from('chat_messages')
          .update({ appointment_id: appointmentData.id })
          .eq('session_id', sessionId)
          .eq('user_id', user.id);
      } catch (linkError) {
        logger.error('Error linking chat messages to appointment:', linkError);
        // Don't throw - appointment was successful, linking is supplementary
      }

      // No slot table reservation needed - dynamic availability handles double-booking prevention
      // The appointment insert itself is the source of truth for availability

      toast({
        title: "Appointment Confirmed! 🎉",
        description: `${format(bookingFlow.selectedDate, "EEEE, MMMM d")} at ${bookingFlow.selectedTime}`
      });

      // Show success widget with navigation options
      const dentistProfileData = (bookingFlow.selectedDentist.profiles as unknown) as { first_name: string; last_name: string } | null;
      setWidgetData({
        appointment: {
          date: format(bookingFlow.selectedDate, "EEEE, MMMM d, yyyy") as unknown as Date,
          time: bookingFlow.selectedTime,
          dentistName: `Dr. ${dentistProfileData?.first_name || ''} ${dentistProfileData?.last_name || ''}`,
          reason: appointmentReason
        }
      });
      setActiveWidget('appointment-success');

      const confirmationMessage = `🎉 **Appointment Confirmed!**

📅 **Date:** ${format(bookingFlow.selectedDate, "EEEE, MMMM d, yyyy")}
🕒 **Time:** ${bookingFlow.selectedTime}
👨‍⚕️ **Dentist:** Dr. ${bookingFlow.selectedDentist.profiles?.first_name} ${bookingFlow.selectedDentist.profiles?.last_name}
📝 **Reason:** ${appointmentReason}

You'll receive a confirmation email shortly.`;

      addBotMessage(confirmationMessage, 'success');

      // Reset booking flow
      setBookingFlow({
        reason: '',
        selectedDentist: null,
        selectedDate: null,
        selectedTime: '',
        urgency: 1,
        step: 'dentist'
      });



  } catch (error) {
    logger.error("Error booking appointment:", error);
    addBotMessage("I'm sorry, I couldn't complete your booking. Please try again or contact the clinic directly.");
  }
};

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !hasConsented) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      message: inputMessage,
      is_bot: false,
      message_type: "text",
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setUserHasSentMessage(true);
    const currentInput = inputMessage.toLowerCase();
    setInputMessage("");
    setIsLoading(true);

  await saveMessage(userMessage);

  if (bookingFlow.step === 'reason') {
    if (!bookingFlow.reason) {
      setBookingFlow({
        ...bookingFlow,
        reason: userMessage.message
      });
    }
    // Wait for AI suggestions before continuing the booking flow
  }


    const history = [...messages, userMessage].slice(-10);

    const { message: botResponse, fallback, suggestions, recommendedDentists, recommendedService, symptomSummary } = await generateBotResponse(
      userMessage.message,
      history,
      sessionId,
      userProfile,
      user,
      businessId
    );

    setIsLoading(false);

    streamBotMessage(botResponse, async () => {
      await saveMessage(botResponse);
      if (suggestions && suggestions.length > 0) {
        handleSuggestions(suggestions, recommendedDentists, recommendedService, symptomSummary);
      }
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderWidget = () => {
    if (!activeWidget) return null;

    switch (activeWidget) {
      
      case 'dentist-selection':
        return (
          <DentistSelectionWidget
            dentists={widgetData.dentists || []}
            onSelect={handleDentistSelection}
            recommendedDentists={widgetData.recommendedDentists}
          />
        );
      
      case 'calendar':
        return (
          <InlineCalendarWidget
            selectedDate={bookingFlow.selectedDate || undefined}
            onDateSelect={handleDateSelection}
            dentistId={bookingFlow.selectedDentist?.id}
            dentistName={bookingFlow.selectedDentist ? 
              `Dr. ${bookingFlow.selectedDentist.profiles?.first_name} ${bookingFlow.selectedDentist.profiles?.last_name}` : 
              undefined
            }
          />
        );
      
      case 'time-slots':
        return (
          <TimeSlotsWidget
            slots={widgetData.slots || []}
            selectedTime={bookingFlow.selectedTime}
            onTimeSelect={handleTimeSelection}
          />
        );
      
      case 'appointment-confirmation':
        return (
          <AppointmentConfirmationWidget
            appointment={widgetData.appointment}
            onConfirm={handleAppointmentConfirmation}
            onCancel={() => {
              setActiveWidget(null);
              addBotMessage("Appointment cancelled. Would you like to try a different time?");
            }}
          />
        );
      
      case 'personal-info':
        return user ? (
          <PersonalInfoFormWidget
            user={user}
            onSave={(data) => {
              setActiveWidget(null);
              addBotMessage("✅ Your information has been updated successfully!");
              toast({
                title: "Success",
                description: "Personal information saved"
              });
            }}
            onCancel={() => {
              setActiveWidget(null);
              addBotMessage("Information update cancelled.");
            }}
          />
        ) : null;
      
      case 'booking-ready':
        return (
          <BookingReadyWidget
            conversationData={{
              symptoms: widgetData.symptomSummary || bookingFlow.reason,
              urgency: bookingFlow.urgency,
              messages: messages,
              recommendedService: widgetData.recommendedService
            }}
          />
        );
      
      case 'appointment-success':
        return widgetData?.appointment ? (
          <AppointmentSuccessWidget
            appointmentDetails={widgetData.appointment as unknown as { date: string; time: string; dentistName: string; reason: string }}
            onBookAnother={() => {
              setActiveWidget(null);
              setBookingFlow({
                reason: '',
                selectedDentist: null,
                selectedDate: null,
                selectedTime: '',
                urgency: 1,
                step: 'dentist'
              });
              startBookingFlow();
            }}
          />
        ) : null;

      default:
        return null;
    }
  };

  if (showConsentWidget) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 p-4 flex items-center justify-center">
          <PrivacyConsentWidget
            onAccept={() => handleConsent(true)}
            onDecline={() => handleConsent(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* AI Chat Onboarding Dialog */}
      <AIChatOnboardingDialog 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
      />
      
      {/* Header with bot info */}
      {!userHasSentMessage && (
        <div className="border-b bg-card/80 backdrop-blur-sm p-3 flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary">
                <Info className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 text-sm" side="bottom" align="start">
              <p className="font-semibold mb-1">AI Dental Assistant</p>
              <p className="text-muted-foreground leading-relaxed">
                This assistant collects your symptoms and concerns before your visit. Your responses are summarized and shared with the dentist so they arrive informed and prepared — saving time and improving your care.
              </p>
            </PopoverContent>
          </Popover>
          {hasCustomAI && businessName && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
              <Bot className="h-3 w-3 mr-1" />
              Powered by {businessName}
            </Badge>
          )}
        </div>
      )}
      
      <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-background to-muted/20">
        <div className="space-y-4 max-w-4xl mx-auto pb-4">
          {messages.map((message) => (
            <ChatMessageBubble
              key={message.id}
              message={message}
              isStreaming={streamingMessageId === message.id}
            />
          ))}

          {isLoading && <ChatLoadingIndicator />}
          
          {activeWidget && (
            <div className="mt-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {renderWidget()}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="border-t bg-card/50 backdrop-blur-sm p-4">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <Input
            placeholder="Type your message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 bg-background/50 border-input/50 focus:border-primary transition-colors"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!inputMessage.trim() || isLoading}
            size="icon"
            className="h-10 w-10 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
