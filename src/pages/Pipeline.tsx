import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useIsSuperAdmin } from '@/hooks/useSuperAdmin';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { supabase } from '@/integrations/supabase/client';
import type { Prospect, Priority } from '@/types/prospect';
import { Sidebar } from '@/components/pipeline/Sidebar';
import { DetailPanel } from '@/components/pipeline/DetailPanel';
import { ImportModal } from '@/components/pipeline/ImportModal';
import { usePipelineProspects } from '@/hooks/usePipelineProspects';

import { lazy, Suspense } from 'react';
const ProspectMap = lazy(() => import('@/components/pipeline/ProspectMap'));

export default function Pipeline() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { data: isSuperAdmin, isLoading: superAdminLoading } = useIsSuperAdmin();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
  }, []);

  if (isAuthenticated === null || superAdminLoading) {
    return <LoadingSpinner variant="overlay" message="Checking access..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#090d1a', color: '#dde4f5' }}>
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Access Denied</h1>
          <p style={{ color: '#56688e' }}>Only super admins can access the pipeline tool.</p>
        </div>
      </div>
    );
  }

  return <PipelineApp />;
}

function PipelineApp() {
  const { prospects, loading, importProspects, updateProspect } = usePipelineProspects();
  const [filter, setFilter] = useState<'All' | Priority | 'NoBooking'>('All');
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);

  const filtered = prospects.filter(p => {
    const matchesSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase()) ||
      (p.contactName || '').toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === 'All' ? true :
      filter === 'NoBooking' ? p.onlineBooking === false :
      p.priority === filter;

    return matchesSearch && matchesFilter;
  });

  const handleSelect = useCallback((index: number) => {
    setSelectedIndex(index);
    const p = filtered[index];
    if (p) setFlyTo({ lat: p.lat, lng: p.lng });
  }, [filtered]);

  const handleImport = useCallback(async (data: Prospect[]) => {
    const success = await importProspects(data);
    if (success) {
      setSelectedIndex(null);
      setShowImport(false);
    }
  }, [importProspects]);

  const handleSaveProspect = useCallback(async (updated: Prospect) => {
    await updateProspect(updated);
  }, [updateProspect]);

  const handleExportCSV = useCallback(() => {
    const headers = ['name', 'address', 'phone', 'website', 'rating', 'reviewCount', 'dentistCount', 'languages', 'onlineBooking', 'priority', 'receptionSignal', 'notes', 'contactName', 'contactRole', 'contactPersonality', 'painPoints', 'visitDate', 'visitNotes', 'personalNotes', 'talkTrack', 'status'];
    const rows = prospects.map(p =>
      headers.map(h => {
        const val = p[h as keyof Prospect];
        if (h === 'languages' || h === 'painPoints') return (val as string[])?.join(' / ') || '';
        if (val === null || val === undefined) return '';
        return String(val).includes(',') ? `"${val}"` : String(val);
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'caberu-prospects-leuven.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [prospects]);

  const hotCount = prospects.filter(p => p.priority === 'Hot').length;
  const warmCount = prospects.filter(p => p.priority === 'Warm').length;

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#090d1a' }}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      <div className="h-screen w-screen flex overflow-hidden" style={{ background: '#090d1a', fontFamily: 'DM Sans, sans-serif', color: '#dde4f5' }}>
        <Sidebar
          prospects={filtered}
          allProspects={prospects}
          filter={filter}
          search={search}
          selectedIndex={selectedIndex}
          hotCount={hotCount}
          warmCount={warmCount}
          totalCount={prospects.length}
          onFilterChange={setFilter}
          onSearchChange={setSearch}
          onSelect={handleSelect}
          onImport={() => setShowImport(true)}
          onExport={handleExportCSV}
        />
        <div className="flex-1 relative">
          <Suspense fallback={<div className="h-full w-full flex items-center justify-center" style={{ background: '#090d1a' }}><LoadingSpinner /></div>}>
            <ProspectMap
              prospects={filtered}
              selectedIndex={selectedIndex}
              flyTo={flyTo}
              onSelect={handleSelect}
            />
          </Suspense>
          {selectedIndex !== null && filtered[selectedIndex] && (
            <DetailPanel
              prospect={filtered[selectedIndex]}
              onClose={() => setSelectedIndex(null)}
              onSave={handleSaveProspect}
            />
          )}
        </div>
      </div>
      {showImport && (
        <ImportModal
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </>
  );
}
