import { useParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MessageSquare, BarChart3, Shield, Clock, Users, Smartphone } from "lucide-react";

// Comprehensive feature content with translations
const featureContent = {
  scheduling: {
    en: {
      title: "Smart Scheduling",
      subtitle: "Intelligent Appointment Booking",
      description: "Book appointments with real-time availability and priority handling.",
      details: [
        "Real-time availability tracking",
        "Priority-based scheduling for urgent cases",
        "Automatic conflict detection",
        "Duration-aware booking",
        "Family member booking support",
        "24/7 booking availability"
      ],
      benefits: [
        "Reduce no-shows with smart reminders",
        "Optimize dentist schedules",
        "Improve patient satisfaction",
        "Streamline administrative tasks"
      ],
      icon: CalendarDays
    },
    fr: {
      title: "Planification Intelligente",
      subtitle: "Réservation de Rendez-vous Intelligente",
      description: "Réservez des rendez-vous avec disponibilité en temps réel et gestion des priorités.",
      details: [
        "Suivi de disponibilité en temps réel",
        "Planification basée sur les priorités pour les cas urgents",
        "Détection automatique des conflits",
        "Réservation avec durée",
        "Support pour la réservation familiale",
        "Disponibilité de réservation 24h/24"
      ],
      benefits: [
        "Réduire les absences avec des rappels intelligents",
        "Optimiser les emplois du temps des dentistes",
        "Améliorer la satisfaction des patients",
        "Simplifier les tâches administratives"
      ],
      icon: CalendarDays
    },
    nl: {
      title: "Slimme Planning",
      subtitle: "Intelligente Afspraakplanning",
      description: "Boek afspraken met real-time beschikbaarheid en prioriteitsafhandeling.",
      details: [
        "Real-time beschikbaarheidstracking",
        "Prioriteitsgebaseerde planning voor urgente gevallen",
        "Automatische conflictdetectie",
        "Duur-bewuste boeking",
        "Familielid boeking ondersteuning",
        "24/7 boeking beschikbaarheid"
      ],
      benefits: [
        "Verminder no-shows met slimme herinneringen",
        "Optimaliseer tandartschema's",
        "Verbeter patiënttevredenheid",
        "Stroomlijn administratieve taken"
      ],
      icon: CalendarDays
    }
  },
  analytics: {
    en: {
      title: "Analytics & Insights",
      subtitle: "Data-Driven Dental Care",
      description: "Track your visits and improvement over time with comprehensive analytics.",
      details: [
        "Visit history and trends",
        "Treatment progress tracking",
        "Health metrics visualization",
        "Appointment analytics",
        "Patient satisfaction scores",
        "Predictive health insights"
      ],
      benefits: [
        "Monitor oral health progress",
        "Identify improvement patterns",
        "Make informed treatment decisions",
        "Track long-term dental health"
      ],
      icon: BarChart3
    },
    fr: {
      title: "Analyses et Insights",
      subtitle: "Soins Dentaires Basés sur les Données",
      description: "Suivez vos visites et améliorations au fil du temps avec des analyses complètes.",
      details: [
        "Historique et tendances des visites",
        "Suivi des progrès de traitement",
        "Visualisation des métriques de santé",
        "Analyses des rendez-vous",
        "Scores de satisfaction des patients",
        "Insights prédictifs de santé"
      ],
      benefits: [
        "Surveiller les progrès de santé bucco-dentaire",
        "Identifier les modèles d'amélioration",
        "Prendre des décisions de traitement éclairées",
        "Suivre la santé dentaire à long terme"
      ],
      icon: BarChart3
    },
    nl: {
      title: "Analytics & Inzichten",
      subtitle: "Data-Gedreven Tandheelkundige Zorg",
      description: "Volg uw bezoeken en verbeteringen in de loop van de tijd met uitgebreide analytics.",
      details: [
        "Bezoekgeschiedenis en trends",
        "Behandelingsvoortgang tracking",
        "Gezondheidsmetrieken visualisatie",
        "Afspraak analytics",
        "Patiënttevredenheid scores",
        "Voorspellende gezondheidsinzichten"
      ],
      benefits: [
        "Monitor mondgezondheid voortgang",
        "Identificeer verbeteringspatronen",
        "Neem geïnformeerde behandelingsbeslissingen",
        "Volg langdurige tandheelkundige gezondheid"
      ],
      icon: BarChart3
    }
  },
  ai_chat: {
    en: {
      title: "AI Chat Assistant",
      subtitle: "24/7 Dental Support",
      description: "Get instant answers to your dental questions with our intelligent AI assistant.",
      details: [
        "Instant dental advice",
        "Symptom assessment",
        "Treatment explanations",
        "Appointment scheduling help",
        "Emergency guidance",
        "Multilingual support"
      ],
      benefits: [
        "Immediate access to dental information",
        "Reduce anxiety with clear explanations",
        "Get guidance before appointments",
        "24/7 availability for urgent questions"
      ],
      icon: MessageSquare
    },
    fr: {
      title: "Assistant IA Chat",
      subtitle: "Support Dentaire 24h/24",
      description: "Obtenez des réponses instantanées à vos questions dentaires avec notre assistant IA intelligent.",
      details: [
        "Conseils dentaires instantanés",
        "Évaluation des symptômes",
        "Explications de traitement",
        "Aide à la planification des rendez-vous",
        "Guidance d'urgence",
        "Support multilingue"
      ],
      benefits: [
        "Accès immédiat aux informations dentaires",
        "Réduire l'anxiété avec des explications claires",
        "Obtenir des conseils avant les rendez-vous",
        "Disponibilité 24h/24 pour les questions urgentes"
      ],
      icon: MessageSquare
    },
    nl: {
      title: "AI Chat Assistent",
      subtitle: "24/7 Tandheelkundige Ondersteuning",
      description: "Krijg directe antwoorden op uw tandheelkundige vragen met onze intelligente AI assistent.",
      details: [
        "Directe tandheelkundige adviezen",
        "Symptoombeoordeling",
        "Behandelingsexplanaties",
        "Afspraakplanning hulp",
        "Noodhulp begeleiding",
        "Meertalige ondersteuning"
      ],
      benefits: [
        "Directe toegang tot tandheelkundige informatie",
        "Verminder angst met duidelijke uitleg",
        "Krijg begeleiding voor afspraken",
        "24/7 beschikbaarheid voor urgente vragen"
      ],
      icon: MessageSquare
    }
  },
  security: {
    en: {
      title: "Privacy & Security",
      subtitle: "Your Data is Protected",
      description: "Your personal and medical data is protected with enterprise-grade security.",
      details: [
        "End-to-end encryption",
        "HIPAA compliance",
        "Secure data storage",
        "Privacy controls",
        "Audit trails",
        "Regular security updates"
      ],
      benefits: [
        "Complete data privacy",
        "Compliance with medical regulations",
        "Secure communication channels",
        "Peace of mind for sensitive information"
      ],
      icon: Shield
    },
    fr: {
      title: "Confidentialité et Sécurité",
      subtitle: "Vos Données sont Protégées",
      description: "Vos données personnelles et médicales sont protégées avec une sécurité de niveau entreprise.",
      details: [
        "Chiffrement de bout en bout",
        "Conformité HIPAA",
        "Stockage sécurisé des données",
        "Contrôles de confidentialité",
        "Traces d'audit",
        "Mises à jour de sécurité régulières"
      ],
      benefits: [
        "Confidentialité complète des données",
        "Conformité aux réglementations médicales",
        "Canaux de communication sécurisés",
        "Tranquillité d'esprit pour les informations sensibles"
      ],
      icon: Shield
    },
    nl: {
      title: "Privacy & Beveiliging",
      subtitle: "Uw Gegevens zijn Beschermd",
      description: "Uw persoonlijke en medische gegevens zijn beschermd met enterprise-grade beveiliging.",
      details: [
        "End-to-end encryptie",
        "HIPAA compliance",
        "Veilige gegevensopslag",
        "Privacy controles",
        "Audit trails",
        "Regelmatige beveiligingsupdates"
      ],
      benefits: [
        "Volledige gegevensprivacy",
        "Compliance met medische regelgeving",
        "Veilige communicatiekanalen",
        "Gemoedsrust voor gevoelige informatie"
      ],
      icon: Shield
    }
  }
};

