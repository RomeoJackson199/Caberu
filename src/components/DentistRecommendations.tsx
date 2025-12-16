import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLanguageDetection } from "@/hooks/useLanguageDetection";
import { logger } from '@/lib/logger';
import { 
  Star, 
  Clock, 
  MessageCircle, 
  Award,
  TrendingUp,
  MapPin,
  Phone,
  Calendar
} from "lucide-react";

interface DentistRecommendation {
  id: string;
  profile_id: string;
  specialization: string;
  specialty?: string;
  average_rating: number;
  total_ratings: number;
  expertise_score: number;
  communication_score: number;
  wait_time_score: number;
  profiles: {
    first_name: string;
    last_name: string;
    phone?: string;
    address?: string;
  };
  recommendation_score?: number;
  recommendation_reason?: string;
}

interface DentistRecommendationsProps {
  urgencyLevel?: 1 | 2 | 3 | 4 | 5;
  symptoms?: string[];
  triageData?: {
    problemType?: string;
    allergies?: string[];
    urgencyIndicators?: string[];
    painDescription?: string;
    triggeredBy?: string[];
    medicalHistory?: string[];
  };
  onSelectDentist: (dentist: DentistRecommendation) => void;
}

export const DentistRecommendations = ({ 
  urgencyLevel = 3, 
  symptoms = [],
  triageData,
  onSelectDentist 
}: DentistRecommendationsProps) => {
  const { t } = useLanguageDetection();
  const [recommendations, setRecommendations] = useState<DentistRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, [urgencyLevel, symptoms, triageData]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      
      const { data: dentists, error } = await supabase
        .from('dentists')
        .select(`
          id,
          profile_id,
          specialization,
          average_rating,
          total_ratings,
          expertise_score,
          communication_score,
          wait_time_score,
          profiles (
            first_name,
            last_name,
            phone,
            address
          )
        `)
        .eq('is_active', true);

      if (error) throw error;

      // Calculate recommendation scores with enhanced triage data
      const scoredDentists = (dentists || []).map((dentist: any) => {
        // Transform profiles from array to single object if needed
        const profile = Array.isArray(dentist.profiles) ? dentist.profiles[0] : dentist.profiles;
        const transformedDentist = { ...dentist, profiles: profile };
        const recommendation = calculateRecommendationScore(transformedDentist, urgencyLevel, symptoms, triageData);
        return {
          ...transformedDentist,
          recommendation_score: recommendation.score,
          recommendation_reason: recommendation.reason
        } as DentistRecommendation;
      });

      // Sort by recommendation score
      scoredDentists.sort((a, b) => (b.recommendation_score || 0) - (a.recommendation_score || 0));

      setRecommendations(scoredDentists);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRecommendationScore = (
    dentist: DentistRecommendation, 
    urgency: number, 
    symptoms: string[],
    triageData?: {
      problemType?: string;
      allergies?: string[];
      urgencyIndicators?: string[];
      painDescription?: string;
      triggeredBy?: string[];
      medicalHistory?: string[];
    }
  ): { score: number; reason: string } => {
    let score = 0;
    const reasons = [];

    // Base rating weight (40% of total score)
    const ratingScore = (dentist.average_rating || 0) * 8;
    score += ratingScore;
    if (dentist.average_rating >= 4.5) {
      reasons.push("Excellentes évaluations");
    }

    // Experience weight (20% of total score) - based on total ratings
    const experienceScore = Math.min((dentist.total_ratings || 0) * 2, 20);
    score += experienceScore;
    if (dentist.total_ratings >= 10) {
      reasons.push("Dentiste expérimenté");
    }

    // Enhanced specialty matching with triage data (30% of total score)
    const specialtyScore = getSpecialtyScore(
      dentist.specialization || dentist.specialty || '', 
      symptoms, 
      urgency, 
      triageData
    );
    score += specialtyScore.score;
    if (specialtyScore.reason) {
      reasons.push(specialtyScore.reason);
    }

    // Allergy compatibility (critical factor)
    if (triageData?.allergies?.length) {
      const allergyCompatibilityScore = getAllergyCompatibilityScore(
        dentist.specialty || dentist.specialization || '',
        triageData.allergies
      );
      score += allergyCompatibilityScore.score;
      if (allergyCompatibilityScore.reason) {
        reasons.push(allergyCompatibilityScore.reason);
      }
    }

    // Problem type specialty bonus
    if (triageData?.problemType) {
      const problemScore = getProblemTypeScore(
        dentist.specialty || dentist.specialization || '',
        triageData.problemType,
        urgency
      );
      score += problemScore.score;
      if (problemScore.reason) {
        reasons.push(problemScore.reason);
      }
    }

    // Emergency indicators penalty for non-specialists
    if (triageData?.urgencyIndicators?.length && urgency >= 4) {
      const emergencyScore = getEmergencySpecialistScore(
        dentist.specialty || dentist.specialization || '',
        triageData.urgencyIndicators
      );
      score += emergencyScore.score;
      if (emergencyScore.reason) {
        reasons.push(emergencyScore.reason);
      }
    }

    // Communication score for urgent cases (10% of total score)
    if (urgency >= 4) {
      const commScore = (dentist.communication_score || 0) * 2;
      score += commScore;
      if (dentist.communication_score >= 4.5) {
        reasons.push("Excellente communication");
      }
    }

    // Wait time score for urgent cases (10% of total score)
    if (urgency >= 3) {
      const waitScore = (dentist.wait_time_score || 0) * 2;
      score += waitScore;
      if (dentist.wait_time_score >= 4.5) {
        reasons.push("Temps d'attente courts");
      }
    }

    return {
      score: Math.round(score),
      reason: reasons.length > 0 ? reasons.join(", ") : "Dentiste recommandé"
    };
  };

  const getSpecialtyScore = (
    specialty: string,
    symptoms: string[],
    urgency: number,
    triageData?: {
      problemType?: string;
      allergies?: string[];
      urgencyIndicators?: string[];
      painDescription?: string;
      triggeredBy?: string[];
      medicalHistory?: string[];
    }
  ): { score: number; reason?: string } => {
    const spec = specialty?.toLowerCase() || '';
    
    // Critical emergency indicators require specialists
    if (triageData?.urgencyIndicators?.some(indicator => 
      ['difficulty_breathing', 'facial_swelling', 'difficulty_swallowing', 'severe_bleeding'].includes(indicator)
    )) {
      if (spec.includes('urgence') || spec.includes('chirurgie') || spec.includes('maxillo')) {
        return { score: 25, reason: "Spécialiste des urgences graves" };
      } else {
        return { score: 5, reason: "Non spécialisé en urgences graves" };
      }
    }

    // Problem type matching
    if (triageData?.problemType) {
      switch (triageData.problemType) {
        case 'abscess':
          if (spec.includes('endodontie') || spec.includes('urgence')) {
            return { score: 22, reason: "Spécialiste des infections dentaires" };
          }
          break;
        case 'broken_tooth':
          if (spec.includes('chirurgie') || spec.includes('urgence')) {
            return { score: 20, reason: "Spécialiste des traumatismes dentaires" };
          }
          break;
        case 'gum_problem':
          if (spec.includes('parodontie')) {
            return { score: 20, reason: "Spécialiste des gencives" };
          }
          break;
        case 'orthodontic':
          if (spec.includes('orthodontie')) {
            return { score: 20, reason: "Spécialiste orthodontique" };
          }
          break;
        case 'jaw_problem':
          if (spec.includes('maxillo') || spec.includes('atm')) {
            return { score: 20, reason: "Spécialiste des troubles de l'ATM" };
          }
          break;
      }
    }

    // Emergency and oral surgery for trauma/bleeding
    if (symptoms.includes('trauma') || symptoms.includes('bleeding')) {
      if (spec.includes('urgence') || spec.includes('chirurgie')) {
        return { score: 18, reason: "Spécialiste des urgences" };
      }
    }

    // Endodontist for severe pain
    if (urgency >= 4 && spec.includes('endodontie')) {
      return { score: 16, reason: "Spécialiste de la douleur dentaire" };
    }

    // General dentistry gets standard score
    if (spec.includes('générale') || spec.includes('general')) {
      return { score: 12, reason: "Dentiste généraliste" };
    }

    return { score: 8 };
  };

  const getAllergyCompatibilityScore = (
    specialty: string,
    allergies: string[]
  ): { score: number; reason?: string } => {
    const spec = specialty?.toLowerCase() || '';
    
    // Critical allergies that require specialist knowledge
    const criticalAllergies = ['local_anesthetic', 'latex'];
    const hasCriticalAllergy = allergies.some(allergy => criticalAllergies.includes(allergy));
    
    if (hasCriticalAllergy) {
      if (spec.includes('anesthésie') || spec.includes('urgence') || spec.includes('chirurgie')) {
        return { score: 10, reason: "Expérience avec allergies complexes" };
      } else {
        return { score: -5, reason: "Allergie nécessitant une expertise spécialisée" };
      }
    }

    // Standard medication allergies
    if (allergies.includes('penicillin')) {
      return { score: 2, reason: "Adaptation des prescriptions" };
    }

    return { score: 0 };
  };

  const getProblemTypeScore = (
    specialty: string,
    problemType: string,
    urgency: number
  ): { score: number; reason?: string } => {
    const spec = specialty?.toLowerCase() || '';
    
    const problemSpecialties = {
      'abscess': ['endodontie', 'urgence'],
      'broken_tooth': ['chirurgie', 'urgence', 'prothèse'],
      'gum_problem': ['parodontie'],
      'orthodontic': ['orthodontie'],
      'jaw_problem': ['maxillo', 'atm'],
      'post_surgery': ['chirurgie', 'urgence']
    };

    const requiredSpecs = problemSpecialties[problemType as keyof typeof problemSpecialties] || [];
    const hasSpecialty = requiredSpecs.some(reqSpec => spec.includes(reqSpec));

    if (hasSpecialty) {
      const bonus = urgency >= 4 ? 5 : 3;
      return { score: 15 + bonus, reason: `Spécialisé en ${problemType.replace('_', ' ')}` };
    }

    return { score: 0 };
  };

  const getEmergencySpecialistScore = (
    specialty: string,
    urgencyIndicators: string[]
  ): { score: number; reason?: string } => {
    const spec = specialty?.toLowerCase() || '';
    
    const criticalIndicators = [
      'difficulty_breathing', 'facial_swelling', 'difficulty_swallowing', 
      'severe_bleeding', 'spreading_infection'
    ];
    
    const hasCriticalIndicators = urgencyIndicators.some(indicator => 
      criticalIndicators.includes(indicator)
    );
    
    if (hasCriticalIndicators) {
      if (spec.includes('urgence') || spec.includes('chirurgie') || spec.includes('maxillo')) {
        return { score: 15, reason: "Spécialiste des urgences critiques" };
      } else {
        return { score: -10, reason: "Urgence nécessitant un spécialiste" };
      }
    }

    return { score: 0 };
  };

  const StarRating = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) => {
    const starSize = size === "lg" ? "h-5 w-5" : "h-4 w-4";
    
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
        <span className="text-sm font-medium ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const getRecommendationBadge = (score: number) => {
    if (score >= 80) return { text: "⭐ Top Recommandé", variant: "default" as const };
    if (score >= 70) return { text: "🏆 Hautement Recommandé", variant: "secondary" as const };
    if (score >= 60) return { text: "✅ Recommandé", variant: "outline" as const };
    return { text: "Disponible", variant: "outline" as const };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-primary" />
          Dentistes Recommandés
        </h3>
        {urgencyLevel >= 4 && (
          <Badge variant="destructive" className="animate-pulse">
            Urgence Élevée
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {recommendations.slice(0, 5).map((dentist) => {
          const badge = getRecommendationBadge(dentist.recommendation_score || 0);
          
          return (
            <Card key={dentist.id} className="hover:shadow-md transition-shadow border-l-4 border-l-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-lg">
                          Dr. {dentist.profiles.first_name} {dentist.profiles.last_name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {dentist.specialization || dentist.specialty}
                        </p>
                      </div>
                      <Badge variant={badge.variant}>
                        {badge.text}
                      </Badge>
                    </div>

                    {/* Ratings */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-400" />
                        <div>
                          <StarRating rating={dentist.average_rating} />
                          <p className="text-xs text-muted-foreground">
                            {dentist.total_ratings} avis
                          </p>
                        </div>
                      </div>

                      {dentist.expertise_score > 0 && (
                        <div className="flex items-center space-x-2">
                          <Award className="h-4 w-4 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium">
                              {dentist.expertise_score.toFixed(1)}/5
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Expertise
                            </p>
                          </div>
                        </div>
                      )}

                      {dentist.wait_time_score > 0 && (
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-green-500" />
                          <div>
                            <p className="text-sm font-medium">
                              {dentist.wait_time_score.toFixed(1)}/5
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Ponctualité
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Recommendation reason */}
                    {dentist.recommendation_reason && (
                      <div className="flex items-center space-x-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
                        <TrendingUp className="h-4 w-4" />
                        <span>{dentist.recommendation_reason}</span>
                      </div>
                    )}

                    {/* Contact info */}
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      {dentist.profiles.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="h-4 w-4" />
                          <span>{dentist.profiles.phone}</span>
                        </div>
                      )}
                      {dentist.profiles.address && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{dentist.profiles.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <div className="mt-4 pt-3 border-t">
                  <Button 
                    onClick={() => onSelectDentist(dentist)}
                    className="w-full"
                    variant={dentist.recommendation_score && dentist.recommendation_score >= 80 ? "default" : "outline"}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Choisir ce dentiste
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {recommendations.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              Aucun dentiste disponible pour le moment.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};