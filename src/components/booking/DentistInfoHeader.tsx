import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Dentist } from "./types";

function getDentistInitials(dentist: Dentist): string {
  const fn = dentist.first_name || dentist.profiles?.first_name || "";
  const ln = dentist.last_name || dentist.profiles?.last_name || "";
  return `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase();
}

interface DentistInfoHeaderProps {
  dentist: Dentist;
}

export function DentistInfoHeader({ dentist }: DentistInfoHeaderProps) {
  return (
    <div className="flex items-center gap-4 pb-4 border-b">
      <Avatar className="h-16 w-16">
        <AvatarImage
          src={dentist.profiles?.profile_picture_url || undefined}
          className="object-cover"
        />
        <AvatarFallback className="bg-primary/10 text-primary text-lg">
          {getDentistInitials(dentist)}
        </AvatarFallback>
      </Avatar>
      <div>
        <h2 className="text-xl font-bold">
          Dr. {dentist.first_name} {dentist.last_name}
        </h2>
        <p className="text-muted-foreground capitalize">
          {dentist.specialization || "General Dentistry"}
        </p>
      </div>
    </div>
  );
}
