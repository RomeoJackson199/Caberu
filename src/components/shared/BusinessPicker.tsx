/**
 * Unified Business Picker Component
 * Consolidates BusinessPickerDialog, BusinessSelector, and BusinessPickerHomepage
 *
 * Supports three variants:
 * - dropdown: Compact dropdown for navigation (BusinessSelector)
 * - dialog: Modal dialog for business selection (BusinessPickerDialog)
 * - compact: Simplified compact view for inline usage
 */

import { useState, useEffect, useMemo } from 'react';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Building2, Check, ChevronDown, MapPin, ChevronRight, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface Business {
  id: string;
  name: string;
  slug?: string;
  tagline?: string | null;
  logo_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  city?: string | null;
}

interface BusinessPickerProps {
  variant: 'dropdown' | 'dialog' | 'compact';
  showSearch?: boolean;
  onSelect?: (businessId: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Dropdown variant - compact menu for navigation
 */
const BusinessDropdown = ({ onSelect }: Pick<BusinessPickerProps, 'onSelect'>) => {
  const { businessName, memberships, loading, switchBusiness } = useBusinessContext();
  const navigate = useNavigate();

  const handleSwitchBusiness = async (businessId: string, role: string) => {
    await switchBusiness(businessId);

    onSelect?.(businessId);

    // Redirect based on role in that business
    const isProvider = role === 'dentist' || role === 'admin' || role === 'owner';
    if (isProvider) {
      navigate('/dentist/dashboard', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
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
        {memberships.map((membership) => (
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
              <span className="font-medium">{membership.business?.name}</span>
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
const BusinessDialog = ({ open, onOpenChange, onSelect }: Pick<BusinessPickerProps, 'open' | 'onOpenChange' | 'onSelect'>) => {
  const { memberships, switchBusiness, loading, businessId } = useBusinessContext();
  const [selecting, setSelecting] = useState(false);
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const navigate = useNavigate();

  // Fetch all businesses when dialog opens
  useEffect(() => {
    if (open) {
      const fetchBusinesses = async () => {
        setIsLoadingAll(true);
        try {
          // Try view first, fallback to businesses table
          let { data, error } = await supabase
            .from('public_businesses_view')
            .select('*')
            .order('name');

          if (error || !data || data.length === 0) {
            // Fallback to businesses table directly
            const fallback = await supabase
              .from('businesses')
              .select('id, name, slug, logo_url, tagline')
              .order('name');
            data = fallback.data;
            error = fallback.error;
          }

          if (!error && data) {
            setAllBusinesses(data);
          }
        } catch (err) {
          logger.error('Error fetching businesses:', err);
        } finally {
          setIsLoadingAll(false);
        }
      };
      fetchBusinesses();
    }
  }, [open]);

  const handleSelectBusiness = async (targetBusinessId: string) => {
    setSelecting(true);
    try {
      await switchBusiness(targetBusinessId);
      onOpenChange?.(false);
      onSelect?.(targetBusinessId);

      // Find membership for this business to determine role
      const membership = memberships.find(m => m.business_id === targetBusinessId);
      const role = membership?.role || 'patient';

      // Redirect based on role in that business
      const isProvider = role === 'dentist' || role === 'admin' || role === 'owner';
      if (isProvider) {
        navigate('/dentist/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } finally {
      setSelecting(false);
    }
  };

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
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            (allBusinesses.length > 0 ? allBusinesses : memberships)
              .map((item) => {
                // Normalize data
                const businessName = item.name || (item as any).business?.name;
                const bId = item.id || (item as any).business_id;

                // Find membership for this business if it exists
                const membership = memberships.find(m => m.business_id === bId);
                const isCurrentBusiness = bId === businessId;

                return (
                  <Card
                    key={bId}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isCurrentBusiness ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleSelectBusiness(bId)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{businessName}</p>
                            {membership && (
                              <p className="text-xs text-muted-foreground capitalize">
                                {membership.role}
                              </p>
                            )}
                          </div>
                        </div>
                        {isCurrentBusiness && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </CardContent>
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
 * Compact variant - simplified inline view
 */
const BusinessCompact = ({ showSearch, onSelect }: Pick<BusinessPickerProps, 'showSearch' | 'onSelect'>) => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('public_businesses_view')
        .select('*')
        .order('name');

      if (!error && data) {
        setBusinesses(data);
      }
    } catch (err) {
      logger.error('Error loading businesses:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredBusinesses = useMemo(() => {
    if (!searchTerm) return businesses;
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return businesses.filter((business) =>
      business.name.toLowerCase().includes(normalizedSearch) ||
      business.tagline?.toLowerCase().includes(normalizedSearch)
    );
  }, [businesses, searchTerm]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search businesses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      <div className="grid gap-3">
        {filteredBusinesses.map((business) => (
          <Card
            key={business.id}
            className="cursor-pointer transition-all hover:shadow-md"
            onClick={() => onSelect?.(business.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{business.name}</p>
                    {business.tagline && (
                      <p className="text-xs text-muted-foreground">{business.tagline}</p>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

/**
 * Main BusinessPicker component
 */
export const BusinessPicker = ({
  variant,
  showSearch = false,
  onSelect,
  open,
  onOpenChange,
}: BusinessPickerProps) => {
  switch (variant) {
    case 'dropdown':
      return <BusinessDropdown onSelect={onSelect} />;
    case 'dialog':
      return <BusinessDialog open={open} onOpenChange={onOpenChange} onSelect={onSelect} />;
    case 'compact':
      return <BusinessCompact showSearch={showSearch} onSelect={onSelect} />;
    default:
      return <BusinessDropdown onSelect={onSelect} />;
  }
};

/**
 * Legacy exports for backwards compatibility
 * @deprecated Use BusinessPicker with variant prop instead
 */
export const BusinessSelector = () => <BusinessPicker variant="dropdown" />;
export const BusinessPickerDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange?: (open: boolean) => void }) => (
  <BusinessPicker variant="dialog" open={open} onOpenChange={onOpenChange} />
);
export const BusinessPickerHomepage = ({ onBusinessSelected }: { onBusinessSelected: (businessId: string) => void }) => (
  <BusinessPicker variant="compact" showSearch onSelect={onBusinessSelected} />
);
