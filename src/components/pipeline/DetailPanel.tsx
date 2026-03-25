import type { Prospect } from '@/types/prospect';
import { X, ExternalLink, Phone, AlertTriangle } from 'lucide-react';

const PRIORITY_COLORS = { Hot: '#f04747', Warm: '#f5a623', Cold: '#3d4f70' };

interface DetailPanelProps {
  prospect: Prospect;
  onClose: () => void;
}

export function DetailPanel({ prospect: p, onClose }: DetailPanelProps) {
  const bookingColor = p.onlineBooking === true ? '#43b581' : p.onlineBooking === 'Partial' ? '#f5a623' : '#f04747';
  const bookingLabel = p.onlineBooking === true ? 'Yes' : p.onlineBooking === 'Partial' ? 'Partial' : 'No';

  return (
    <div
      className="absolute top-0 right-0 h-full w-[360px] overflow-y-auto z-[1000] animate-in slide-in-from-right"
      style={{ background: '#0d1220', borderLeft: '1px solid #1c2540' }}
    >
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold leading-tight" style={{ fontFamily: 'Syne, sans-serif' }}>{p.name}</h2>
            <p className="text-xs mt-1" style={{ color: '#56688e' }}>{p.address}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5 ml-2 flex-shrink-0">
            <X size={18} style={{ color: '#56688e' }} />
          </button>
        </div>
      </div>

      {/* Priority & Contact */}
      <div className="px-5 pb-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-3 py-1 rounded" style={{ background: PRIORITY_COLORS[p.priority], color: '#fff', fontFamily: 'Syne, sans-serif' }}>
            {p.priority}
          </span>
        </div>

        <div className="space-y-2">
          <Row label="Phone">
            <a href={`tel:${p.phone}`} className="flex items-center gap-1 text-sm" style={{ color: '#4f7cff' }}>
              <Phone size={12} /> {p.phone}
            </a>
          </Row>
          <Row label="Website">
            {p.website ? (
              <a href={p.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm" style={{ color: '#4f7cff' }}>
                Visit <ExternalLink size={12} />
              </a>
            ) : (
              <span className="text-sm" style={{ color: '#f04747' }}>No website</span>
            )}
          </Row>
        </div>
      </div>

      {/* Practice Info */}
      <div className="px-5 pb-4">
        <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: '#56688e', fontFamily: 'Syne, sans-serif' }}>Practice Info</h3>
        <div className="space-y-2">
          <Row label="Dentists">
            <span className="text-sm">{p.dentistCount ?? '—'}</span>
          </Row>
          <Row label="Languages">
            <div className="flex flex-wrap gap-1">
              {p.languages.map(l => (
                <span key={l} className="text-[10px] px-2 py-0.5 rounded" style={{ background: '#1c2540', color: '#dde4f5' }}>{l}</span>
              ))}
            </div>
          </Row>
          <Row label="Google Rating">
            {p.rating ? (
              <span className="text-sm">
                {'⭐'.repeat(Math.round(p.rating))} {p.rating} ({p.reviewCount} reviews)
              </span>
            ) : (
              <span className="text-sm" style={{ color: '#56688e' }}>—</span>
            )}
          </Row>
          <Row label="Online Booking">
            <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: bookingColor + '20', color: bookingColor }}>
              {bookingLabel}
            </span>
          </Row>
        </div>
      </div>

      {/* Reception Signal */}
      {p.receptionSignal && (
        <div className="px-5 pb-4">
          <div className="rounded-lg p-3 flex gap-2" style={{ background: '#f5a62315', border: '1px solid #f5a62330' }}>
            <AlertTriangle size={16} style={{ color: '#f5a623', flexShrink: 0, marginTop: 2 }} />
            <p className="text-xs leading-relaxed" style={{ color: '#f5a623' }}>{p.receptionSignal}</p>
          </div>
        </div>
      )}

      {/* Notes */}
      {p.notes && (
        <div className="px-5 pb-5">
          <h3 className="text-xs uppercase tracking-wider mb-2" style={{ color: '#56688e', fontFamily: 'Syne, sans-serif' }}>Notes</h3>
          <div className="rounded-lg p-3 text-xs leading-relaxed" style={{ background: '#131928', border: '1px solid #1c2540' }}>
            {p.notes}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between">
      <span className="text-xs" style={{ color: '#56688e' }}>{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}
