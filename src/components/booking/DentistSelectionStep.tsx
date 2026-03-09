import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  CalendarDays,
  Users,
  Info,
  ChevronLeft,
  ChevronRight,
  Star,
  Mail,
  Phone,
  MapPin,
  Stethoscope,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { AnimatedBackground, EmptyState } from "@/components/ui/polished-components";
import { cn } from "@/lib/utils";
import type { Dentist } from "./types";

function getDentistInitials(dentist: Dentist): string {
  const fn = dentist.first_name || dentist.profiles?.first_name || "";
  const ln = dentist.last_name || dentist.profiles?.last_name || "";
  return `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase();
}

function getDentistName(dentist: Dentist): string {
  return `${dentist.first_name || dentist.profiles?.first_name || ""} ${dentist.last_name || dentist.profiles?.last_name || ""}`.trim();
}

interface DentistSelectionStepProps {
  dentists: Dentist[];
  onSelect: (dentist: Dentist) => void;
  onBack?: () => void;
}

export function DentistSelectionStep({ dentists, onSelect, onBack }: DentistSelectionStepProps) {
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const selectedDentist = selectedIndex !== null ? dentists[selectedIndex] : null;

  const goToPrev = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const goToNext = () => {
    if (selectedIndex !== null && selectedIndex < dentists.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

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
              Choose your preferred dentist — tap "More Info" to learn about each one
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
          {dentists.map((dentist, index) => {
            const displayName = getDentistName(dentist);
            const nextAvailableLabel = dentist.next_available_slot
              ? format(new Date(dentist.next_available_slot), "EEE d MMM, HH:mm")
              : null;

            return (
              <Card
                key={dentist.id}
                className="group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/40 overflow-hidden rounded-2xl"
              >
                <CardContent className="p-0">
                  {/* Top section with avatar + info */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-16 w-16 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all shadow-md">
                        <AvatarImage
                          src={dentist.profiles?.profile_picture_url || undefined}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-lg font-bold">
                          {getDentistInitials(dentist)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                          Dr. {displayName}
                        </h3>
                        <Badge variant="secondary" className="mt-1 text-xs font-medium">
                          <Stethoscope className="h-3 w-3 mr-1" />
                          {dentist.specialization || "General Dentistry"}
                        </Badge>
                      </div>
                    </div>

                    {dentist.profiles?.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {dentist.profiles.bio}
                      </p>
                    )}

                    {nextAvailableLabel && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-3 py-1.5 w-fit">
                        <Clock className="h-3.5 w-3.5" />
                        Next: {nextAvailableLabel}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 px-5 pb-5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIndex(index);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all rounded-xl border border-border"
                    >
                      <Info className="h-4 w-4" />
                      More Info
                    </button>
                    <button
                      onClick={() => onSelect(dentist)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all rounded-xl"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Select
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dentist Detail Dialog */}
      <Dialog open={selectedIndex !== null} onOpenChange={(open) => !open && setSelectedIndex(null)}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0">
          {selectedDentist && (() => {
            const displayName = getDentistName(selectedDentist);
            const bio = selectedDentist.profiles?.bio;
            const email = selectedDentist.email || selectedDentist.profiles?.email;
            const phone = selectedDentist.profiles?.phone;
            const address = selectedDentist.clinic_address || selectedDentist.profiles?.address;
            const nextAvailableLabel = selectedDentist.next_available_slot
              ? format(new Date(selectedDentist.next_available_slot), "EEEE d MMMM, HH:mm")
              : null;

            return (
              <>
                {/* Profile header with gradient */}
                <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background pt-8 pb-6 px-6">
                  <DialogHeader className="items-center text-center space-y-4">
                    <Avatar className="h-28 w-28 ring-4 ring-background shadow-2xl">
                      <AvatarImage
                        src={selectedDentist.profiles?.profile_picture_url || undefined}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-3xl font-bold">
                        {getDentistInitials(selectedDentist)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle className="text-2xl font-bold">
                        Dr. {displayName}
                      </DialogTitle>
                      <Badge variant="secondary" className="mt-2">
                        <Stethoscope className="h-3 w-3 mr-1" />
                        {selectedDentist.specialization || "General Dentistry"}
                      </Badge>
                    </div>
                  </DialogHeader>

                  {/* Navigation arrows */}
                  {dentists.length > 1 && (
                    <>
                      <button
                        onClick={goToPrev}
                        disabled={selectedIndex === 0}
                        className={cn(
                          "absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 shadow-md backdrop-blur-sm transition-all hover:bg-background",
                          selectedIndex === 0 && "opacity-30 cursor-not-allowed"
                        )}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={goToNext}
                        disabled={selectedIndex === dentists.length - 1}
                        className={cn(
                          "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 shadow-md backdrop-blur-sm transition-all hover:bg-background",
                          selectedIndex === dentists.length - 1 && "opacity-30 cursor-not-allowed"
                        )}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-5">
                  {/* Bio */}
                  {bio && (
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-semibold text-foreground">About</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{bio}</p>
                    </div>
                  )}

                  {/* Contact info */}
                  <div className="space-y-2.5">
                    {email && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Mail className="h-4 w-4" />
                        </div>
                        <span className="text-muted-foreground">{email}</span>
                      </div>
                    )}
                    {phone && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Phone className="h-4 w-4" />
                        </div>
                        <span className="text-muted-foreground">{phone}</span>
                      </div>
                    )}
                    {address && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <span className="text-muted-foreground">{address}</span>
                      </div>
                    )}
                  </div>

                  {/* Next available */}
                  {nextAvailableLabel && (
                    <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl px-4 py-3">
                      <Clock className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="text-xs text-emerald-600/70 font-medium">Next Available</p>
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{nextAvailableLabel}</p>
                      </div>
                    </div>
                  )}

                  {/* Counter */}
                  {dentists.length > 1 && (
                    <div className="flex items-center justify-center gap-1.5 pt-1">
                      {dentists.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedIndex(i)}
                          className={cn(
                            "h-2 rounded-full transition-all",
                            i === selectedIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/25 hover:bg-muted-foreground/40"
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6">
                  <Button
                    className="w-full h-12 text-base font-bold shadow-lg"
                    onClick={() => {
                      setSelectedIndex(null);
                      onSelect(selectedDentist);
                    }}
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Book with Dr. {selectedDentist.first_name || selectedDentist.profiles?.first_name}
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
