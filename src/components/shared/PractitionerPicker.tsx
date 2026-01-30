/**
 * Unified Practitioner/Dentist Picker Component
 * Consolidates DentistSelection and booking/DentistSelectionStep into one flexible component
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Check, Users } from 'lucide-react';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

export interface Practitioner {
  id: string;
  profile_id: string;
  specialization: string | null;
  average_rating: number;
  total_ratings: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    profile_picture_url?: string | null;
    bio?: string | null;
    phone?: string | null;
    email?: string | null;
  };
}

type PractitionerPickerVariant = 'compact' | 'cards' | 'list';

interface PractitionerPickerProps {
  variant?: PractitionerPickerVariant;
  practitioners?: Practitioner[];
  selectedId?: string;
  onSelect: (practitioner: Practitioner) => void;
  showDetails?: boolean;
  className?: string;
}

function getPractitionerInitials(practitioner: Practitioner): string {
  const fn = practitioner.first_name || practitioner.profiles?.first_name || "";
  const ln = practitioner.last_name || practitioner.profiles?.last_name || "";
  return `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase() || "?";
}

function getPractitionerName(practitioner: Practitioner): string {
  const fn = practitioner.first_name || practitioner.profiles?.first_name || "";
  const ln = practitioner.last_name || practitioner.profiles?.last_name || "";
  return `${fn} ${ln}`.trim() || "Unknown";
}

function getPractitionerAvatar(practitioner: Practitioner): string | undefined {
  return practitioner.profiles?.profile_picture_url || practitioner.profiles?.avatar_url || undefined;
}

/**
 * Compact card view for practitioner selection
 */
function CompactPractitionerCard({ 
  practitioner, 
  isSelected, 
  onSelect 
}: { 
  practitioner: Practitioner; 
  isSelected: boolean; 
  onSelect: () => void;
}) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary border-primary"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={getPractitionerAvatar(practitioner)} />
            <AvatarFallback>{getPractitionerInitials(practitioner)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-medium truncate">
                Dr {getPractitionerName(practitioner)}
              </p>
              {isSelected && (
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
              )}
            </div>
            {practitioner.specialization && (
              <Badge variant="secondary" className="mt-1 text-xs">
                {practitioner.specialization}
              </Badge>
            )}
            {practitioner.total_ratings > 0 && (
              <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{practitioner.average_rating.toFixed(1)}</span>
                <span>({practitioner.total_ratings})</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Detailed card view with bio and contact info
 */
function DetailedPractitionerCard({ 
  practitioner, 
  isSelected, 
  onSelect 
}: { 
  practitioner: Practitioner; 
  isSelected: boolean; 
  onSelect: () => void;
}) {
  const bio = practitioner.profiles?.bio;
  const email = practitioner.email || practitioner.profiles?.email;
  const phone = practitioner.profiles?.phone;

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/40",
        isSelected && "ring-2 ring-primary border-primary"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-14 w-14 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
            <AvatarImage src={getPractitionerAvatar(practitioner)} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/5 text-primary text-base font-bold">
              {getPractitionerInitials(practitioner)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
              Dr. {getPractitionerName(practitioner)}
            </h3>
            <p className="text-sm text-muted-foreground capitalize">
              {practitioner.specialization || "General Dentistry"}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star 
                  key={i} 
                  className={cn(
                    "h-3 w-3",
                    i <= Math.round(practitioner.average_rating || 4)
                      ? "fill-yellow-400 text-yellow-400"
                      : "fill-yellow-400 text-yellow-400 opacity-30"
                  )}
                />
              ))}
              <span className="text-xs text-muted-foreground ml-1">
                {(practitioner.average_rating || 4.5).toFixed(1)}
              </span>
            </div>
          </div>
          {isSelected && (
            <Check className="h-5 w-5 text-primary flex-shrink-0" />
          )}
        </div>

        {bio && (
          <p className="text-sm text-muted-foreground line-clamp-2 border-t pt-3">
            {bio}
          </p>
        )}

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {email && (
            <span className="flex items-center gap-1">📧 {email}</span>
          )}
          {phone && (
            <span className="flex items-center gap-1">📞 {phone}</span>
          )}
        </div>

        <Button 
          size="sm" 
          className={cn("w-full mt-2", isSelected ? "bg-primary" : "group-hover:bg-primary")}
        >
          {isSelected ? "Selected" : `Select Dr. ${practitioner.first_name || practitioner.profiles?.first_name}`}
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton for practitioner cards
 */
function PractitionerSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>
  );
}