const FeatureDetail = () => {
  const { id = "" } = useParams();
  const { language, t } = useLanguage();
  
  // Get feature content for current language, fallback to English
  const feature = featureContent[id as keyof typeof featureContent] as { en: { title: string; subtitle: string; description: string; details: string[]; benefits: string[]; icon: React.ComponentType<{ className?: string }> }; fr?: unknown; nl?: unknown } | undefined;
  const content = feature ? (feature[language as 'en' | 'fr' | 'nl'] || feature.en) as { title: string; subtitle: string; description: string; details: string[]; benefits: string[]; icon: React.ComponentType<{ className?: string }> } : null;
  
  if (!content) {
    return (
      <div className="p-6">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarDays className="h-5 w-5 mr-2 text-blue-600" />
              {t.error}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              {language === 'fr' ? 'Fonctionnalité non trouvée.' : 
               language === 'nl' ? 'Functie niet gevonden.' : 
               'Feature not found.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const IconComponent = content.icon;

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <IconComponent className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-gray-800 mb-2">
              {content.title}
            </CardTitle>
            <p className="text-xl text-blue-600 font-medium mb-4">
              {content.subtitle}
            </p>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              {content.description}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-8 p-6 md:p-8">
            {/* Key Features */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                <CalendarDays className="h-5 w-5 mr-2 text-blue-600" />
                {language === 'fr' ? 'Fonctionnalités Clés' : 
                 language === 'nl' ? 'Belangrijke Functies' : 
                 'Key Features'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {content.details.map((detail: string, index: number) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span className="text-gray-700">{detail}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-green-600" />
                {language === 'fr' ? 'Avantages' : 
                 language === 'nl' ? 'Voordelen' : 
                 'Benefits'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {content.benefits.map((benefit: string, index: number) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex justify-center pt-4">
              <Badge variant="secondary" className="px-4 py-2 text-sm">
                <Clock className="h-4 w-4 mr-2" />
                {language === 'fr' ? 'Disponible 24h/24' : 
                 language === 'nl' ? '24/7 Beschikbaar' : 
                 'Available 24/7'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FeatureDetail;
