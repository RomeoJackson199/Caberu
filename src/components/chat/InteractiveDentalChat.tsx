import { useState, useEffect, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, changeLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User as UserIcon, Mic, MicOff, CheckCircle, Calendar } from "lucide-react";
import { ChatMessage } from "@/types/chat";
import { format } from "date-fns";
import {
  PrivacyConsentWidget,
  InlineCalendarWidget,
  TimeSlotsWidget,
  DentistSelectionWidget,
  AppointmentConfirmationWidget,
  PersonalInfoFormWidget,
  QuickSettingsWidget,
  ImageUploadWidget,
  UrgencySliderWidget,
  PayNowWidget,
  RescheduleWidget,
  CancelAppointmentWidget,
  PrescriptionRefillWidget
} from "./InteractiveChatWidgets";
import { AIChatOnboardingDialog } from "./AIChatOnboardingDialog";
import { BookingReadyWidget } from "./BookingReadyWidget";
import { AppointmentSuccessWidget } from "./AppointmentSuccessWidget";
import { createAppointmentDateTime } from "@/lib/timezone";
import { logger } from '@/lib/logger';
import { useNavigate } from "react-router-dom";

// Widget code mapping
const WIDGET_CODES: Record<string, string> = {
  '89902': 'recommend-dentist',
  '77843': 'pay-now',
  '66754': 'reschedule',
  '55621': 'cancel-appointment',
  '44598': 'prescription-refill',
  '33476': 'view-appointments',
  '12345': 'booking-ready',
};

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

  // Booking flow state
  const [bookingFlow, setBookingFlow] = useState<BookingFlowState>({
    reason: '',
    selectedDentist: null,
    selectedDate: null,
    selectedTime: '',
    urgency: 1,
    step: 'dentist'
  });

  const { t } = useLanguage();
  const { toast } = useToast();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
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

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
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
        `Hello ${userProfile.first_name}! 👋 I'm your dental assistant. How can I help you today?` : 
        `Hello! 👋 Welcome to First Smile AI. I'm your dental assistant. How can I help you today?`;
      
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

  const detectAndExtractCodes = (text: string): { 
    cleanedText: string; 
    detectedWidgets: string[];
    recommendedDentists: string[];
  } => {
    let cleanedText = text;
    const detectedWidgets: string[] = [];
    const recommendedDentists: string[] = [];
    
    // Detect and remove widget codes from text
    Object.entries(WIDGET_CODES).forEach(([code, widget]) => {
      const codeRegex = new RegExp(`\\b${code}\\b\\s*`, 'g');
      if (codeRegex.test(cleanedText)) {
        detectedWidgets.push(widget);
        // Remove the code from the displayed text
        cleanedText = cleanedText.replace(codeRegex, '');
      }
    });
    
    // Extract dentist recommendations from text
    const dentistNames = [
      'Virginie Pauwels',
      'Emeline Hubin', 
      'Firdaws Benhsain',
      'Justine Peters',
      'Anne-Sophie Haas'
    ];
    
    dentistNames.forEach(name => {
      if (cleanedText.toLowerCase().includes(name.toLowerCase())) {
        recommendedDentists.push(name);
      }
    });
    
    return { cleanedText, detectedWidgets, recommendedDentists };
  };

  const generateBotResponse = async (
    userMessage: string,
    history: ChatMessage[]
  ): Promise<{ message: ChatMessage; fallback: boolean; suggestions: string[]; recommendedDentists: string[] }> => {
    try {
      // Get business_id - fallback to first available business if not in context
      let effectiveBusinessId = businessId;
      if (!effectiveBusinessId) {
        const { data: businesses } = await supabase
          .from('businesses')
          .select('id')
          .limit(1)
          .single();
        effectiveBusinessId = businesses?.id || null;
      }

      logger.debug('Sending AI request with business_id:', effectiveBusinessId);

      // Use business context for AI customization
      const aiResponse = await supabase.functions.invoke('dental-ai-chat', {
        body: {
          message: userMessage,
          conversation_history: history,
          user_profile: userProfile || (user ? {
            name: user.email?.split('@')[0] || 'Patient',
            email: user.email
          } : {
            name: 'Guest',
            email: null
          }),
          business_id: effectiveBusinessId
        }
      });

      if (aiResponse.error) {
        logger.error('AI function error:', aiResponse.error);
        // If backend returned a JSON body, try to use it instead of failing hard
        if (!aiResponse.data) {
          throw aiResponse.error;
        }
      }

      const serverData = (aiResponse as any).data || {};
      const responseText = serverData.response || serverData.fallback_response || "";
      if (!responseText) {
        throw new Error('Empty AI response');
      }

      // Detect and extract widget codes from AI response (no forced codes)
      const { cleanedText, detectedWidgets, recommendedDentists } = detectAndExtractCodes(responseText);

      const result = {
        id: crypto.randomUUID(),
        session_id: sessionId as any,
        message: cleanedText,
        is_bot: true,
        message_type: 'text',
        created_at: new Date().toISOString(),
      } as ChatMessage;
      return {
        message: result,
        fallback: Boolean(aiResponse.data?.fallback_response && !aiResponse.data?.response),
        suggestions: detectedWidgets,
        recommendedDentists: recommendedDentists
      };
    } catch (error) {
      logger.error('Error generating AI response:', error);
      return {
        message: {
          id: crypto.randomUUID(),
          session_id: sessionId as any,
          message: "I'm sorry, I couldn't process your request.",
          is_bot: true,
          message_type: 'text',
          created_at: new Date().toISOString(),
        } as ChatMessage,
        fallback: true,
        suggestions: [],
        recommendedDentists: []
      };
    }
  };

  const handleSuggestions = (suggestions: string[], recommendedDentists?: string[]) => {
    if (!suggestions || suggestions.length === 0) {
      return;
    }
    
    suggestions.forEach(suggestion => {
      const normalizedSuggestion = suggestion.toLowerCase().trim();

      // Normalize appointment-related suggestions
      if (['view-appointments', 'appointments-list', 'show-appointments', 'appointments'].includes(normalizedSuggestion)) {
        setActiveWidget('view-appointments');
        showAppointments();
        return;
      }

      switch (normalizedSuggestion) {
        case 'recommend-dentist':
        case 'dentist-selection':
          setActiveWidget('recommend-dentist');
          loadDentistsForBooking(false, recommendedDentists);
          break;
        case 'book-appointment':
        case 'appointment-booking':
          setActiveWidget('book-appointment');
          startBookingFlow();
          break;
        case 'reschedule':
          setActiveWidget('reschedule');
          showRescheduleWidget();
          break;
        case 'cancel-appointment':
          setActiveWidget('cancel-appointment');
          showCancelAppointmentWidget();
          break;
        case 'pay-now':
          setActiveWidget('pay-now');
          showPayNowWidget();
          break;
        case 'prescription-refill':
          setActiveWidget('prescription-refill');
          showPrescriptionRefillWidget();
          break;
        case 'booking-ready':
          setActiveWidget('booking-ready');
          break;
        case 'theme-dark':
          setTheme('dark');
          addBotMessage('Theme changed to dark mode! 🌙');
          break;
        case 'theme-light':
          setTheme('light');
          addBotMessage('Theme changed to light mode! ☀️');
          break;
        case 'language-en':
          handleLanguageChange('en');
          break;
        case 'language-fr':
          handleLanguageChange('fr');
          break;
        case 'language-nl':
          handleLanguageChange('nl');
          break;
        case 'language-options':
          setActiveWidget('quick-settings');
          addBotMessage('Please choose your preferred language:');
          break;
        case 'theme-options':
          setActiveWidget('quick-settings');
          addBotMessage('Please select a theme:');
          break;
        default:
          // Unknown suggestion - do nothing
          break;
      }
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


  const showAppointments = async () => {
    if (!user) {
      addBotMessage("Please log in to view your appointments.");
      return;
    }

    addBotMessage("Let me check your appointments... 🔍");
    
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        addBotMessage("I couldn't find your profile. Please complete your profile first.");
        return;
      }

      const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          reason,
          status,
          notes,
          dentists:dentist_id (
            profiles:profile_id (
              first_name,
              last_name
            )
          )
        `)
        .eq("patient_id", profile.id)
        .order("appointment_date", { ascending: true });

      if (error) throw error;

      if (!appointments || appointments.length === 0) {
        addBotMessage("You don't have any appointments scheduled yet. Would you like to book one? 📅");
        return;
      }

      const now = new Date();
      const upcoming = appointments.filter(apt => new Date(apt.appointment_date) >= now);
      const past = appointments.filter(apt => new Date(apt.appointment_date) < now);

      let responseMessage = "";

      if (upcoming.length > 0) {
        responseMessage += `📅 **Your upcoming appointments:**\n\n`;
        upcoming.forEach((apt, index) => {
          const date = new Date(apt.appointment_date);
          const dentistProfiles = (apt.dentists as unknown as { profiles: { first_name: string; last_name: string } })?.profiles;
          const dentistName = dentistProfiles 
            ? `Dr. ${dentistProfiles.first_name} ${dentistProfiles.last_name}`
            : "Unknown dentist";
          
          responseMessage += `${index + 1}. **${format(date, "EEEE, MMMM d")}** at **${format(date, "h:mm a")}**\n`;
          responseMessage += `   👨‍⚕️ ${dentistName}\n`;
          responseMessage += `   📝 ${apt.reason}\n`;
          responseMessage += `   🔸 Status: ${apt.status}\n\n`;
        });
      }

      if (past.length > 0 && upcoming.length === 0) {
        responseMessage += `📋 **Your recent appointments:**\n\n`;
        past.slice(-3).forEach((apt, index) => {
          const date = new Date(apt.appointment_date);
          const dentistProfiles = (apt.dentists as unknown as { profiles: { first_name: string; last_name: string } })?.profiles;
          const dentistName = dentistProfiles 
            ? `Dr. ${dentistProfiles.first_name} ${dentistProfiles.last_name}`
            : "Unknown dentist";
          responseMessage += `${index + 1}. **${format(date, "EEEE, MMMM d")}** at **${format(date, "h:mm a")}**\n`;
          responseMessage += `   👨‍⚕️ ${dentistName}\n`;
          responseMessage += `   📝 ${apt.reason}\n\n`;
        });
        responseMessage += "\nNo upcoming appointments. Would you like to book one? 📅";
      }

      addBotMessage(responseMessage);
      


  } catch (error) {
    logger.error("Error fetching appointments:", error);
    addBotMessage("I'm sorry, I couldn't retrieve your appointments right now. Please try again later.");
  }
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

  const showHelp = () => {
    const helpMessage = `
**Here's what I can help you with:** ❓

🗓️ **Appointments**
- "Show my appointments"
- "Book an appointment"
- "Find earliest slot"

⚙️ **Settings**
- "Change language to English/French/Dutch"
- "Switch to dark/light mode"
- "Update my personal information"

📷 **Upload Images**
- "Upload a photo"
- Share X-rays or dental images

🚨 **Emergency**
- "Emergency booking" for urgent care

Just type what you need! 😊
    `;
    
    addBotMessage(helpMessage);
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
      // Ensure slots exist for this date and dentist
      await supabase.rpc('ensure_daily_slots', {
        p_dentist_id: bookingFlow.selectedDentist.id,
        p_date: dateStr
      });
      
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

      const { error: slotError } = await supabase.rpc('book_appointment_slot', {
        p_dentist_id: bookingFlow.selectedDentist.id,
        p_slot_date: format(bookingFlow.selectedDate, 'yyyy-MM-dd'),
        p_slot_time: bookingFlow.selectedTime,
        p_appointment_id: appointmentData.id
      });

      if (slotError) {
        await supabase.from("appointments").delete().eq("id", appointmentData.id);
        throw new Error("This time slot is no longer available");
      }

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


    if (currentInput.includes('help')) {
      showHelp();
      setIsLoading(false);
      return;
    }

    if (currentInput.includes('emergency') || currentInput.includes('urgent')) {
      startEmergencyBooking();
      setIsLoading(false);
      return;
    }

    const history = [...messages, userMessage].slice(-10);

    const { message: botResponse, fallback, suggestions, recommendedDentists } = await generateBotResponse(userMessage.message, history);

    setMessages(prev => [...prev, botResponse]);
    await saveMessage(botResponse);

    setIsLoading(false);

    if (suggestions && suggestions.length > 0) {
      handleSuggestions(suggestions, recommendedDentists);
    }
  };

  const handleLanguageChange = (lang: string) => {
    changeLanguage(lang as 'en' | 'fr' | 'nl');
    localStorage.setItem('preferred-language', lang);
    
    const langNames = {
      en: 'English',
      fr: 'French', 
      nl: 'Dutch'
    };
    
    addBotMessage(`✅ Language changed to ${langNames[lang as keyof typeof langNames]} successfully!`);
    
    toast({
      title: "Success",
      description: `Language changed to ${langNames[lang as keyof typeof langNames]}`
    });
  };

  const handlePayNow = async () => {
    if (!user) return;
    
    try {
      setActiveWidget(null);
      addBotMessage("Opening secure payment page... 💳");
      
      // Get user's profile and outstanding payments
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Get outstanding payment requests
      const { data: paymentRequests } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('patient_id', profile.id)
        .eq('status', 'pending')
        .limit(1);

      if (paymentRequests && paymentRequests.length > 0) {
        const paymentRequest = paymentRequests[0];
        
        const { data } = await supabase.functions.invoke('create-payment-request', {
          body: {
            payment_request_id: paymentRequest.id
          }
        });

        if (data?.payment_url) {
          window.open(data.payment_url, '_blank');
          addBotMessage("✅ Payment page opened in a new tab. Complete your payment there and I'll update your status!");
        }
      } else {
        addBotMessage("No outstanding payments found. Your account appears to be up to date! ✅");
      }
    } catch (error) {
      logger.error('Error initiating payment:', error);
      addBotMessage("Sorry, I couldn't open the payment page. Please try again or contact your dentist.");
    }
  };

  const handleReschedule = () => {
    setActiveWidget(null);
    addBotMessage("Let me help you reschedule your appointment. I'll start the booking process to find you a new slot!");
    
    // Start booking flow for rescheduling
    setTimeout(() => {
      startBookingFlow();
    }, 1000);
  };

  const handleCancelAppointment = async () => {
    if (!user || !widgetData?.appointment) return;
    
    try {
      setActiveWidget(null);
      addBotMessage("Cancelling your appointment... 🗓️");
      
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', widgetData.appointment.id);

      if (error) throw error;

      addBotMessage("✅ Your appointment has been cancelled successfully. If you need to book a new appointment, just let me know!");
      
    } catch (error) {
      logger.error('Error cancelling appointment:', error);
      addBotMessage("Sorry, I couldn't cancel your appointment. Please contact your dentist directly.");
    }
  };

  const handlePrescriptionRefill = async (prescriptionId: string) => {
    if (!user) return;
    
    try {
      setActiveWidget(null);
      addBotMessage("Sending refill request to your dentist... 💊");
      
      // Get prescription details
      const { data: prescription } = await supabase
        .from('prescriptions')
        .select('*, dentist_id')
        .eq('id', prescriptionId)
        .single();

      if (!prescription) throw new Error("Prescription not found");

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Create notification for dentist
      const { data: dentistProfile } = await supabase
        .from('dentists')
        .select('profile_id')
        .eq('id', prescription.dentist_id)
        .single();

      if (dentistProfile) {
        const { data: dentistUserProfile } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .eq('id', dentistProfile.profile_id)
          .single();

        if (dentistUserProfile) {
          await supabase
            .from('notifications')
            .insert({
              user_id: dentistUserProfile.user_id,
              patient_id: profile.id,
              dentist_id: prescription.dentist_id,
              type: 'prescription_refill',
              title: 'Prescription Refill Request',
              message: `Refill request for ${prescription.medication_name}`,
              priority: 'medium',
              metadata: { prescription_id: prescriptionId }
            });
        }
      }

      addBotMessage(`✅ Refill request sent for ${prescription.medication_name}! Your dentist will review and contact you soon.`);
      
    } catch (error) {
      logger.error('Error requesting refill:', error);
      addBotMessage("Sorry, I couldn't send the refill request. Please contact your dentist directly.");
    }
  };

  const showPayNowWidget = async () => {
    if (!user) {
      addBotMessage("Please log in to view your payment information.");
      return;
    }

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        addBotMessage("Profile not found. Please complete your profile first.");
        return;
      }

      // Get outstanding payment requests
      const { data: paymentRequests, error } = await supabase
        .from('payment_requests')
        .select('amount')
        .eq('patient_id', profile.id)
        .eq('status', 'pending');

      if (error) throw error;

      const totalOutstanding = paymentRequests?.reduce((sum, req) => sum + req.amount, 0) || 0;

      if (totalOutstanding === 0) {
        addBotMessage("Great news! You don't have any outstanding payments. Your account is up to date! ✅");
        return;
      }

      setWidgetData({ outstandingAmount: totalOutstanding });
      setActiveWidget('pay-now');
      addBotMessage("I found outstanding payments on your account. You can pay securely online:");

    } catch (error) {
      logger.error("Error fetching payment info:", error);
      addBotMessage("I couldn't retrieve your payment information. Please try again.");
    }
  };

  const showRescheduleWidget = async () => {
    if (!user) {
      addBotMessage("Please log in to reschedule your appointment.");
      return;
    }

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        addBotMessage("Profile not found. Please complete your profile first.");
        return;
      }

      // Get next upcoming appointment
      const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          reason,
          dentists (
            profiles:profile_id (
              first_name,
              last_name
            )
          )
        `)
        .eq("patient_id", profile.id)
        .gte("appointment_date", new Date().toISOString())
        .eq("status", "confirmed")
        .order("appointment_date", { ascending: true })
        .limit(1);

      if (error) throw error;

      if (!appointments || appointments.length === 0) {
        addBotMessage("You don't have any upcoming appointments to reschedule. Would you like to book a new appointment?");
        return;
      }

      const appointment = appointments[0];
      const dentistProfiles = (appointment.dentists as unknown as { profiles: { first_name: string; last_name: string } })?.profiles;
      const dentistName = dentistProfiles ? 
        `${dentistProfiles.first_name} ${dentistProfiles.last_name}` : 
        "Your dentist";

      setWidgetData({ 
        appointment: { 
          ...appointment, 
          dentist_name: dentistName 
        } 
      });
      setActiveWidget('reschedule');
      addBotMessage("I found your next appointment. Would you like to reschedule it?");

    } catch (error) {
      logger.error("Error fetching appointment:", error);
      addBotMessage("I couldn't retrieve your appointment information. Please try again.");
    }
  };

  const showCancelAppointmentWidget = async () => {
    if (!user) {
      addBotMessage("Please log in to cancel your appointment.");
      return;
    }

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        addBotMessage("Profile not found. Please complete your profile first.");
        return;
      }

      // Get next upcoming appointment
      const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          reason,
          dentists (
            profiles:profile_id (
              first_name,
              last_name
            )
          )
        `)
        .eq("patient_id", profile.id)
        .gte("appointment_date", new Date().toISOString())
        .eq("status", "confirmed")
        .order("appointment_date", { ascending: true })
        .limit(1);

      if (error) throw error;

      if (!appointments || appointments.length === 0) {
        addBotMessage("You don't have any upcoming appointments to cancel.");
        return;
      }

      const appointment = appointments[0];
      const dentistProfiles = (appointment.dentists as unknown as { profiles: { first_name: string; last_name: string } })?.profiles;
      const dentistName = dentistProfiles ? 
        `${dentistProfiles.first_name} ${dentistProfiles.last_name}` : 
        "Your dentist";

      setWidgetData({ 
        appointment: { 
          ...appointment, 
          dentist_name: dentistName 
        } 
      });
      setActiveWidget('cancel-appointment');
      addBotMessage("I found your next appointment. Are you sure you want to cancel it?");

    } catch (error) {
      logger.error("Error fetching appointment:", error);
      addBotMessage("I couldn't retrieve your appointment information. Please try again.");
    }
  };

  const showPrescriptionRefillWidget = async () => {
    if (!user) {
      addBotMessage("Please log in to request prescription refills.");
      return;
    }

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        addBotMessage("Profile not found. Please complete your profile first.");
        return;
      }

      // Get recent prescriptions (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: prescriptions, error } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', profile.id)
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      setWidgetData({ prescriptions: prescriptions || [] });
      setActiveWidget('prescription-refill');
      
      if (!prescriptions || prescriptions.length === 0) {
        addBotMessage("I couldn't find any recent prescriptions. You can still request a refill - I'll help you contact your dentist.");
      } else {
        addBotMessage("I found your recent prescriptions. Which one would you like to refill?");
      }

    } catch (error) {
      logger.error("Error fetching prescriptions:", error);
      addBotMessage("I couldn't retrieve your prescription information. Please try again.");
    }
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
      
      case 'quick-settings':
        return (
          <QuickSettingsWidget
            onLanguageChange={handleLanguageChange}
            onThemeChange={(theme) => {
              setTheme(theme);
              addBotMessage(`✅ Theme changed to ${theme} mode!`);
            }}
          />
        );
      
      case 'image-upload':
        return (
          <ImageUploadWidget
            onUpload={(file) => {
              setActiveWidget(null);
              addBotMessage(`✅ Image "${file.name}" uploaded successfully! I'll analyze it and get back to you.`);
            }}
            onCancel={() => {
              setActiveWidget(null);
              addBotMessage("Image upload cancelled.");
            }}
          />
        );

      case 'pay-now':
        return (widgetData?.outstandingAmount ?? 0) > 0 ? (
          <PayNowWidget
            outstandingAmount={widgetData?.outstandingAmount ?? 0}
            onPay={handlePayNow}
            onCancel={() => {
              setActiveWidget(null);
              addBotMessage("Payment cancelled. You can pay your balance anytime from your dashboard.");
            }}
          />
        ) : null;

      case 'reschedule':
        return widgetData?.appointment ? (
          <RescheduleWidget
            appointment={widgetData.appointment}
            onReschedule={handleReschedule}
            onCancel={() => {
              setActiveWidget(null);
              addBotMessage("Keeping your current appointment. If you need to reschedule later, just let me know!");
            }}
          />
        ) : null;

      case 'cancel-appointment':
        return widgetData?.appointment ? (
          <CancelAppointmentWidget
            appointment={widgetData.appointment}
            onConfirm={handleCancelAppointment}
            onCancel={() => {
              setActiveWidget(null);
              addBotMessage("Your appointment is still scheduled. If you need to cancel later, just let me know!");
            }}
          />
        ) : null;

      case 'prescription-refill':
        return (
          <PrescriptionRefillWidget
            prescriptions={widgetData?.prescriptions || []}
            onRequestRefill={handlePrescriptionRefill}
            onCancel={() => {
              setActiveWidget(null);
              addBotMessage("Prescription refill request cancelled. You can request refills anytime!");
            }}
          />
        );

      case 'urgency-slider':
        return (
          <UrgencySliderWidget
            value={bookingFlow.urgency}
            onChange={(value) => {
              setBookingFlow({ ...bookingFlow, urgency: value });
              setActiveWidget(null);
              addBotMessage(`Urgency level set to ${value}/5. Let me help you with your appointment.`);
              loadDentistsForBooking(false);
            }}
          />
        );

      case 'booking-ready':
        return (
          <BookingReadyWidget
            conversationData={{
              symptoms: bookingFlow.reason,
              urgency: bookingFlow.urgency,
              messages: messages
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
      
      {/* Header with booking toggle */}
      <div className="border-b bg-card/80 backdrop-blur-sm p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-base">AI Dental Assistant</h2>
          {hasCustomAI && businessName && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
              <Bot className="h-3 w-3 mr-1" />
              Powered by {businessName}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            navigate('/book-appointment');
          }}
          className="text-xs text-muted-foreground hover:text-primary"
        >
          <Calendar className="h-4 w-4 mr-1" />
          Switch to Classic Booking
        </Button>
      </div>
      
      <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-background to-muted/20">
        <div className="space-y-4 max-w-4xl mx-auto pb-4">
          {messages.map((message) => {
            const timestamp = message.created_at ? new Date(message.created_at) : null;
            const timestampAlignment = message.is_bot
              ? "self-start text-left"
              : "self-end text-right";

            return (
              <div
                key={message.id}
                className={`flex ${message.is_bot ? "justify-start" : "justify-end"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`flex items-start gap-3 max-w-[85%] ${
                    message.is_bot ? "" : "flex-row-reverse"
                  }`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {message.is_bot ? (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 shadow-sm">
                        <Bot className="w-5 h-5 text-primary" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/80 to-secondary flex items-center justify-center shadow-sm">
                        <UserIcon className="w-5 h-5 text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                  <Card className={`border-none shadow-md ${
                    message.is_bot
                      ? "bg-card/80 backdrop-blur-sm"
                      : "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground"
                  }`}>
                    <CardContent className="p-4 flex flex-col gap-2">
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</div>
                      {timestamp && (
                        <time
                          dateTime={timestamp.toISOString()}
                          title={format(timestamp, "PPpp")}
                          className={`text-xs text-muted-foreground ${timestampAlignment}`}
                        >
                          {format(timestamp, "p")}
                        </time>
                      )}
                      {message.message_type === 'success' && (
                        <Badge
                          variant="secondary"
                          className={`bg-green-100 text-green-800 border-green-200 ${
                            message.is_bot ? "self-start" : "self-end"
                          }`}
                        >
                          <span aria-hidden="true" className="mr-1">
                            ✓
                          </span>
                          Success
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            );
          })}
          
          {isLoading && (
            <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-start gap-3 max-w-[85%]">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 shadow-sm">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <Card className="bg-card/80 backdrop-blur-sm border-none shadow-md">
                  <CardContent className="p-4">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          
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
            disabled={isLoading}
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
