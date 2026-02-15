import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, MapPin, Phone, Mail, Globe, Clock } from "lucide-react";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useBusinessDetails } from "@/hooks/useBusinessDetails";
import { cn } from "@/lib/utils";

interface AboutBusinessCardProps {
  className?: string;
}

export function AboutBusinessCard({ className }: AboutBusinessCardProps) {
  const { businessId } = useBusinessContext();
  const { data: business, isLoading } = useBusinessDetails(businessId);

  if (isLoading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!business) return null;

  const infoItems = [
    { icon: MapPin, value: business.address, label: "Address" },
    { icon: Phone, value: business.phone, label: "Phone" },
    { icon: Mail, value: business.email, label: "Email" },
    { icon: Globe, value: business.website, label: "Website" },
  ].filter(item => item.value);

  // Don't render if there's no useful info to show
  if (!business.tagline && !business.bio && infoItems.length === 0) return null;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">About this Business</CardTitle>
        </div>
        {business.tagline && (
          <p className="text-sm text-muted-foreground">{business.tagline}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {business.bio && (
          <p className="text-sm text-foreground/80">{business.bio}</p>
        )}
        {infoItems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {infoItems.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{value}</span>
              </div>
            ))}
          </div>
        )}
        {business.business_hours && Object.keys(business.business_hours).length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm font-medium mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Business Hours</span>
            </div>
            <div className="grid grid-cols-1 gap-0.5 text-xs text-muted-foreground">
              {Object.entries(business.business_hours).map(([day, hours]) => (
                <div key={day} className="flex justify-between">
                  <span className="capitalize">{day}</span>
                  <span>{typeof hours === 'string' ? hours : hours && typeof hours === 'object' && 'open' in hours && 'close' in hours ? `${(hours as { open: string; close: string }).open} - ${(hours as { open: string; close: string }).close}` : 'Closed'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
