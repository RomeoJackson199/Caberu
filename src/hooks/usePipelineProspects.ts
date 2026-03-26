import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Prospect, ProspectStatus } from '@/types/prospect';
import { DEFAULT_PROSPECT_FIELDS } from '@/types/prospect';
import { toast } from 'sonner';

function dbToProspect(row: any): Prospect {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    website: row.website,
    rating: row.rating ? Number(row.rating) : null,
    reviewCount: row.review_count,
    dentistCount: row.dentist_count,
    languages: row.languages || [],
    onlineBooking: row.online_booking === 'true' ? true : row.online_booking === 'Partial' ? 'Partial' : false,
    priority: row.priority as Prospect['priority'],
    receptionSignal: row.reception_signal,
    notes: row.notes,
    lat: row.lat,
    lng: row.lng,
    contactName: row.contact_name || '',
    contactRole: row.contact_role || '',
    contactPersonality: row.contact_personality || '',
    painPoints: row.pain_points || [],
    visitDate: row.visit_date || null,
    visitNotes: row.visit_notes || '',
    personalNotes: row.personal_notes || '',
    talkTrack: row.talk_track || '',
    status: (row.status || 'new') as ProspectStatus,
  };
}

function prospectToDb(p: Prospect) {
  return {
    name: p.name,
    address: p.address,
    phone: p.phone,
    website: p.website,
    rating: p.rating,
    review_count: p.reviewCount,
    dentist_count: p.dentistCount,
    languages: p.languages,
    online_booking: p.onlineBooking === true ? 'true' : p.onlineBooking === 'Partial' ? 'Partial' : 'false',
    priority: p.priority,
    reception_signal: p.receptionSignal,
    notes: p.notes,
    lat: p.lat,
    lng: p.lng,
    contact_name: p.contactName || '',
    contact_role: p.contactRole || '',
    contact_personality: p.contactPersonality || '',
    pain_points: p.painPoints || [],
    visit_date: p.visitDate || null,
    visit_notes: p.visitNotes || '',
    personal_notes: p.personalNotes || '',
    talk_track: p.talkTrack || '',
    status: p.status || 'new',
  };
}

export function usePipelineProspects() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pipeline_prospects' as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch prospects:', error);
      toast.error('Failed to load prospects');
    } else {
      setProspects((data as any[])?.map(dbToProspect) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  const importProspects = useCallback(async (data: Prospect[]) => {
    // Delete all existing
    await supabase.from('pipeline_prospects' as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const { data: user } = await supabase.auth.getUser();
    const rows = data.map(p => ({
      ...prospectToDb({ ...DEFAULT_PROSPECT_FIELDS, ...p } as Prospect),
      created_by: user.user?.id,
    }));

    const { error } = await supabase.from('pipeline_prospects' as any).insert(rows as any);
    if (error) {
      console.error('Import failed:', error);
      toast.error('Import failed: ' + error.message);
      return false;
    }
    toast.success(`Imported ${rows.length} prospects`);
    await fetchProspects();
    return true;
  }, [fetchProspects]);

  const updateProspect = useCallback(async (prospect: Prospect) => {
    if (!prospect.id) return;
    const { error } = await supabase
      .from('pipeline_prospects' as any)
      .update({ ...prospectToDb(prospect), updated_at: new Date().toISOString() } as any)
      .eq('id', prospect.id);

    if (error) {
      toast.error('Failed to save');
      return;
    }
    setProspects(prev => prev.map(p => p.id === prospect.id ? prospect : p));
    toast.success('Saved');
  }, []);

  return { prospects, loading, importProspects, updateProspect, refetch: fetchProspects };
}