/**
 * Empty state when no practitioners are available
 */
function NoPractitionersState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Users className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No Practitioners Available</h3>
      <p className="text-muted-foreground max-w-md">
        There are no practitioners available for booking at this clinic at the moment.
      </p>
    </div>
  );
}

/**
 * Unified Practitioner Picker Component
 * 
 * Variants:
 * - compact: Simple cards with avatar, name, specialization, rating
 * - cards: Detailed cards with bio, contact info, and select button
 * - list: Simple list view (compact variant in list layout)
 */
export function PractitionerPicker({
  variant = 'compact',
  practitioners: providedPractitioners,
  selectedId,
  onSelect,
  showDetails = false,
  className,
}: PractitionerPickerProps) {
  const [practitioners, setPractitioners] = useState<Practitioner[]>(providedPractitioners || []);
  const [loading, setLoading] = useState(!providedPractitioners);
  const { businessId } = useBusinessContext();

  // Fetch practitioners if not provided
  useEffect(() => {
    if (providedPractitioners) {
      setPractitioners(providedPractitioners);
      setLoading(false);
      return;
    }

    if (!businessId) return;

    const fetchPractitioners = async () => {
      try {
        const { data: businessMembers } = await supabase
          .from('business_members')
          .select('profile_id')
          .eq('business_id', businessId)
          .eq('role', 'dentist');

        if (!businessMembers || businessMembers.length === 0) {
          setPractitioners([]);
          setLoading(false);
          return;
        }

        const profileIds = businessMembers.map(m => m.profile_id);

        const { data, error } = await supabase
          .from('dentists')
          .select(`
            id,
            profile_id,
            specialization,
            average_rating,
            total_ratings,
            profiles!dentists_profile_id_fkey (
              first_name,
              last_name,
              avatar_url,
              profile_picture_url,
              bio,
              phone,
              email
            )
          `)
          .in('profile_id', profileIds)
          .eq('is_active', true);

        if (error) throw error;

        const formattedPractitioners = (data || []).map((d: any) => ({
          ...d,
          profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles
        }));

        setPractitioners(formattedPractitioners);
      } catch (error) {
        logger.error('Error fetching practitioners:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPractitioners();
  }, [businessId, providedPractitioners]);

  if (loading) {
    return <PractitionerSkeleton />;
  }

  if (practitioners.length === 0) {
    return <NoPractitionersState />;
  }

  const useDetailedCards = variant === 'cards' || showDetails;

  return (
    <div className={cn("space-y-4", className)}>
      <div className={cn(
        "grid gap-4",
        variant === 'list' ? "grid-cols-1" : "md:grid-cols-2 lg:grid-cols-3"
      )}>
        {practitioners.map((practitioner) => {
          const isSelected = selectedId === practitioner.id;
          
          return useDetailedCards ? (
            <DetailedPractitionerCard
              key={practitioner.id}
              practitioner={practitioner}
              isSelected={isSelected}
              onSelect={() => onSelect(practitioner)}
            />
          ) : (
            <CompactPractitionerCard
              key={practitioner.id}
              practitioner={practitioner}
              isSelected={isSelected}
              onSelect={() => onSelect(practitioner)}
            />
          );
        })}
      </div>
    </div>
  );
}

// Export sub-components for backwards compatibility
export const DentistSelection = PractitionerPicker;
export { getPractitionerName, getPractitionerInitials, getPractitionerAvatar };
