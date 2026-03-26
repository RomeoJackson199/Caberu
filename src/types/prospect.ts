export type Priority = 'Hot' | 'Warm' | 'Cold';

export type ProspectStatus = 'new' | 'contacted' | 'meeting_scheduled' | 'visited' | 'proposal_sent' | 'won' | 'lost';

export interface Prospect {
  id?: string;
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
  // Contact person info
  contactName: string;
  contactRole: string;
  contactPersonality: string;
  // Sales tracking
  painPoints: string[];
  visitDate: string | null;
  visitNotes: string;
  personalNotes: string;
  talkTrack: string;
  status: ProspectStatus;
}

export const DEFAULT_PROSPECT_FIELDS: Partial<Prospect> = {
  contactName: '',
  contactRole: '',
  contactPersonality: '',
  painPoints: [],
  visitDate: null,
  visitNotes: '',
  personalNotes: '',
  talkTrack: '',
  status: 'new',
};
