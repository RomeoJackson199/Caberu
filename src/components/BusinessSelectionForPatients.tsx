/**
 * @deprecated Use BusinessPicker from '@/components/shared/BusinessPicker' instead
 * This file is kept for backward compatibility with different prop interface
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Business {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  logo_url?: string;
  primary_color?: string;
  template_type?: string;
}

interface BusinessSelectionForPatientsProps {
  onSelectBusiness: (businessId: string, businessName: string) => void;
  selectedBusinessId?: string;
}

/**
 * Patient-specific business selection with name callback
 * @deprecated Consider migrating to BusinessPicker from shared components
 */
export function BusinessSelectionForPatients({ onSelectBusiness, selectedBusinessId }: BusinessSelectionForPatientsProps) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('id, name, slug, tagline, logo_url, primary_color, template_type')
          .in('template_type', ['healthcare', 'dentist'])
          .order('name');

        if (error) throw error;
        setBusinesses(data || []);
      } catch (error) {
        console.error('Error fetching businesses:', error);
        toast({
          title: "Error",
          description: "Unable to load businesses. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBusinesses();
  }, [toast]);

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
        <CardContent className="pt-6 text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No businesses available at the moment.</p>
        </CardContent>
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
