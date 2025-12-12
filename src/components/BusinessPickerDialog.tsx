import { useState, useEffect } from 'react';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Building2, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface BusinessPickerDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function BusinessPickerDialog({ open, onOpenChange }: BusinessPickerDialogProps) {
  const { memberships, switchBusiness, loading, businessId } = useBusinessContext();
  const [selecting, setSelecting] = useState(false);
  const [allBusinesses, setAllBusinesses] = useState<any[]>([]);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const navigate = useNavigate();

  // Always fetch all businesses to allow switching to any
  useEffect(() => {
    if (open) {
      const fetchBusinesses = async () => {
        setIsLoadingAll(true);
        const supabase = await import("@/integrations/supabase/client").then(m => m.supabase);

        // Try view first, fallback to businesses table
        let { data, error } = await supabase
          .from('public_businesses_view')
          .select('*')
          .order('name');

        if (error || !data || data.length === 0) {
          // Fallback to businesses table directly
          const fallback = await supabase
            .from('businesses')
            .select('id, name, slug, logo_url, tagline, template_type')
            .order('name');
          data = fallback.data;
          error = fallback.error;
        }

        if (!error && data) {
          setAllBusinesses(data);
        }
        setIsLoadingAll(false);
      };
      fetchBusinesses();
    }
  }, [open]);

  const handleSelectBusiness = async (targetBusinessId: string) => {
    setSelecting(true);
    try {
      await switchBusiness(targetBusinessId);
      onOpenChange?.(false);

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
          {(allBusinesses.length > 0 ? allBusinesses : memberships)
            .map((item) => {
              // Item is from public view (flat) OR membership (nested)
              // If we have allBusinesses, we iterate that.

              // Normalize data
              const businessName = item.name || (item as any).business?.name;
              const bId = item.id || (item as any).business_id;

              // Find membership for this business if it exists
              const membership = memberships.find(m => m.business_id === bId);
              const role = membership?.role || 'Guest';

              const isSelected = businessId === bId;

              return (
                <Card
                  key={bId}
                  className={`cursor-pointer transition-all hover:shadow-md ${isSelected
                    ? 'ring-2 ring-primary'
                    : 'hover:bg-muted/50'
                    }`}
                  onClick={() => handleSelectBusiness(bId)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {businessName}
                          {isSelected && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${role !== 'Guest'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                            }`}>
                            {role}
                          </span>
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
            })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
