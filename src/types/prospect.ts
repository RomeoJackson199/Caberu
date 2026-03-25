export type Priority = 'Hot' | 'Warm' | 'Cold';

export interface Prospect {
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: number | null;
  reviewCount: number | null;
  dentistCount: number | null;
  languages: string[];
  onlineBooking: boolean | 'Partial';
  priority: Priority;
  receptionSignal: string;
  notes: string;
  lat: number;
  lng: number;
}
