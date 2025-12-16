import { useState, useEffect, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User as UserIcon, Calendar, Camera, Mail, ImageIcon, Mic, Square } from "lucide-react";
import { ChatMessage } from "@/types/chat";
import { PhotoUpload } from "@/components/PhotoUpload";
import { DentistSelection } from "@/components/DentistSelection";
import { QuickPhotoUpload } from "@/components/QuickPhotoUpload";
import { PatientSelection } from "@/components/PatientSelection";
import { ChatAppointmentManager } from "@/components/chat/ChatAppointmentManager";
import { ChatBookingFlow } from "@/components/chat/ChatBookingFlow";
import { ChatSettingsManager } from "@/components/chat/ChatSettingsManager";
import { generateSymptomSummary } from "@/lib/symptoms";
import { generateMedicalRecordFromChat, createMedicalRecord } from "@/lib/medicalRecords";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { RecommendedDentistWidget } from "@/components/chat/RecommendedDentistWidget";
import { logger } from '@/lib/logger';

interface DentalChatbotProps {
  user: User | null;
  triggerBooking?: boolean;
  onBookingTriggered?: () => void;
  onScrollToDentists?: () => void;
}

export const DentalChatbot = ({ user, triggerBooking, onBookingTriggered, onScrollToDentists }: DentalChatbotProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [currentFlow, setCurrentFlow] = useState<'chat' | 'booking' | 'photo' | 'dentist-selection' | 'quick-photo' | 'patient-selection' | 'chat-booking'>('chat');
  const [lastPhotoUrl, setLastPhotoUrl] = useState<string | null>(null);
  const [selectedDentist, setSelectedDentist] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [problemDescription, setProblemDescription] = useState<string>("");
  const [questionsAsked, setQuestionsAsked] = useState<number>(0);
  const [recommendedDentist, setRecommendedDentist] = useState<string[] | null>(null);
  const [patientInfo, setPatientInfo] = useState<any>(null);
  const [isForUser, setIsForUser] = useState<boolean>(true);
  const [isEmergency, setIsEmergency] = useState(false);
  const [emergencyDetected, setEmergencyDetected] = useState(false);
  const [urgencyLevel, setUrgencyLevel] = useState<string>("medium");

  // Ref to track mounted state for cleanup
  const isMountedRef = useRef(true);
  const [consultationReason, setConsultationReason] = useState<string>("");
  const [actionButtons, setActionButtons] = useState<any[]>([]);
  const [showChatBooking, setShowChatBooking] = useState(false);
  const [symptomSummary, setSymptomSummary] = useState<string>("");
  const [activeWidget, setActiveWidget] = useState<string>("");

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const { toast } = useToast();
  const { t } = useLanguage();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Declare functions first
  const addChatResponse = (message: string, buttons?: any[]) => {
    const botMessage: ChatMessage = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      message,
      is_bot: true,
      message_type: "text",
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, botMessage]);
    if (buttons) {
      setActionButtons(buttons);
    }
    saveMessage(botMessage);
  };

  // Initialize chat managers
  const appointmentManager = user ? ChatAppointmentManager({ user, onResponse: addChatResponse }) : null;
  const settingsManager = user ? ChatSettingsManager({ user, onResponse: addChatResponse }) : null;

  useEffect(() => {
    // Load user profile and set welcome message only once
    const initializeChat = async () => {
      if (user) {
        await loadUserProfile();
      }

      // Only add welcome message if no messages exist
      if (messages.length === 0) {
        const welcomeMessage: ChatMessage = {
          id: crypto.randomUUID(),
          session_id: sessionId,
          message: user && userProfile ?
            t.detailedWelcomeMessageWithName(userProfile.first_name) :
            t.detailedWelcomeMessage,
          is_bot: true,
          message_type: "text",
          created_at: new Date().toISOString(),
        };
        setMessages([welcomeMessage]);
      }
    };

    // Only run on mount or when sessionId changes
    if (messages.length === 0) {
      initializeChat();
    }
  }, [sessionId]); // Fixed dependencies

  // Effect to update welcome message when language changes
  useEffect(() => {
    if (messages.length > 0 && messages[0].is_bot && userProfile) {
      // Update the first message (welcome message) when language changes
      const updatedWelcomeMessage: ChatMessage = {
        ...messages[0],
        message: t.detailedWelcomeMessageWithName(userProfile.first_name),
      };

      setMessages(prev => [updatedWelcomeMessage, ...prev.slice(1)]);
    }
  }, [t.detailedWelcomeMessageWithName, userProfile?.first_name]); // Fixed dependencies

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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addSystemMessage = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const systemMessage: ChatMessage = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      message,
      is_bot: true,
      message_type: type,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, systemMessage]);
    saveMessage(systemMessage);
  };

  // Handle external booking trigger
  useEffect(() => {
    if (triggerBooking) {
      if (!user) {
        // Show login requirement message
        const loginMessage: ChatMessage = {
          id: crypto.randomUUID(),
          session_id: sessionId,
          message: "Vous devez vous connecter pour prendre un rendez-vous. Cliquez sur le bouton 'Se connecter' en haut à droite.",
          is_bot: true,
          message_type: "text",
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, loginMessage]);
      } else {
        setCurrentFlow('patient-selection');
      }
      onBookingTriggered?.();
    }
  }, [triggerBooking, onBookingTriggered, user, sessionId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const saveMessage = async (message: ChatMessage) => {
    if (!user) return; // Don't save messages for non-authenticated users

    try {
      await supabase.from("messages").insert({
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

  const generateBotResponse = async (userMessage: string): Promise<ChatMessage> => {
    try {
      // Get business_id from current URL or settings
      let businessId = null;
      try {
        const { data: businesses } = await supabase
          .from('businesses')
          .select('id')
          .limit(1)
          .single();

        if (businesses) {
          businessId = businesses.id;
        }
      } catch (businessError) {
        logger.warn('Could not fetch business ID:', businessError);
      }

      // Get patient context if user is logged in
      let patientContext = null;
      if (user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (profile) {
            const { data, error } = await supabase.rpc('get_patient_context_for_ai', {
              p_patient_id: profile.id
            });

            if (!error && data) {
              patientContext = data;
            }
          }
        } catch (contextError) {
          logger.error('Error loading patient context:', contextError);
        }
      }

      // Call the AI edge function with patient context
      const { data, error } = await supabase.functions.invoke('dental-ai-chat', {
        body: {
          message: userMessage,
          conversation_history: messages.slice(-10),
          user_profile: userProfile || (user ? {
            name: user.email?.split('@')[0] || 'Patient',
            email: user.email
          } : {
            name: 'Guest',
            email: null
          }),
          patient_context: patientContext,
          business_id: businessId
        }
      });

      if (error) {
        logger.error('AI function error:', error);
        throw error;
      }

      const response = data.response || "I'm sorry, I couldn't process your request.";
      const suggestions = data.suggestions || [];
      const aiRecommendedDentist = data.recommended_dentist || null;

      // Handle AI recommended dentist - show widget when we have recommendations
      if (suggestions.includes('recommend-dentist') && aiRecommendedDentist && aiRecommendedDentist.length > 0) {
        const dentistData = Array.isArray(aiRecommendedDentist) ? aiRecommendedDentist[0] : aiRecommendedDentist;
        setRecommendedDentist([dentistData]);

        setTimeout(() => {
          const widgetMessage: ChatMessage = {
            id: crypto.randomUUID(),
            session_id: sessionId,
            message: JSON.stringify({
              type: 'recommended-dentist-widget',
              dentist: dentistData,
              symptoms: userMessage,
              matchReason: data.match_reason
            }),
            is_bot: true,
            message_type: "widget",
            created_at: new Date().toISOString(),
          };
          setMessages(prev => [...prev, widgetMessage]);
        }, 500);
      }

      // Extract consultation reason from AI response
      const extractedReason = data.consultation_reason || "";
      if (extractedReason) {
        setConsultationReason(extractedReason);
      }

      // Handle different suggestion types
      if (suggestions.includes('appointments-list')) {
        addSystemMessage("🗓️ You can manage your appointments by clicking on the 'Appointments' tab above", 'info');
      } else if (suggestions.includes('skip-patient-selection')) {
        setTimeout(() => setCurrentFlow('dentist-selection'), 2000);
      } else if (suggestions.includes('booking') && currentFlow === 'chat') {
        if (!user) {
          // Show login requirement message
          setTimeout(() => {
            const loginMessage: ChatMessage = {
              id: crypto.randomUUID(),
              session_id: sessionId,
              message: "Vous devez vous connecter pour prendre un rendez-vous. Cliquez sur le bouton 'Se connecter' en haut à droite.",
              is_bot: true,
              message_type: "text",
              created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, loginMessage]);
          }, 1000);
        } else {
          setTimeout(() => setCurrentFlow('patient-selection'), 2000);
        }
      } else if (suggestions.includes('recommend-dentist')) {
        if (!user) {
          // Show login requirement message
          setTimeout(() => {
            const loginMessage: ChatMessage = {
              id: crypto.randomUUID(),
              session_id: sessionId,
              message: "Vous devez vous connecter pour prendre un rendez-vous. Cliquez sur le bouton 'Se connecter' en haut à droite.",
              is_bot: true,
              message_type: "text",
              created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, loginMessage]);
          }, 1000);
        } else {
          // For recommendations, ask the question in chat instead of showing UI
          setTimeout(() => {
            const questionMessage: ChatMessage = {
              id: crypto.randomUUID(),
              session_id: sessionId,
              message: "Pour qui souhaitez-vous prendre ce rendez-vous ? Tapez 'moi' si c'est pour vous, ou donnez-moi le nom et l'âge de la personne (ex: 'ma fille Sarah, 8 ans').",
              is_bot: true,
              message_type: "text",
              created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, questionMessage]);
          }, 1000);
          // Don't automatically scroll - let the conversation flow naturally
        }
      }

      // Handle patient selection from chat response
      if (suggestions.includes('skip-patient-selection')) {
        const lowerUserMessage = userMessage.toLowerCase();

        if (userMessage.includes('moi') || userMessage.includes('me') ||
          userMessage.includes('myself') || userMessage.includes('voor mij') ||
          userMessage.includes('for me')) {
          // User selected themselves
          setIsForUser(true);
          setPatientInfo(userProfile);
          addSystemMessage("Rendez-vous sera pris pour vous", 'success');
          setTimeout(() => setCurrentFlow('dentist-selection'), 1000);
        } else {
          // Try to parse patient info from message
          const parsePatientInfo = (message: string) => {
            const lowerMsg = message.toLowerCase();
            let name = '';
            let age = 0;
            let relationship = '';

            // Extract age
            const ageMatch = message.match(/\d+/);
            if (ageMatch) {
              age = parseInt(ageMatch[0]);
            }

            // Extract relationship and name
            if (lowerMsg.includes('ma fille') || lowerMsg.includes('my daughter') || lowerMsg.includes('mijn dochter')) {
              relationship = 'child';
              const nameMatch = message.match(/(?:ma fille|my daughter|mijn dochter)\s+([a-zA-ZÀ-ÿ\u0100-\u017F]+)/i);
              if (nameMatch) name = nameMatch[1];
            } else if (lowerMsg.includes('mon fils') || lowerMsg.includes('my son') || lowerMsg.includes('mijn zoon')) {
              relationship = 'child';
              const nameMatch = message.match(/(?:mon fils|my son|mijn zoon)\s+([a-zA-ZÀ-ÿ\u0100-\u017F]+)/i);
              if (nameMatch) name = nameMatch[1];
            } else if (lowerMsg.includes('ma femme') || lowerMsg.includes('my wife')) {
              relationship = 'spouse';
              const nameMatch = message.match(/(?:ma femme|my wife)\s+([a-zA-ZÀ-ÿ\u0100-\u017F]+)/i);
              if (nameMatch) name = nameMatch[1];
            } else if (lowerMsg.includes('mon mari') || lowerMsg.includes('my husband')) {
              relationship = 'spouse';
              const nameMatch = message.match(/(?:mon mari|my husband)\s+([a-zA-ZÀ-ÿ\u0100-\u017F]+)/i);
              if (nameMatch) name = nameMatch[1];
            }

            return { name: name || 'Patient', age: age || 25, relationship: relationship || 'other' };
          };

          const parsedInfo = parsePatientInfo(userMessage);
          setIsForUser(false);
          setPatientInfo(parsedInfo);
          addSystemMessage(`Rendez-vous sera pris pour ${parsedInfo.name}`, 'success');
          setTimeout(() => setCurrentFlow('dentist-selection'), 1000);
        }
      }

      const botMessage = {
        id: crypto.randomUUID(),
        session_id: sessionId,
        message: response,
        is_bot: true,
        message_type: "text",
        metadata: {
          ai_generated: true,
          suggestions
        },
        created_at: new Date().toISOString(),
      };

      return botMessage;

    } catch (error) {
      logger.error('Error calling AI:', error);

      // Fallback to simple responses
      const lowerMessage = userMessage.toLowerCase();
      let response = "";

      if (lowerMessage.includes("appointment") || lowerMessage.includes("booking") ||
        lowerMessage.includes("pain") || lowerMessage.includes("hurt") ||
        lowerMessage.includes("problem") || lowerMessage.includes("issue")) {
        response = "What's the exact problem? I'll help you find the right dentist and book an appointment that typically takes 30-60 minutes.";
        if (user) {
          setTimeout(() => setCurrentFlow('patient-selection'), 1000);
        }
      } else {
        response = `What can I do for you?

🗓️ Book an appointment
❓ Answer your questions

Type your request...`;
      }

      return {
        id: crypto.randomUUID(),
        session_id: sessionId,
        message: response,
        is_bot: true,
        message_type: "text",
        created_at: new Date().toISOString(),
      };
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      message: inputMessage,
      is_bot: false,
      message_type: "text",
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage("");
    setIsLoading(true);
    setActionButtons([]); // Clear action buttons when new message is sent

    // Save user message
    try {
      await saveMessage(userMessage);
    } catch (error) {
      logger.error('Failed to save user message:', error);
      // Continue with chat flow even if save fails
    }

    // Check for chat commands first
    if (user && handleChatCommands(currentInput)) {
      setIsLoading(false);
      return;
    }

    // Generate bot response
    const timeoutId = setTimeout(async () => {
      try {
        const botResponse = await generateBotResponse(userMessage.message);

        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setMessages(prev => [...prev, botResponse]);
        }
        try {
          await saveMessage(botResponse);
        } catch (error) {
          logger.error('Failed to save bot response:', error);
        }
      } catch (error) {
        logger.error('Error generating bot response:', error);
        // Add fallback message
        const fallbackMessage: ChatMessage = {
          id: crypto.randomUUID(),
          session_id: sessionId,
          message: "I'm sorry, I couldn't process your request. Please try again.",
          is_bot: true,
          message_type: "text",
          created_at: new Date().toISOString(),
        };

        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setMessages(prev => [...prev, fallbackMessage]);
        }
        try {
          await saveMessage(fallbackMessage);
        } catch (error) {
          logger.error('Failed to save fallback message:', error);
        }
      } finally {
        // Only update loading state if component is still mounted
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    }, 1000);
  };

  const handleChatCommands = (message: string): boolean => {
    const lowerMessage = message.toLowerCase();

    // Appointment management commands
    if (lowerMessage.includes('show') && (lowerMessage.includes('appointment') || lowerMessage.includes('rendez-vous'))) {
      appointmentManager?.showAppointments();
      return true;
    }

    if (lowerMessage.includes('next appointment') || lowerMessage.includes('prochain rendez-vous')) {
      appointmentManager?.showAppointments();
      return true;
    }

    if (lowerMessage.includes('book') && lowerMessage.includes('appointment')) {
      setShowChatBooking(true);
      return true;
    }

    // Settings commands
    if (settingsManager?.processSettingsCommand(message)) {
      return true;
    }

    return false;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleActionButton = (action: string, data?: any) => {
    setActionButtons([]);

    switch (action) {
      case 'book_appointment':
        setShowChatBooking(true);
        break;
      case 'cancel_appointment':
        if (data?.appointmentId) {
          appointmentManager?.cancelAppointment(data.appointmentId);
        }
        break;
      case 'reschedule_appointment':
        if (data?.appointmentId) {
          appointmentManager?.rescheduleAppointment(data.appointmentId);
        }
        break;
      default:
        break;
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await processVoiceMessage(audioBlob);

        // Stop all tracks
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setMediaStream(null);
        }
      };

      setMediaRecorder(recorder);
      setMediaStream(stream);
      setAudioChunks(chunks);
      recorder.start();
      setIsRecording(true);

      toast({
        title: "🎤 Enregistrement en cours",
        description: "Parlez maintenant...",
      });

    } catch (error) {
      logger.error('Error starting recording:', error);
      toast({
        title: t.error,
        description: t.microphoneAccessError,
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  // Cleanup media stream on component unmount
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream]);

  // Cleanup component mounted state
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const processVoiceMessage = async (audioBlob: Blob) => {
    try {
      setIsLoading(true);

      // Convert audio to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Send to voice-to-text edge function
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio }
      });

      if (error) throw error;

      const transcribedText = data.text;

      if (transcribedText && transcribedText.trim()) {
        // Create user message with transcribed text
        const userMessage: ChatMessage = {
          id: crypto.randomUUID(),
          session_id: sessionId,
          message: transcribedText,
          is_bot: false,
          message_type: "voice",
          created_at: new Date().toISOString(),
        };

        setMessages(prev => [...prev, userMessage]);
        await saveMessage(userMessage);

        // Generate bot response
        setTimeout(async () => {
          const botResponse = await generateBotResponse(transcribedText);
          setMessages(prev => [...prev, botResponse]);
          await saveMessage(botResponse);
          setIsLoading(false);
        }, 1000);

        toast({
          title: "✅ Message vocal reçu",
          description: `"${transcribedText}"`,
        });
      } else {
        toast({
          title: "Aucun texte détecté",
          description: "Veuillez réessayer",
          variant: "destructive",
        });
        setIsLoading(false);
      }

    } catch (error) {
      logger.error('Error processing voice message:', error);
      toast({
        title: t.error,
        description: t.voiceProcessingError,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleVoiceOrSend = () => {
    if (inputMessage.trim()) {
      handleSendMessage();
    } else {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }
  };



  return (
    <div className="flex flex-col h-full max-h-[600px] bg-white rounded-lg border shadow-sm">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Caberu Assistant</h3>
            <p className="text-sm text-gray-600">How can I help you today?</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsRecording(!isRecording)}
            className={`${isRecording ? 'bg-red-100 text-red-600' : ''}`}
          >
            <Mic className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4 space-y-4">
        {messages.map((message) => {
          // Check if this is a widget message
          if (message.message_type === 'widget' && message.is_bot) {
            try {
              const widgetData = JSON.parse(message.message);

              if (widgetData.type === 'recommended-dentist-widget') {
                return (
                  <div key={message.id} className="my-4">
                    <RecommendedDentistWidget
                      dentist={widgetData.dentist}
                      matchReason={widgetData.matchReason}
                      symptoms={widgetData.symptoms}
                      onSelectDentist={(dentist) => {
                        setSelectedDentist(dentist);
                        setShowChatBooking(true);
                      }}
                      onSeeAlternatives={() => {
                        setCurrentFlow('dentist-selection');
                      }}
                    />
                  </div>
                );
              }
            } catch (e) {
              logger.error('Error parsing widget data:', e);
            }
          }

          // Regular message rendering
          return (
            <div
              key={message.id}
              className={`flex ${message.is_bot ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.is_bot
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                  }`}
              >
                <div className="flex items-start gap-2">
                  {message.is_bot && (
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    {message.is_bot ? (
                      <MarkdownRenderer content={message.message} />
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.message}
                      </p>
                    )}
                    {(message.metadata as any)?.ai_generated && (
                      <div className="mt-2 text-xs opacity-70">
                        AI Assistant
                      </div>
                    )}
                  </div>
                  {!message.is_bot && (
                    <div className="w-6 h-6 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <UserIcon className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Action Buttons */}
      {actionButtons.length > 0 && (
        <div className="p-4 border-t bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {actionButtons.map((button, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleActionButton(button.action, button.data)}
                className="rounded-full"
              >
                {button.icon && <button.icon className="w-4 h-4 mr-2" />}
                {button.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="pr-12 rounded-full border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              disabled={isLoading}
            />
            {isRecording && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
          <Button
            onClick={handleVoiceOrSend}
            disabled={isLoading || (!inputMessage.trim() && !isRecording)}
            className="rounded-full w-10 h-10 p-0 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          >
            {isRecording ? (
              <Square className="w-4 h-4 text-white" />
            ) : inputMessage.trim() ? (
              <Send className="w-4 h-4 text-white" />
            ) : (
              <Mic className="w-4 h-4 text-white" />
            )}
          </Button>
        </div>
      </div>

      {/* Chat Booking Flow Modal */}
      {showChatBooking && user && (
        <div className="absolute inset-0 z-50 bg-background">
          <ChatBookingFlow
            user={user}
            selectedDentist={selectedDentist}
            conversationHistory={messages}
            onComplete={(appointmentData) => {
              setShowChatBooking(false);

              // Add confirmation message to chat
              const confirmationMsg: ChatMessage = {
                id: crypto.randomUUID(),
                session_id: sessionId,
                message: appointmentData.message || "Appointment confirmed!",
                is_bot: true,
                message_type: "text",
                created_at: new Date().toISOString(),
              };
              setMessages(prev => [...prev, confirmationMsg]);
            }}
            onCancel={() => {
              setShowChatBooking(false);

              // Add cancellation message
              const cancelMsg: ChatMessage = {
                id: crypto.randomUUID(),
                session_id: sessionId,
                message: "Booking cancelled. How else can I help you?",
                is_bot: true,
                message_type: "text",
                created_at: new Date().toISOString(),
              };
              setMessages(prev => [...prev, cancelMsg]);
            }}
            onResponse={(message) => {
              // Add AI response to chat
              const aiMsg: ChatMessage = {
                id: crypto.randomUUID(),
                session_id: sessionId,
                message,
                is_bot: true,
                message_type: "text",
                created_at: new Date().toISOString(),
              };
              setMessages(prev => [...prev, aiMsg]);
            }}
          />
        </div>
      )}
    </div>
  );
};
