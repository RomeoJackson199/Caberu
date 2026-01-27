import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, ChevronDown, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Practitioner {
  id: string;
  profile_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  is_active: boolean;
  specialization: string | null;
}

interface PractitionerPickerProps {
  selectedId: string | 'all';
  onSelect: (id: string | 'all') => void;
  showAll?: boolean;
  label?: string;
  className?: string;
}

export function PractitionerPicker({
  selectedId,
  onSelect,
  showAll = true,
  label = 'Practitioner',
  className,
}: PractitionerPickerProps) {
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const { businessId } = useBusinessContext();

  useEffect(() => {
    if (businessId) {
      fetchPractitioners();
    }
  }, [businessId]);

  const fetchPractitioners = async () => {
    try {
      setLoading(true);

      // Get business members with dentist/admin/owner roles
      const { data: businessMembers, error: membersError } = await supabase
        .from('business_members')
        .select('profile_id')
        .eq('business_id', businessId)
        .in('role', ['dentist', 'admin', 'owner']);

      if (membersError) throw membersError;

      if (!businessMembers || businessMembers.length === 0) {
        setPractitioners([]);
        return;
      }

      const profileIds = businessMembers.map(m => m.profile_id);

      // Fetch dentists with profiles
      const { data: dentistsData, error: dentistsError } = await supabase
        .from('dentists')
        .select(`
          id,
          profile_id,
          is_active,
          specialization,
          profiles (
            first_name,
            last_name,
            avatar_url
          )
        `)
        .in('profile_id', profileIds);

      if (dentistsError) throw dentistsError;

      const formatted = (dentistsData || []).map((d: any) => {
        const profile = Array.isArray(d.profiles) ? d.profiles[0] : d.profiles;
        return {
          id: d.id,
          profile_id: d.profile_id,
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
          avatar_url: profile?.avatar_url || null,
          is_active: d.is_active,
          specialization: d.specialization,
        };
      });

      setPractitioners(formatted);
    } catch (error) {
      console.error('Error fetching practitioners:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedPractitioner = practitioners.find(p => p.id === selectedId);
  const activePractitioners = practitioners.filter(p => p.is_active);
  const inactivePractitioners = practitioners.filter(p => !p.is_active);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn('justify-between min-w-[200px]', className)}
          disabled={loading}
        >
          <span className="flex items-center gap-2">
            {selectedId === 'all' ? (
              <>
                <Users className="h-4 w-4" />
                <span>All Practitioners</span>
              </>
            ) : selectedPractitioner ? (
              <>
                <Avatar className="h-5 w-5">
                  <AvatarImage src={selectedPractitioner.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {selectedPractitioner.first_name?.[0]}
                    {selectedPractitioner.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span>Dr {selectedPractitioner.first_name} {selectedPractitioner.last_name}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{label}</span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px] bg-background z-50">
        <DropdownMenuLabel>Select {label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {showAll && (
          <DropdownMenuItem
            onClick={() => onSelect('all')}
            className="cursor-pointer"
          >
            <Users className="h-4 w-4 mr-2" />
            <span className="flex-1">All Practitioners</span>
            {selectedId === 'all' && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        )}

        {showAll && practitioners.length > 0 && <DropdownMenuSeparator />}

        {activePractitioners.map((practitioner) => (
          <DropdownMenuItem
            key={practitioner.id}
            onClick={() => onSelect(practitioner.id)}
            className="cursor-pointer"
          >
            <Avatar className="h-6 w-6 mr-2">
              <AvatarImage src={practitioner.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {practitioner.first_name?.[0]}
                {practitioner.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm">
                Dr {practitioner.first_name} {practitioner.last_name}
              </div>
              {practitioner.specialization && (
                <div className="text-xs text-muted-foreground truncate">
                  {practitioner.specialization}
                </div>
              )}
            </div>
            {selectedId === practitioner.id && <Check className="h-4 w-4 text-primary ml-2" />}
          </DropdownMenuItem>
        ))}

        {inactivePractitioners.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Inactive
            </DropdownMenuLabel>
            {inactivePractitioners.map((practitioner) => (
              <DropdownMenuItem
                key={practitioner.id}
                onClick={() => onSelect(practitioner.id)}
                className="cursor-pointer opacity-60"
              >
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarImage src={practitioner.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {practitioner.first_name?.[0]}
                    {practitioner.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm">
                    Dr {practitioner.first_name} {practitioner.last_name}
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs ml-2">Inactive</Badge>
                {selectedId === practitioner.id && <Check className="h-4 w-4 text-primary ml-2" />}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {practitioners.length === 0 && !loading && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No practitioners found
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
