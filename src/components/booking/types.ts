export interface Dentist {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  specialization: string;
  license_number?: string;
  profile_id: string;
  clinic_address?: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    address?: string;
    bio?: string;
    profile_picture_url?: string | null;
  } | null;
  require_appointment_approval?: boolean;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  duration_minutes: number | null;
  category: string | null;
}

export type BookingStep = 'symptoms' | 'service' | 'dentist' | 'datetime' | 'confirm';

export interface AIBookingData {
  symptoms?: string;
  recommendedService?: string;
  urgency?: number;
}

export interface SuccessDetails {
  date: string;
  time: string;
  dentist?: string;
  reason?: string;
  pendingApproval?: boolean;
}
