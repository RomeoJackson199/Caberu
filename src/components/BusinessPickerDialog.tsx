import { useState, useEffect } from 'react';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Building2, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface BusinessPickerDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function BusinessPickerDialog({ open, onOpenChange }: BusinessPickerDialogProps) {
  const { memberships, switchBusiness, loading, businessId } = useBusinessContext();
  const [selecting, setSelecting] = useState(false);
  const [allBusinesses, setAllBusinesses] = useState<any[]>([]);
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  // Fetch all businesses if user has no memberships
  useEffect(() => {
    if (open && memberships.length === 0) {
      const fetchBusinesses = async () => {
        setIsLoadingAll(true);
        const { data, error } = await import("@/integrations/supabase/client").then(m => m.supabase)
          .from('public_businesses_view')
          .select('*')
          .order('name');

        if (!error && data) {
          setAllBusinesses(data);
        }
        setIsLoadingAll(false);
      };
      fetchBusinesses();
    }
  }, [open, memberships.length]);

  const handleSelectBusiness = async (targetBusinessId: string) => {
    setSelecting(true);
    try {
      await switchBusiness(targetBusinessId);
      onOpenChange?.(false);
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
          {(memberships.length > 0 ? memberships : allBusinesses)
            .map((item) => {
              // Normalize item: membership has business nested, public view is flat
              const business = (item as any).business || item;
              const role = (item as any).role || 'Guest'; // Default role if viewing public list
              const bId = business.id || (item as any).business_id || item.id;

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
                          {business.name}
                          {isSelected && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
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
