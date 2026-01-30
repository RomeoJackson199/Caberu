/**
 * @deprecated Use BusinessPicker from '@/components/shared/BusinessPicker' instead
 * This component is kept for backward compatibility with its specific prop interface
 */

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { logger } from '@/lib/logger';

interface Business {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

interface BusinessPickerHomepageProps {
  onBusinessSelected: (businessId: string) => void;
}

/**
 * Homepage-specific business picker with location filtering
 * @deprecated Consider migrating to BusinessPicker from shared components
 */
export function BusinessPickerHomepage({ onBusinessSelected }: BusinessPickerHomepageProps) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");

  useEffect(() => {
    loadBusinesses();
  }, []);

  const getBusinessLocation = (business: Business) => {
    const potentialLocation = (business as Business & { city?: string | null }).city;
    if (potentialLocation && potentialLocation.trim().length > 0) {
      return potentialLocation.trim();
    }

    if (business.tagline) {
      const locationMatch = business.tagline.match(/(?:located\s+)?(?:in|at)\s+([A-Za-z\s]+)$/i);
      if (locationMatch?.[1]) {
        return locationMatch[1].trim();
      }

      if (business.tagline.includes(",")) {
        const parts = business.tagline.split(",");
        const lastPart = parts[parts.length - 1]?.trim();
        if (lastPart && lastPart.split(" ").length <= 4) {
          return lastPart;
        }
      }
    }

    return undefined;
  };

  const availableLocations = useMemo(() => {
    const locations = new Set<string>();
    businesses.forEach((business) => {
      const location = getBusinessLocation(business);
      if (location) {
        locations.add(location);
      }
    });
    return Array.from(locations).sort((a, b) => a.localeCompare(b));
  }, [businesses]);

  useEffect(() => {
    if (selectedLocation !== "all" && !availableLocations.includes(selectedLocation)) {
      setSelectedLocation("all");
    }
  }, [availableLocations, selectedLocation]);

  const filteredBusinesses = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return businesses.filter((business) => {
      const location = getBusinessLocation(business);
      const matchesLocation = selectedLocation === "all" || location === selectedLocation;

      if (!matchesLocation) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const nameMatch = business.name.toLowerCase().includes(normalizedSearch);
      const taglineMatch = business.tagline?.toLowerCase().includes(normalizedSearch) ?? false;

      return nameMatch || taglineMatch;
    });
  }, [businesses, searchTerm, selectedLocation]);

  const loadBusinesses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, slug, tagline, logo_url, primary_color, secondary_color")
        .order("name");

      if (error) throw error;
      setBusinesses(data || []);
    } catch (error) {
      logger.error("Error loading businesses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBusiness = (businessId: string) => {
    sessionStorage.setItem("selected_business_id", businessId);
    onBusinessSelected(businessId);
  };

  if (loading) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Select Your Business</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose your business to get started with booking appointments
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (businesses.length === 0) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="max-w-2xl mx-auto text-center">
            <CardHeader>
              <CardTitle>No Businesses Available</CardTitle>
              <CardDescription>
                There are currently no businesses available in the system.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 gradient-text">Select Your Business</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Choose your business to get started with booking appointments and accessing services
          </p>
        </div>

        <div className="max-w-6xl mx-auto mb-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="w-full md:max-w-sm">
              <label htmlFor="business-search" className="sr-only">
                Search businesses
              </label>
              <Input
                id="business-search"
                type="search"
                placeholder="Search by business name or tagline"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            {availableLocations.length > 0 && (
              <div className="flex flex-wrap items-center gap-2" aria-label="Filter businesses by location">
                <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Locations
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={selectedLocation === "all" ? "default" : "outline"}
                    onClick={() => setSelectedLocation("all")}
                  >
                    All
                  </Button>
                  {availableLocations.map((location) => (
                    <Button
                      key={location}
                      type="button"
                      variant={selectedLocation === location ? "default" : "outline"}
                      onClick={() => setSelectedLocation(location)}
                    >
                      {location}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {!loading && filteredBusinesses.length === 0 ? (
          <Card className="max-w-4xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle>No Matching Businesses</CardTitle>
              <CardDescription>
                Try adjusting your search or filters to find the business you're looking for.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {filteredBusinesses.map((business) => (
              <Card
                key={business.id}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => handleSelectBusiness(business.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {business.logo_url ? (
                        <img
                          src={business.logo_url}
                          alt={business.name}
                          className="w-12 h-12 object-contain rounded"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: business.primary_color + '20' }}
                        >
                          <Building2
                            className="w-6 h-6"
                            style={{ color: business.primary_color }}
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <CardTitle className="text-xl group-hover:text-primary transition-colors">
                          {business.name}
                        </CardTitle>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  {business.tagline && (
                    <CardDescription className="mt-2 line-clamp-2">
                      {business.tagline}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectBusiness(business.id);
                    }}
                  >
                    Select Business
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
