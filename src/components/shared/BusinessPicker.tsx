/**
 * Unified Business Picker Component
 * Consolidates BusinessSelector, BusinessPickerDialog, and BusinessPickerHomepage
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, Check, ChevronDown, Crown } from 'lucide-react';

type BusinessPickerVariant = 'dropdown' | 'dialog' | 'compact';

interface BusinessPickerProps {
  variant?: BusinessPickerVariant;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/**
 * Dropdown variant - compact button with dropdown menu
 */
const DropdownVariant = () => {
  const { businessName, memberships, loading, switchBusiness } = useBusinessContext();
  const navigate = useNavigate();

  const handleSwitchBusiness = async (businessId: string, role: string) => {
    await switchBusiness(businessId);
    const isProvider = role === 'dentist' || role === 'admin' || role === 'owner';
    navigate(isProvider ? '/dentist/dashboard' : '/dashboard', { replace: true });
  };

  if (loading) {
    return <Skeleton className="h-10 w-48" />;
  }

  if (memberships.length === 0) {
    return null;
  }

  if (memberships.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{businessName}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Building2 className="h-4 w-4" />
          <span>{businessName || 'Select Business'}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch Business</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {[...memberships]
          .sort((a, b) => {
            // Owner memberships first
            if (a.role === 'owner' && b.role !== 'owner') return -1;
            if (a.role !== 'owner' && b.role === 'owner') return 1;
            return (a.business?.name || '').localeCompare(b.business?.name || '');
          })
          .map((membership) => (
          <DropdownMenuItem
            key={membership.id}
            onClick={() => handleSwitchBusiness(membership.business_id, membership.role)}
            className="gap-2"
          >
            <Check
              className={`h-4 w-4 ${
                membership.business?.name === businessName ? 'opacity-100' : 'opacity-0'
              }`}
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-medium">{membership.business?.name}</span>
                {membership.role === 'owner' && (
                  <Crown className="h-3 w-3 text-amber-500" />
                )}
              </div>
              <span className="text-xs text-muted-foreground capitalize">{membership.role}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * Dialog variant - modal for business selection
 */
const DialogVariant = ({ open, onOpenChange }: { open?: boolean; onOpenChange?: (open: boolean) => void }) => {
  const { memberships, switchBusiness, businessId } = useBusinessContext();
  const [selecting, setSelecting] = useState(false);
  const [allBusinesses, setAllBusinesses] = useState<any[]>([]);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      // Get current user's profile ID for owner sorting
      const fetchProfileId = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('secure_profiles_view')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();
          if (profile) {
            setCurrentUserProfileId(profile.id);
          }
        }
      };

      const fetchBusinesses = async () => {
        setIsLoadingAll(true);
        let { data, error } = await supabase
          .from('public_businesses_view')
          .select('*')
          .order('name');

        if (error || !data || data.length === 0) {
          const fallback = await supabase
            .from('businesses')
            .select('id, name, slug, logo_url, tagline, template_type, owner_profile_id')
            .order('name');
          data = fallback.data;
        }

        if (data) {
          setAllBusinesses(data);
        }
        setIsLoadingAll(false);
      };

      fetchProfileId();
      fetchBusinesses();
    }
  }, [open]);

  const handleSelectBusiness = async (targetBusinessId: string) => {
    setSelecting(true);
    try {
      await switchBusiness(targetBusinessId);
      onOpenChange?.(false);

      const membership = memberships.find(m => m.business_id === targetBusinessId);
      const role = membership?.role || 'patient';
      const isProvider = role === 'dentist' || role === 'admin' || role === 'owner';
      navigate(isProvider ? '/dentist/dashboard' : '/dashboard', { replace: true });
    } finally {
      setSelecting(false);
    }
  };

  const rawBusinessList = allBusinesses.length > 0 ? allBusinesses : memberships;

  // Sort: owned businesses first, then alphabetically
  const businessList = [...rawBusinessList].sort((a, b) => {
    const aIsOwned = a.owner_profile_id === currentUserProfileId;
    const bIsOwned = b.owner_profile_id === currentUserProfileId;

    if (aIsOwned && !bIsOwned) return -1;
    if (!aIsOwned && bIsOwned) return 1;
    const aName = a.name || (a as any).business?.name || '';
    const bName = b.name || (b as any).business?.name || '';
    return aName.localeCompare(bName);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Select Your Business
          </DialogTitle>
          <DialogDescription>
            Choose which business you want to work with. You can switch anytime.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {isLoadingAll ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            businessList.map((item) => {
              const businessItemName = item.name || (item as any).business?.name;
              const bId = item.id || (item as any).business_id;
              const membership = memberships.find(m => m.business_id === bId);
              const role = membership?.role || 'Guest';
              const isSelected = businessId === bId;
              const isOwner = item.owner_profile_id === currentUserProfileId;

              return (
                <Card
                  key={bId}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleSelectBusiness(bId)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {businessItemName}
                          {isSelected && <Check className="h-5 w-5 text-primary" />}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          <div className="flex items-center flex-wrap gap-2">
                            {isOwner && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                <Crown className="h-3 w-3" />
                                Owner
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                role !== 'Guest'
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {role}
                            </span>
                          </div>
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        variant={isSelected ? 'default' : 'outline'}
                        disabled={selecting || isSelected}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectBusiness(bId);
                        }}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Compact variant - minimal display for single business
 */
const CompactVariant = () => {
  const { businessName, loading } = useBusinessContext();

  if (loading) {
    return <Skeleton className="h-6 w-32" />;
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Building2 className="h-4 w-4" />
      <span>{businessName || 'No business selected'}</span>
    </div>
  );
};

/**
 * Unified Business Picker Component
 */
export function BusinessPicker({
  variant = 'dropdown',
  open,
  onOpenChange,
  className,
}: BusinessPickerProps) {
  switch (variant) {
    case 'dialog':
      return <DialogVariant open={open} onOpenChange={onOpenChange} />;
    case 'compact':
      return <div className={className}><CompactVariant /></div>;
    case 'dropdown':
    default:
      return <div className={className}><DropdownVariant /></div>;
  }
}

// Export sub-components for backwards compatibility
export const BusinessSelector = () => <BusinessPicker variant="dropdown" />;
export const BusinessPickerDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange?: (open: boolean) => void }) => (
  <BusinessPicker variant="dialog" open={open} onOpenChange={onOpenChange} />
);

/**
 * BusinessSelectionForPatients - Patient-specific business selection
 * Used in booking flow and patient business selection dialogs
 */
interface BusinessSelectionForPatientsProps {
  onSelectBusiness: (businessId: string, businessName: string) => void;
  selectedBusinessId?: string;
}

export function BusinessSelectionForPatients({ onSelectBusiness, selectedBusinessId }: BusinessSelectionForPatientsProps) {
  const [businesses, setBusinesses] = useState<Array<{
    id: string;
    name: string;
    slug: string;
    tagline?: string;
    logo_url?: string;
    primary_color?: string;
    template_type?: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('id, name, slug, tagline, logo_url, primary_color, template_type')
          .in('template_type', ['healthcare', 'dentist'])
          .order('name');

        if (!error && data) {
          setBusinesses(data);
        }
      } catch (error) {
        console.error('Error fetching businesses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinesses();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <Card>
        <CardHeader className="text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <CardDescription>No businesses available at the moment.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Choose Your Business</h2>
        <p className="text-muted-foreground">Select the business where you'd like to book your appointment</p>
      </div>
      
      {businesses.map((business) => (
        <Card
          key={business.id}
          className={`cursor-pointer transition-all hover:shadow-lg ${
            selectedBusinessId === business.id
              ? 'ring-2 ring-primary shadow-lg'
              : 'hover:bg-muted/50'
          }`}
          onClick={() => onSelectBusiness(business.id, business.name)}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1">
                {business.logo_url ? (
                  <img 
                    src={business.logo_url} 
                    alt={business.name}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {business.name}
                    {selectedBusinessId === business.id && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </CardTitle>
                  {business.tagline && (
                    <CardDescription className="mt-1">
                      {business.tagline}
                    </CardDescription>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant={selectedBusinessId === business.id ? 'default' : 'outline'}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectBusiness(business.id, business.name);
                }}
              >
                {selectedBusinessId === business.id ? 'Selected' : 'Select'}
              </Button>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
