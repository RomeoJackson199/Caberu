import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Award, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DentistProfilesSkeleton } from "@/components/ui/page-skeletons";

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
    return <DentistProfilesSkeleton />;
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