import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Check } from 'lucide-react';
import { useBusinessContext } from '@/hooks/useBusinessContext';

interface Dentist {
  id: string;
  profile_id: string;
  specialization: string | null;
  average_rating: number;
  total_ratings: number;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

interface DentistSelectionProps {
  onSelectDentist: (dentist: Dentist) => void;
  selectedDentistId?: string;
}

export const DentistSelection = ({ onSelectDentist, selectedDentistId }: DentistSelectionProps) => {
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [loading, setLoading] = useState(true);
  const { businessId } = useBusinessContext();

  useEffect(() => {
    const fetchDentists = async () => {
      if (!businessId) return;

      try {
        const { data: businessMembers } = await supabase
          .from('business_members')
          .select('profile_id')
          .eq('business_id', businessId)
          .eq('role', 'dentist');

        if (!businessMembers || businessMembers.length === 0) {
          setDentists([]);
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
              avatar_url
            )
          `)
          .in('profile_id', profileIds)
          .eq('is_active', true);

        if (error) throw error;

        const formattedDentists = (data || []).map((d: any) => ({
          ...d,
          profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles
        }));

        setDentists(formattedDentists);
      } catch (error) {
        console.error('Error fetching dentists:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDentists();
  }, [businessId]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (dentists.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucun praticien disponible pour le moment.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Choisissez votre praticien</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dentists.map((dentist) => {
          const isSelected = selectedDentistId === dentist.id;
          return (
            <Card
              key={dentist.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-primary border-primary' : ''
              }`}
              onClick={() => onSelectDentist(dentist)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={dentist.profiles?.avatar_url || undefined} />
                    <AvatarFallback>
                      {dentist.profiles?.first_name?.[0]}
                      {dentist.profiles?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">
                        Dr {dentist.profiles?.first_name} {dentist.profiles?.last_name}
                      </p>
                      {isSelected && (
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                    {dentist.specialization && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {dentist.specialization}
                      </Badge>
                    )}
                    {dentist.total_ratings > 0 && (
                      <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{dentist.average_rating.toFixed(1)}</span>
                        <span>({dentist.total_ratings})</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
