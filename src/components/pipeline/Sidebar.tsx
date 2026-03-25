import type { Prospect, Priority } from '@/types/prospect';
import { Search, Upload, Download } from 'lucide-react';

const PRIORITY_COLORS: Record<Priority, string> = {
  Hot: '#f04747',
  Warm: '#f5a623',
  Cold: '#3d4f70',
};

type FilterType = 'All' | Priority | 'NoBooking';

interface SidebarProps {
  prospects: Prospect[];
  allProspects: Prospect[];
  filter: FilterType;
  search: string;
  selectedIndex: number | null;
  hotCount: number;
  warmCount: number;
  totalCount: number;
  onFilterChange: (f: FilterType) => void;
  onSearchChange: (s: string) => void;
  onSelect: (i: number) => void;
  onImport: () => void;
  onExport: () => void;
}

const filters: { label: string; value: FilterType; color?: string }[] = [
  { label: 'All', value: 'All' },
  { label: '🔴 Hot', value: 'Hot', color: '#f04747' },
  { label: '🟡 Warm', value: 'Warm', color: '#f5a623' },
  { label: '⚫ Cold', value: 'Cold', color: '#3d4f70' },
  { label: 'No Booking', value: 'NoBooking' },
];

function extractCity(address: string) {
  const parts = address.split(',');
  if (parts.length >= 2) {
    const last = parts[parts.length - 1].trim();
    // Remove postal code
    return last.replace(/^\d{4}\s*/, '');
  }
  return '';
}

export function Sidebar({
  prospects, filter, search, selectedIndex,
  hotCount, warmCount, totalCount,
  onFilterChange, onSearchChange, onSelect, onImport, onExport,
}: SidebarProps) {
  return (
    <div className="w-[330px] flex-shrink-0 flex flex-col h-full border-r" style={{ background: '#0d1220', borderColor: '#1c2540' }}>
      {/* Header */}
      <div className="p-5 pb-3">
        <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Syne, sans-serif' }}>
          Caberu <span style={{ color: '#4f7cff' }}>Pipeline</span>
        </h1>
        <p className="text-xs mt-1" style={{ color: '#56688e' }}>Prospect intelligence map</p>
      </div>

      {/* Stats */}
      <div className="flex gap-2 px-5 pb-3">
        {[
          { label: 'Hot', count: hotCount, color: '#f04747' },
          { label: 'Warm', count: warmCount, color: '#f5a623' },
          { label: 'Total', count: totalCount, color: '#4f7cff' },
        ].map(s => (
          <div key={s.label} className="flex-1 rounded-lg p-2 text-center" style={{ background: '#131928', border: '1px solid #1c2540' }}>
            <div className="text-lg font-bold" style={{ color: s.color, fontFamily: 'Syne, sans-serif' }}>{s.count}</div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: '#56688e' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="px-5 pb-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#56688e' }} />
          <input
            type="text"
            placeholder="Search practices..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: '#131928', border: '1px solid #1c2540', color: '#dde4f5' }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5 px-5 pb-3">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              background: filter === f.value ? (f.color || '#4f7cff') : '#131928',
              color: filter === f.value ? '#fff' : '#56688e',
              border: `1px solid ${filter === f.value ? 'transparent' : '#1c2540'}`,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3">
        {prospects.length === 0 && (
          <div className="text-center py-10 text-sm" style={{ color: '#56688e' }}>
            No prospects yet. Import data to get started.
          </div>
        )}
        {prospects.map((p, i) => {
          const borderColor = selectedIndex === i ? '#4f7cff' : PRIORITY_COLORS[p.priority];
          return (
            <button
              key={`${p.name}-${i}`}
              onClick={() => onSelect(i)}
              className="w-full text-left p-3 rounded-lg mb-1.5 transition-all hover:brightness-110"
              style={{
                background: selectedIndex === i ? '#1a2340' : '#131928',
                borderLeft: `3px solid ${borderColor}`,
              }}
            >
              <div className="text-sm font-medium truncate" style={{ color: '#dde4f5' }}>{p.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: PRIORITY_COLORS[p.priority] }} />
                <span className="text-[11px]" style={{ color: '#56688e' }}>
                  {p.priority} · {extractCity(p.address)}
                  {p.rating && ` · ⭐ ${p.rating}`}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 flex gap-2 border-t" style={{ borderColor: '#1c2540' }}>
        <button
          onClick={onImport}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: '#4f7cff', color: '#fff' }}
        >
          <Upload size={14} /> Import
        </button>
        <button
          onClick={onExport}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: 'transparent', color: '#56688e', border: '1px solid #1c2540' }}
        >
          <Download size={14} /> Export CSV
        </button>
      </div>
    </div>
  );
}
