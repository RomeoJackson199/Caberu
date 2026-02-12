import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, CalendarDays, Users } from "lucide-react";
import { format } from "date-fns";
import { AnimatedBackground, EmptyState } from "@/components/ui/polished-components";
import type { Dentist } from "./types";

function getDentistInitials(dentist: Dentist): string {
  const fn = dentist.first_name || dentist.profiles?.first_name || "";
  const ln = dentist.last_name || dentist.profiles?.last_name || "";
  return `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase();
}

interface DentistSelectionStepProps {
  dentists: Dentist[];
  onSelect: (dentist: Dentist) => void;
  onBack?: () => void;
}

export function DentistSelectionStep({ dentists, onSelect, onBack }: DentistSelectionStepProps) {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto p-4 py-8 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 rounded-2xl p-6 mb-6">
        <AnimatedBackground />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack || (() => navigate(-1))}
              className="gap-2 hover:bg-white/50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>

          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                <CalendarDays className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Select Your Dentist
              </h1>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose your preferred dentist for your appointment
            </p>
          </div>
        </div>
      </div>

      {/* Dentist Grid */}
      {dentists.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Dentists Available"
          description="This clinic doesn't have any dentists available for booking at the moment."
          action={{
            label: "Go Back",
            onClick: () => navigate(-1),
          }}
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {dentists.map((dentist) => {
            const displayName = `${dentist.first_name || dentist.profiles?.first_name} ${dentist.last_name || dentist.profiles?.last_name}`;
            const bio = dentist.profiles?.bio;
            const email = dentist.email || dentist.profiles?.email;
            const phone = dentist.profiles?.phone;

            const nextAvailableLabel = dentist.next_available_slot
              ? format(new Date(dentist.next_available_slot), "EEE d MMM, HH:mm")
              : null;

            return (
              <Card
                key={dentist.id}
                className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-500/40"
                onClick={() => onSelect(dentist)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-14 w-14 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
                      <AvatarImage
                        src={dentist.profiles?.profile_picture_url || undefined}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 text-primary text-base font-bold">
                        {getDentistInitials(dentist)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate group-hover:text-blue-600 transition-colors">
                        Dr. {displayName}
                      </h3>
                      <p className="text-sm text-muted-foreground capitalize">
                        {dentist.specialization || "General Dentistry"}
                      </p>
                    </div>
                  </div>

                  {bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2 border-t pt-3">
                      {bio}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {email && (
                      <span className="flex items-center gap-1">
                        📧 {email}
                      </span>
                    )}
                    {phone && (
                      <span className="flex items-center gap-1">
                        📞 {phone}
                      </span>
                    )}
                  </div>

                  {nextAvailableLabel && (
                    <p className="text-xs text-emerald-600 font-medium">
                      Next available: {nextAvailableLabel}
                    </p>
                  )}

                  <Button size="sm" className="w-full mt-2 group-hover:bg-blue-600">
                    Select Dr. {dentist.first_name || dentist.profiles?.first_name}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
