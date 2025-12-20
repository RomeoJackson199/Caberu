import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Award, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DentistProfiles = () => {
  const navigate = useNavigate();

  const { data: dentists, isLoading } = useQuery({
    queryKey: ["public-dentists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dentists")
        .select(`
          *,
          profiles:profile_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq("is_active", true);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dental-primary/5 to-dental-accent/5">
        <div className="container mx-auto px-4 py-8">
          {/* Header skeleton */}
          <div className="flex items-center gap-4 mb-8">
            <div className="h-9 w-28 bg-muted animate-pulse rounded" />
            <div className="space-y-2">
              <div className="h-8 w-48 bg-muted animate-pulse rounded" />
              <div className="h-4 w-64 bg-muted animate-pulse rounded" />
            </div>
          </div>
          {/* Cards skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-6 rounded-lg border bg-card space-y-4">
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-muted animate-pulse mb-4" />
                  <div className="h-6 w-40 bg-muted animate-pulse rounded mb-2" />
                  <div className="h-5 w-24 bg-muted animate-pulse rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-muted animate-pulse rounded" />
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-10 w-full bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dental-primary/5 to-dental-accent/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
          <div>
            <h1 className="text-3xl font-bold gradient-text">Our Dental Team</h1>
            <p className="text-dental-muted-foreground">Meet our expert dentists and specialists</p>
          </div>
        </div>

        {/* Dentists Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {dentists?.map((dentist) => (
            <Card key={dentist.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-dental-primary to-dental-accent mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {dentist.profiles?.first_name?.[0]}{dentist.profiles?.last_name?.[0]}
                  </span>
                </div>
                <CardTitle className="text-xl">
                  Dr. {dentist.profiles?.first_name} {dentist.profiles?.last_name}
                </CardTitle>
                <Badge variant="secondary" className="w-fit mx-auto">
                  {dentist.specialization}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-dental-muted-foreground">
                  <Mail className="w-4 h-4" />
                  {dentist.profiles?.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-dental-muted-foreground">
                  <Award className="w-4 h-4" />
                  License: {dentist.license_number}
                </div>
                <Button
                  className="w-full"
                  onClick={() => navigate("/")}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Appointment
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DentistProfiles;