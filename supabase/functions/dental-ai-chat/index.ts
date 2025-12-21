import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Add type definitions at the top of the file
interface MedicalRecord {
  visit_date: string;
  record_type: string;
  title: string;
  description?: string;
  findings?: string;
  recommendations?: string;
}

interface ClinicalNote {
  created_at: string;
  content: string;
}

interface TreatmentPlan {
  title: string;
  status: string;
  priority: string;
  description?: string;
  diagnosis?: string;
  estimated_duration_weeks?: number;
  estimated_cost?: number;
  start_date?: string;
  treatment_steps?: any;
}

interface PatientContext {
  medical_history?: MedicalRecord[];
  notes?: ClinicalNote[];
  treatment_plans?: TreatmentPlan[];
}

// CORS configuration - permissive for all environments
const getCorsHeaders = () => {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

const corsHeaders = getCorsHeaders();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversation_history, user_profile, patient_context, mode, business_id } = await req.json();

    // Log request in development only
    if (Deno.env.get('ENVIRONMENT') === 'development') {
      console.log('Received request:', { message, user_profile, mode });
    }
    
    // Enhanced input validation
    if (!message || typeof message !== 'string') {
      throw new Error('Invalid message format');
    }
    
    // Sanitize input to prevent injection attacks
    const sanitizedMessage = message
      .trim()
      .replace(/[<>]/g, '') // Basic XSS protection
      .substring(0, 2000); // Limit message length
    
    if (sanitizedMessage.length === 0) {
      throw new Error('Message cannot be empty');
    }

    // Helper functions to determine when to show widgets
    const buildConversationContext = (msg: string, history: any[] = []): string => {
      const historyText = (history || []).map((m) => (m.message || m.content || '')).join(' ');
      return `${historyText} ${msg}`.toLowerCase();
    };

    const hasPatientInfo = (context: string): boolean => {
      // English
      if (/\b(for me|myself|for my (child|daughter|son|wife|husband|partner|mom|mother|dad|father))\b/i.test(context)) return true;
      if (/\b(my (child|daughter|son|wife|husband|partner))\b/i.test(context)) return true;
      // French
      if (/(pour moi|ma fille|mon fils|ma femme|mon mari|mon enfant|ma mère|mon père)/i.test(context)) return true;
      // Dutch
      if (/(voor mij|mijn dochter|mijn zoon|mijn vrouw|mijn man|mijn kind|mijn moeder|mijn vader)/i.test(context)) return true;
      return false;
    };

    const hasSymptomInfo = (context: string): boolean => {
      const patterns = [
        // English
        /tooth( |-)?(ache|pain|hurts|sensitive|sensitivity)/i,
        /gum(s)? (pain|bleeding|swelling|swollen)/i,
        /cavity|decay|broken tooth|chipped tooth|lost filling|wisdom tooth/i,
        /orthodontic|braces|align(ment)?|invisalign/i,
        /cleaning|check[- ]?up|whitening|cosmetic/i,
        // French
        /mal aux dents|douleur dentaire|dents sensibles|sensibilit\u00e9/i,
        /gencives? (douleur|saignent|gonfl(\u00e9|ee)s?)/i,
        /carie|dent cass\u00e9e|plombage perdu|dent de sagesse/i,
        /orthodontie|appareils?|alignement|invisalign/i,
        /nettoyage|contr\u00f4le|blanchiment|esth\u00e9tique/i,
        // Dutch
        /kiespijn|tandpijn|gevoelige tanden|gevoeligheid/i,
        /tanden?vlees (pijn|bloeden|gezwollen)/i,
        /gaatje|tandbederf|gebroken tand|afgebroken tand|vulling kwijt|verstandskies/i,
        /orthodontie|beugel|uitlijning|invisalign/i,
        /reiniging|controle|bleken|cosmetisch/i,
      ];
      return patterns.some((p) => p.test(context));
    };

    // Check if Lovable API key is available
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not found');
      return new Response(JSON.stringify({ 
        response: "AI service is currently unavailable. Please try again later.",
        suggestions: [],
        urgency_detected: false,
        emergency_detected: false,
        recommended_dentist: [],
        consultation_reason: "General consultation"
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Optimized language detection with caching
    const detectLanguage = (text: string): string => {
      const lowercaseText = text.toLowerCase().trim();
      
      // Check for obvious language indicators first
      if (/bonjour|merci|dentiste|rendez-vous|douleur|mal aux dents/i.test(text)) return 'fr';
      if (/hallo|tandarts|afspraak|pijn|kiezen/i.test(text)) return 'nl';
      if (/hello|dentist|appointment|teeth|tooth|pain/i.test(text)) return 'en';
      
      // Simplified keyword matching for performance
      const frenchCount = (text.match(/\b(bonjour|merci|dentiste|rendez-vous|dents|douleur|mal|pour|avec|bien|très)\b/gi) || []).length;
      const dutchCount = (text.match(/\b(hallo|tandarts|afspraak|tanden|pijn|graag|kan|ik|ben|van)\b/gi) || []).length;
      const englishCount = (text.match(/\b(hello|dentist|appointment|teeth|tooth|pain|help|can|with|have)\b/gi) || []).length;

      if (frenchCount > dutchCount && frenchCount > englishCount) return 'fr';
      if (dutchCount > englishCount) return 'nl';
      return 'en';
    };

    const detectedLanguage = detectLanguage(sanitizedMessage); // Use sanitized message
          // Language detection logging for development
      if (Deno.env.get('ENVIRONMENT') === 'development') {
        console.log('Detected language:', detectedLanguage);
      }

    // Fetch AI settings and knowledge documents if business_id is provided
    let knowledgeBaseContent = '';
    let customGreeting = '';
    let customSystemBehavior = '';
    let customPersonalityTraits: string[] = [];
    let servicesContent = '';
    
    if (business_id) {
      try {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch business AI settings
        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .select('ai_greeting, ai_system_behavior, ai_personality_traits, currency')
          .eq('id', business_id)
          .single();

        if (!businessError && business) {
          customGreeting = business.ai_greeting || '';
          customSystemBehavior = business.ai_system_behavior || '';
          customPersonalityTraits = (business.ai_personality_traits as string[]) || [];
          
          if (Deno.env.get('ENVIRONMENT') === 'development') {
            console.log('Loaded custom AI settings from business');
          }
        }

        // Fetch business services
        const { data: services, error: servicesError } = await supabase
          .from('business_services')
          .select('id, name, description, price_cents, currency, duration_minutes, category')
          .eq('business_id', business_id)
          .eq('is_active', true)
          .order('name');

        if (!servicesError && services && services.length > 0) {
          const formatPrice = (cents: number, currency: string) => {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
          };
          
          servicesContent = `\n\nAVAILABLE SERVICES:\nThe clinic offers these services. When patients ask about booking or what you offer, mention relevant services:\n${services.map(s => `- ${s.name}: ${s.description || 'No description'} | Price: ${formatPrice(s.price_cents, s.currency)} | Duration: ${s.duration_minutes || 30} minutes`).join('\n')}\n\nIMPORTANT: When proceeding to booking (code 12345), always mention which service seems most appropriate for the patient's needs and include the service details in your summary.`;
          
          if (Deno.env.get('ENVIRONMENT') === 'development') {
            console.log(`Loaded ${services.length} business services`);
          }
        }

        // Fetch knowledge documents
        const { data: documents, error: docError } = await supabase
          .from('ai_knowledge_documents')
          .select('file_name, content')
          .eq('business_id', business_id)
          .eq('status', 'active');

        if (!docError && documents && documents.length > 0) {
          knowledgeBaseContent = `\n\nKNOWLEDGE BASE:\nYou have access to the following business documentation. Use this information to provide accurate and specific answers:\n\n${documents.map(doc => `Document: ${doc.file_name}\n${doc.content || '[Content pending extraction]'}`).join('\n\n---\n\n')}`;
          
          if (Deno.env.get('ENVIRONMENT') === 'development') {
            console.log(`Loaded ${documents.length} knowledge documents`);
          }
        }
      } catch (error) {
        console.error('Error fetching AI settings or knowledge documents:', error);
        // Continue with defaults if there's an error
      }
    }

    // Language-specific content
    const getLanguageContent = (lang: string) => {
      // Build personality traits intro for persona
      const personalityIntro = customPersonalityTraits.length > 0
        ? ` You are ${customPersonalityTraits.join(', ').toLowerCase()}.`
        : '';

      // Build personality traits section (reinforced)
      const personalitySection = customPersonalityTraits.length > 0
        ? `\n\nPERSONALITY TRAITS (IMPORTANT - embody these in EVERY response):\n${customPersonalityTraits.map(trait => `- ${trait}: Ensure your tone and language reflects this characteristic`).join('\n')}\n\nRemember: ALWAYS maintain these personality traits throughout the entire conversation.`
        : '';

      // Build custom behavior section
      const customBehaviorSection = customSystemBehavior
        ? `\n\nCUSTOM BEHAVIOR INSTRUCTIONS:\n${customSystemBehavior}`
        : '';

      switch(lang) {
        case 'nl':
          return {
            persona: customGreeting || `Je bent DentiBot, een professionele tandheelkundige virtuele assistent.${personalityIntro} Je kent de patiënt ${user_profile?.first_name} ${user_profile?.last_name} en kunt hen helpen met het boeken, wijzigen of annuleren van afspraken.`,
            guidelines: `
BELANGRIJKE INSTRUCTIES:
- Je kent de patiënt: ${user_profile?.first_name} ${user_profile?.last_name}
- VOOR ALLE INTERACTIES: Laat de conversatie natuurlijk verlopen
- VOOR NIEUWE AFSPRAKEN: Verzamel eerst voldoende informatie voordat je tandarts aanbevelingen doet
  - Vraag eerst wie de afspraak is voor (patiënt zelf, kind, partner, etc.)
  - Vraag dan naar specifieke symptomen of behoeften
  - WACHT op hun antwoord voordat je tandarts aanbevelingen doet
  - STEL ALLEEN ÉÉN VRAAG tegelijk
- NOOIT specifieke tandartsnamen noemen - laat het systeem aanbevelingen afhandelen
- NOOIT praten over tijd of beschikbaarheid - focus op symptomen

WIDGET CODE SYSTEEM - OPTIONEEL:
Dit systeem ondersteunt TECHNISCHE CODES die widgets activeren wanneer nodig.
Gebruik deze codes ALLEEN wanneer je daadwerkelijk een widget wilt tonen:

BESCHIKBARE CODES:
- 12345 = Klaar om te boeken widget (gebruik wanneer je genoeg informatie hebt verzameld en klaar bent om door te gaan naar boeking)
- 89902 = Tandarts aanbevelingen widget (gebruik ALLEEN als je voldoende info hebt om een tandarts aan te bevelen)
- 77843 = Betalingen widget
- 66754 = Afspraak herplannen widget
- 55621 = Afspraak annuleren widget
- 44598 = Recepten widget
- 33476 = Afspraken bekijken widget

GEBRUIK:
Als je een widget wilt tonen, begin je antwoord met de code:
"12345 Perfect! Ik heb alle informatie die ik nodig heb om u te helpen een afspraak te maken."

Als je GEEN widget nodig hebt, gebruik dan GEEN code:
"Wie is de afspraak voor? Voor uzelf of voor iemand anders?"

BELANGRIJK:
- Gebruik code 12345 wanneer je: 1) Weet voor wie de afspraak is, EN 2) Symptomen/reden voor bezoek hebt verzameld
- Gebruik codes ALLEEN wanneer je een widget wilt activeren
- Voor algemene vragen en informatie verzamelen: GEEN code
- Codes zijn onzichtbaar voor de gebruiker`,
            
            dentists: ``,
            
            examples: `
PROFESSIONELE TAALVOORBEELDEN:
- "Goedendag ${user_profile?.first_name}! Hoe kan ik u vandaag helpen met uw tandheelkundige zorg?"
- "Ik begrijp dat u [symptoom] ervaart. Kunt u me meer vertellen over wanneer dit begon en hoe het aanvoelt?"
- "Voor routinereiniging kan ik u helpen een tandarts te vinden die gespecialiseerd is in algemene tandheelkundige zorg. Heeft u specifieke zorgen?"
- "Voor het wijzigen van afspraken kunt u naar uw afsprakenlijst gaan"
- "Voor annuleren van afspraken bekijkt u uw afsprakenlijst bovenaan"
- "Is er nog iets anders dat u me zou willen vertellen over uw tandheelkundige situatie?"${personalitySection}${customBehaviorSection}`
          };
          
        case 'fr':
          return {
            persona: customGreeting || `Vous êtes DentiBot, un assistant virtuel dentaire professionnel.${personalityIntro} Vous connaissez le patient ${user_profile?.first_name} ${user_profile?.last_name} et pouvez l'aider à réserver, modifier ou annuler des rendez-vous.`,
            guidelines: `
INSTRUCTIONS IMPORTANTES:
- Vous connaissez le patient: ${user_profile?.first_name} ${user_profile?.last_name}
- POUR TOUTES LES INTERACTIONS: Laissez la conversation se dérouler naturellement
- POUR NOUVEAUX RENDEZ-VOUS: Collectez d'abord suffisamment d'informations
  - Demandez d'abord pour qui est le rendez-vous
  - Demandez ensuite les symptômes spécifiques
  - ATTENDEZ leur réponse avant de recommander
  - POSEZ SEULEMENT UNE QUESTION à la fois
- NE JAMAIS mentionner des noms de dentistes spécifiques
- NE JAMAIS parler d'heure ou de disponibilité

SYSTÈME DE CODES WIDGET - OPTIONNEL:
Ce système supporte des CODES TECHNIQUES qui activent des widgets quand nécessaire.
Utilisez ces codes UNIQUEMENT quand vous voulez vraiment afficher un widget:

CODES DISPONIBLES:
- 12345 = Widget prêt à réserver (utilisez quand vous avez collecté assez d'informations et êtes prêt à procéder à la réservation)
- 89902 = Widget de recommandation de dentiste (utilisez UNIQUEMENT si vous avez assez d'infos pour recommander)
- 77843 = Widget de paiement
- 66754 = Widget de reprogrammation
- 55621 = Widget d'annulation
- 44598 = Widget d'ordonnances
- 33476 = Widget pour voir les rendez-vous

UTILISATION:
Si vous voulez afficher un widget, commencez votre réponse par le code:
"12345 Parfait! J'ai toutes les informations dont j'ai besoin pour vous aider à prendre rendez-vous."

Si vous n'avez PAS besoin d'un widget, n'utilisez PAS de code:
"Pour qui est le rendez-vous? Pour vous ou pour quelqu'un d'autre?"

IMPORTANT:
- Utilisez le code 12345 quand vous avez: 1) Qui est le patient, ET 2) Les symptômes/raison de la visite
- Utilisez des codes UNIQUEMENT quand vous voulez activer un widget
- Pour les questions générales et la collecte d'informations: PAS de code
- Les codes sont invisibles pour l'utilisateur`,
            
            dentists: ``,
            
            examples: `
EXEMPLES DE LANGAGE PROFESSIONNEL:
- "Bonjour ${user_profile?.first_name}! Comment puis-je vous aider avec vos soins dentaires aujourd'hui?"
- "Je comprends que vous ressentez [symptôme]. Pouvez-vous me dire quand cela a commencé et comment cela se manifeste?"
- "Pour un nettoyage de routine, je peux vous aider à trouver un dentiste qui se spécialise dans les soins dentaires généraux. Avez-vous des préoccupations spécifiques?"
- "Pour modifier des rendez-vous, consultez votre liste de rendez-vous en haut"
- "Pour annuler un rendez-vous, allez dans votre liste de rendez-vous"
- "Y a-t-il autre chose que vous aimeriez me dire concernant votre situation dentaire?"${personalitySection}${customBehaviorSection}`
          };
          
        default: // English
          return {
            persona: customGreeting || `You are DentiBot, a friendly and professional dental assistant.${personalityIntro} You know the patient ${user_profile?.first_name} ${user_profile?.last_name}. You help patients book appointments with the right dentist based on their needs.`,
            guidelines: `
CORE RULES:
- Keep responses SHORT and CONVERSATIONAL (2-3 sentences max)
- Ask ONE question at a time
- Never mention specific dentist names - let the system recommend them
- Never discuss time/availability - focus only on symptoms and needs
- Be warm, helpful, and natural
- The appointment is always for the patient you're talking to (${user_profile?.first_name})

BOOKING FLOW:
1. Ask about symptoms or concerns: "What brings you in today?"
2. Ask follow-up questions to understand the issue better
3. Once you understand the problem, use code 12345 to proceed to booking

WIDGET CODE SYSTEM - OPTIONAL:
You have technical codes that activate widgets when needed.
Use these codes ONLY when you actually want to show a widget:

AVAILABLE CODES:
- 12345 = Ready to book widget (use when you have collected enough information and are ready to proceed to booking)
- 89902 = Dentist recommendation widget (use ONLY if you have enough info to recommend)
- 77843 = Payment widget
- 66754 = Reschedule widget
- 55621 = Cancel widget
- 44598 = Prescription widget
- 33476 = View appointments widget

USAGE:
If you want to show a widget, start your response with the code, then include JSON metadata:
"12345 [[SERVICE:service_name_here]] [[SYMPTOMS:brief symptom summary here]] Perfect! I have all the information I need to help you book an appointment."

The [[SERVICE:...]] tag should contain the exact name of the most appropriate service from the AVAILABLE SERVICES list.
The [[SYMPTOMS:...]] tag should contain a 1-2 sentence summary of what the patient described (e.g., "Sharp pain in lower left molar for 3 days, sensitive to cold")

If you DON'T need a widget, DON'T use a code:
"What brings you in today? Any pain or specific concerns?"

IMPORTANT:
- Use code 12345 when you have enough information about the patient's symptoms/reason for visit
- Always include [[SERVICE:...]] and [[SYMPTOMS:...]] tags when using code 12345
- Use codes ONLY when you want to activate a widget
- For general questions and gathering info: NO code
- Codes are invisible to the user

RESPONSE STYLE:
✓ "What brings you in today? Any pain or specific concerns?"
✓ "I see, can you describe the pain - is it sharp, throbbing, or constant?"
✓ "12345 [[SERVICE:General Checkup]] [[SYMPTOMS:Routine dental checkup, no specific concerns]] Got it! Let me help you book your appointment."
✗ "I understand you are experiencing dental concerns and would like to schedule..."`,
            
            dentists: ``,
            
            examples: `
CONVERSATION EXAMPLES:
User: "I need an appointment"
You: "I'd be happy to help! What brings you in today?"

User: "My tooth hurts"
You: "I'm sorry to hear that. Can you describe the pain - is it sharp, throbbing, or constant? And which tooth is it?"

User: "It's a sharp pain in my back tooth, started 2 days ago"
You: "12345 [[SERVICE:Emergency Dental Care]] [[SYMPTOMS:Sharp pain in back tooth for 2 days]] Got it! Let me help you book an appointment right away."

User: "I just need a cleaning"
You: "12345 [[SERVICE:Dental Cleaning]] [[SYMPTOMS:Routine dental cleaning requested]] Perfect! Let's get you scheduled for a cleaning."${personalitySection}${customBehaviorSection}`
          };
      }
    };

    let systemPrompt = '';
    let responseFormat = {};

    if (mode === 'dentist_consultation') {
      systemPrompt = `You are an advanced dental AI assistant helping a dentist with patient care. You have access to comprehensive patient information and clinical context.

PATIENT INFORMATION:
${patient_context?.patient ? `
Patient Name: ${patient_context.patient.first_name} ${patient_context.patient.last_name}
Email: ${patient_context.patient.email || 'Not provided'}
Phone: ${patient_context.patient.phone || 'Not provided'}
Date of Birth: ${patient_context.patient.date_of_birth || 'Not provided'}
Medical History: ${patient_context.patient.medical_history || 'No medical history recorded'}
` : 'No patient profile information available'}

CLINICAL HISTORY:
${patient_context?.medical_history?.length > 0 ? `
Previous Medical Records:
${patient_context.medical_history.map((record: MedicalRecord) => `
- Date: ${record.visit_date}
- Type: ${record.record_type}
- Title: ${record.title}
- Description: ${record.description || 'No description'}
- Findings: ${record.findings || 'No findings recorded'}
- Recommendations: ${record.recommendations || 'No recommendations'}
`).join('\n')}` : 'No previous medical records found'}

${patient_context?.notes?.length > 0 ? `
Clinical Notes:
${patient_context.notes.map((note: ClinicalNote) => `
- Date: ${note.created_at}
- Note: ${note.content}
`).join('\n')}` : 'No clinical notes found'}

${patient_context?.treatment_plans?.length > 0 ? `
Treatment Plans:
${patient_context.treatment_plans.map((plan: TreatmentPlan) => `
- Title: ${plan.title}
- Status: ${plan.status}
- Priority: ${plan.priority}
- Description: ${plan.description || 'No description'}
- Diagnosis: ${plan.diagnosis || 'No diagnosis recorded'}
- Estimated Duration: ${plan.estimated_duration_weeks || 'Not specified'} weeks
- Estimated Cost: €${plan.estimated_cost || 'Not specified'}
- Start Date: ${plan.start_date || 'Not scheduled'}
- Treatment Steps: ${plan.treatment_steps ? JSON.stringify(plan.treatment_steps) : 'No steps defined'}
`).join('\n')}` : 'No treatment plans found'}

Your role is to:
1. Analyze patient information and provide clinical insights
2. Suggest appropriate clinical notes, prescriptions, or treatment plans
3. Help the dentist make informed decisions
4. Provide professional medical language and recommendations

When suggesting actions, format your response to include actionable suggestions in this JSON structure:
{
  "response": "Your conversational response",
  "suggestions": [
    {
      "id": "unique_id",
      "type": "note|prescription|treatment_plan",
      "data": {
        // Relevant data based on type
      }
    }
  ]
}

For notes: data should include "content"
For prescriptions: data should include "medication_name", "dosage", "frequency", "duration_days", "instructions"
For treatment_plans: data should include "title", "description", "diagnosis", "treatment_steps", "estimated_duration_weeks", "estimated_cost", "priority"

Always maintain professional medical standards and suggest only appropriate treatments.`;

      responseFormat = {
        response_format: { type: "json_object" }
      };
    } else {
      const content = getLanguageContent(detectedLanguage);

      // Build patient context string if available
      let patientContextString = '';
      if (patient_context) {
        patientContextString = `\n\nPATIENT INFORMATION:
${patient_context.next_appointment ? `Next Appointment: ${new Date(patient_context.next_appointment.date).toLocaleString()} with ${patient_context.next_appointment.dentist_name}
Reason: ${patient_context.next_appointment.reason}` : 'No upcoming appointments'}

${patient_context.balance ? `Outstanding Balance: €${patient_context.balance.outstanding}
Total Billed: €${patient_context.balance.total_billed}
Total Paid: €${patient_context.balance.total_paid}` : ''}

${patient_context.active_prescriptions && patient_context.active_prescriptions.length > 0 ? `Active Medications:
${patient_context.active_prescriptions.map((p: any) => `- ${p.medication}: ${p.dosage}, ${p.instructions}`).join('\n')}` : 'No active prescriptions'}

${patient_context.recent_payments && patient_context.recent_payments.length > 0 ? `Recent Payments:
${patient_context.recent_payments.slice(0, 3).map((p: any) => `- €${p.amount} on ${new Date(p.date).toLocaleDateString()} (${p.method})`).join('\n')}` : ''}
`;
      }

      systemPrompt = [
        content.persona,
        content.guidelines,
        content.examples,
        servicesContent,
        knowledgeBaseContent,
        `Patient Information: ${JSON.stringify(user_profile)}`,
        patientContextString,
        `Conversation History:\n${conversation_history.map((msg: any) => (msg.is_bot ? 'Assistant' : 'Patient') + ': ' + msg.message).join('\n')}`
      ].join('\n\n');
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversation_history || []).map((msg: any) => ({
        role: msg.is_bot || msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.message || msg.content
      })),
      { role: 'user', content: sanitizedMessage } // Use sanitized message
    ];

            // Lovable AI (Gemini) request logging for development
        if (Deno.env.get('ENVIRONMENT') === 'development') {
          console.log('Sending to Lovable AI Gateway (Gemini):', { messageCount: messages.length });
        }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + lovableApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messages,
        max_completion_tokens: mode === 'dentist_consultation' ? 1000 : 300,
        ...responseFormat
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Lovable AI Gateway error:', errorData);
      throw new Error('Lovable AI Gateway error: ' + response.status);
    }

    const data = await response.json();
            // Response logging for development
        if (Deno.env.get('ENVIRONMENT') === 'development') {
          console.log('Lovable AI response received');
        }

    const result = data.choices[0].message.content;

    if (mode === 'dentist_consultation') {
      try {
        const parsedResult = JSON.parse(result);
        return new Response(JSON.stringify(parsedResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        // If JSON parsing fails, return as simple response
        return new Response(JSON.stringify({
          response: result,
          suggestions: []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const botResponse = result;

    // Extract consultation reason from conversation
    const extractConsultationReason = (message: string, history: any[]): string => {
      const lowerMessage = message.toLowerCase();
      
      // Extract from current message
      if (lowerMessage.includes('douleur') || lowerMessage.includes('mal aux dents') || lowerMessage.includes('pain')) {
        return 'Douleur dentaire';
      }
      if (lowerMessage.includes('nettoyage') || lowerMessage.includes('cleaning')) {
        return 'Nettoyage dentaire';
      }
      if (lowerMessage.includes('contrôle') || lowerMessage.includes('checkup') || lowerMessage.includes('routine')) {
        return 'Contrôle de routine';
      }
      if (lowerMessage.includes('urgence') || lowerMessage.includes('emergency')) {
        return 'Urgence dentaire';
      }
      if (lowerMessage.includes('esthétique') || lowerMessage.includes('cosmetic') || lowerMessage.includes('whitening') || lowerMessage.includes('blanchiment')) {
        return 'Consultation esthétique';
      }
      
      // Extract from conversation history (last 5 messages)
      const recentMessages = history.slice(-5);
      const fullContext = recentMessages.map(m => m.message).join(' ').toLowerCase();
      
      if (fullContext.includes('douleur') || fullContext.includes('mal aux dents')) {
        return 'Douleur dentaire';
      }
      if (fullContext.includes('nettoyage')) {
        return 'Nettoyage dentaire';
      }
      if (fullContext.includes('contrôle') || fullContext.includes('routine')) {
        return 'Contrôle de routine';
      }
      if (fullContext.includes('urgence')) {
        return 'Urgence dentaire';
      }
      if (fullContext.includes('esthétique') || fullContext.includes('blanchiment')) {
        return 'Consultation esthétique';
      }
      
      return 'Consultation générale';
    };

    const consultationReason = extractConsultationReason(sanitizedMessage, conversation_history);

    // Parse suggestions from AI response (no forced keyword matching)
    const suggestions: string[] = [];
    
    // Extract recommendations from AI if they added widget codes
    const codeMatch = botResponse.match(/^(\d{5})\s/);
    if (codeMatch) {
      const code = codeMatch[1];
      switch(code) {
        case '89902':
          suggestions.push('recommend-dentist');
          break;
        case '77843':
          suggestions.push('pay-now');
          break;
        case '66754':
          suggestions.push('reschedule');
          break;
        case '55621':
          suggestions.push('cancel-appointment');
          break;
        case '44598':
          suggestions.push('prescription-refill');
          break;
        case '33476':
          suggestions.push('view-appointments');
          break;
      }
    }
    
    // Extract dentist recommendations based on conversation context
    const recommendedDentists: string[] = [];
    const lowerResponse = botResponse.toLowerCase();
    const lowerMessage = sanitizedMessage.toLowerCase();
    const fullContext = buildConversationContext(sanitizedMessage, conversation_history);
    
    // Check if we should recommend dentists based on context (patient info + symptoms gathered)
    const shouldRecommendDentist = hasPatientInfo(fullContext) && hasSymptomInfo(fullContext);
    
    // Prepare match reason keywords
    const pediatricKeywords = /child|kid|enfant|daughter|son|fils|fille|pediatric|pédiatrique/i;
    const orthodonticKeywords = /braces|orthodontic|orthodontie|alignement|alignment|invisalign/i;
    const urgentKeywords = /pain|urgentce|emergency|douleur|hurt|mal/i;
    
    let matchReason = "Highly experienced in general dentistry and patient care";
    if (pediatricKeywords.test(fullContext)) {
      matchReason = "Specialized in pediatric dentistry and excellent with children";
    } else if (orthodonticKeywords.test(fullContext)) {
      matchReason = "Expert in orthodontics and teeth alignment";
    } else if (urgentKeywords.test(fullContext)) {
      matchReason = "Available for urgent consultations and pain management";
    }
    
    // Only recommend dentists if AI decided to show the widget OR we have enough context
    if (suggestions.includes('recommend-dentist') || shouldRecommendDentist) {
      if (shouldRecommendDentist && !suggestions.includes('recommend-dentist')) {
        suggestions.push('recommend-dentist');
      }
      // Fetch available dentists from database to make real recommendations
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      const supabase = createClient(supabaseUrl, supabaseKey);

      try {
        const { data: dentists } = await supabase
          .from('dentists')
          .select(`
            id,
            first_name,
            last_name,
            specialty,
            bio,
            profiles:profile_id (
              avatar_url
            )
          `)
          .eq('is_active', true)
          .limit(5);

        if (dentists && dentists.length > 0) {
          // Intelligent matching based on symptoms and context
          let bestMatch = dentists[0]; // Default to first dentist
          
          // Pediatric case
          if (pediatricKeywords.test(fullContext)) {
            const pediatricDentist = dentists.find(d => 
              d.specialty?.toLowerCase().includes('pediatric') || 
              d.specialty?.toLowerCase().includes('pédiatrique') ||
              d.bio?.toLowerCase().includes('child')
            );
            if (pediatricDentist) bestMatch = pediatricDentist;
          }
          
          // Orthodontic case
          else if (orthodonticKeywords.test(fullContext)) {
            const orthodontist = dentists.find(d => 
              d.specialty?.toLowerCase().includes('orthodontic') ||
              d.specialty?.toLowerCase().includes('orthodontie')
            );
            if (orthodontist) bestMatch = orthodontist;
          }
          
          // Urgent/pain case - prefer general dentist
          else if (urgentKeywords.test(fullContext)) {
            const generalDentist = dentists.find(d => 
              d.specialty?.toLowerCase().includes('general') ||
              d.specialty?.toLowerCase().includes('générale')
            );
            if (generalDentist) bestMatch = generalDentist;
          }

          // Return dentist name as string (recommendedDentists is string[])
          recommendedDentists.push(`Dr. ${bestMatch.first_name || ''} ${bestMatch.last_name || ''}`.trim());
        }
      } catch (error) {
        console.error('Error fetching dentists:', error);
      }
    }
    
    // Return dentist objects, not names
    const finalRecommendations = recommendedDentists.slice(0, 1);
    
    const urgency_detected = false;
    const emergency_detected = false;

    // AI has full control - no forced code enforcement
    const finalResponse = botResponse;
    console.log('✅ AI response used as-is. Widget control delegated to AI.');

    return new Response(JSON.stringify({ 
      response: finalResponse,
      suggestions,
      urgency_detected,
      emergency_detected,
      recommended_dentist: finalRecommendations, // Pass the recommended dentists to frontend
      match_reason: matchReason, // Pass match reason
      consultation_reason: consultationReason
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in dental-ai-chat function:', error);
    return new Response(JSON.stringify({ 
      error: 'An error occurred. Please try again.',
      fallback_response: "I'm sorry, I'm experiencing a technical issue. For a dental emergency, please contact the office directly or emergency services."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});