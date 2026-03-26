import { useState } from 'react';
import type { Prospect, ProspectStatus } from '@/types/prospect';
import { X, ExternalLink, Phone, AlertTriangle, Save, Calendar, User, Target, MessageSquare } from 'lucide-react';

const PRIORITY_COLORS = { Hot: '#f04747', Warm: '#f5a623', Cold: '#3d4f70' };

const STATUS_OPTIONS: { value: ProspectStatus; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: '#56688e' },
  { value: 'contacted', label: 'Contacted', color: '#4f7cff' },
  { value: 'meeting_scheduled', label: 'Meeting Scheduled', color: '#f5a623' },
  { value: 'visited', label: 'Visited', color: '#43b581' },
  { value: 'proposal_sent', label: 'Proposal Sent', color: '#9b59b6' },
  { value: 'won', label: 'Won ✅', color: '#43b581' },
  { value: 'lost', label: 'Lost', color: '#f04747' },
];

interface DetailPanelProps {
  prospect: Prospect;
  onClose: () => void;
  onSave: (updated: Prospect) => void;
}

export function DetailPanel({ prospect, onClose, onSave }: DetailPanelProps) {
  const [p, setP] = useState<Prospect>({ ...prospect });
  const [dirty, setDirty] = useState(false);
  const [painPointInput, setPainPointInput] = useState('');

  const update = (fields: Partial<Prospect>) => {
    setP(prev => ({ ...prev, ...fields }));
    setDirty(true);
  };

  const handleSave = () => {
    onSave(p);
    setDirty(false);
  };

  const addPainPoint = () => {
    if (painPointInput.trim()) {
      update({ painPoints: [...(p.painPoints || []), painPointInput.trim()] });
      setPainPointInput('');
    }
  };

  const removePainPoint = (index: number) => {
    update({ painPoints: (p.painPoints || []).filter((_, i) => i !== index) });
  };

  const bookingColor = p.onlineBooking === true ? '#43b581' : p.onlineBooking === 'Partial' ? '#f5a623' : '#f04747';
  const bookingLabel = p.onlineBooking === true ? 'Yes' : p.onlineBooking === 'Partial' ? 'Partial' : 'No';
  const currentStatus = STATUS_OPTIONS.find(s => s.value === p.status) || STATUS_OPTIONS[0];

  return (
    <div
      className="absolute top-0 right-0 h-full w-[400px] overflow-y-auto z-[1000] animate-in slide-in-from-right"
      style={{ background: '#0d1220', borderLeft: '1px solid #1c2540' }}
    >
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold leading-tight" style={{ fontFamily: 'Syne, sans-serif' }}>{p.name}</h2>
            <p className="text-xs mt-1" style={{ color: '#56688e' }}>{p.address}</p>
          </div>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {dirty && (
              <button onClick={handleSave} className="p-1.5 rounded hover:bg-white/5" title="Save changes">
                <Save size={16} style={{ color: '#43b581' }} />
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded hover:bg-white/5">
              <X size={18} style={{ color: '#56688e' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Status & Priority */}
      <div className="px-5 pb-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded" style={{ background: PRIORITY_COLORS[p.priority], color: '#fff', fontFamily: 'Syne, sans-serif' }}>
            {p.priority}
          </span>
          <select
            value={p.status}
            onChange={e => update({ status: e.target.value as ProspectStatus })}
            className="text-xs px-2 py-1 rounded outline-none cursor-pointer"
            style={{ background: currentStatus.color + '20', color: currentStatus.color, border: `1px solid ${currentStatus.color}40` }}
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Contact info */}
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

      {/* Contact Person */}
      <Section icon={<User size={14} />} title="Contact Person">
        <EditableRow label="Name" value={p.contactName} onChange={v => update({ contactName: v })} placeholder="e.g. Dr. Hermans" />
        <EditableRow label="Role" value={p.contactRole} onChange={v => update({ contactRole: v })} placeholder="e.g. Owner / Lead Dentist" />
        <EditableRow label="Personality" value={p.contactPersonality} onChange={v => update({ contactPersonality: v })} placeholder="e.g. Friendly, tech-skeptical, busy" />
      </Section>

      {/* Visit Planning */}
      <Section icon={<Calendar size={14} />} title="Visit Planning">
        <Row label="Visit Date">
          <input
            type="date"
            value={p.visitDate || ''}
            onChange={e => update({ visitDate: e.target.value || null })}
            className="text-xs px-2 py-1 rounded outline-none"
            style={{ background: '#131928', border: '1px solid #1c2540', color: '#dde4f5' }}
          />
        </Row>
        <div className="mt-2">
          <label className="text-xs block mb-1" style={{ color: '#56688e' }}>Visit Notes</label>
          <textarea
            value={p.visitNotes}
            onChange={e => update({ visitNotes: e.target.value })}
            placeholder="What to bring, who to ask for, parking info..."
            className="w-full rounded-lg p-2 text-xs resize-none outline-none"
            rows={2}
            style={{ background: '#131928', border: '1px solid #1c2540', color: '#dde4f5' }}
          />
        </div>
      </Section>

      {/* Pain Points */}
      <Section icon={<Target size={14} />} title="Pain Points">
        <div className="flex flex-wrap gap-1 mb-2">
          {(p.painPoints || []).map((point, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer hover:opacity-70"
              style={{ background: '#f0474720', color: '#f04747', border: '1px solid #f0474730' }}
              onClick={() => removePainPoint(i)}
              title="Click to remove"
            >
              {point} ×
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <input
            type="text"
            value={painPointInput}
            onChange={e => setPainPointInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPainPoint()}
            placeholder="Add pain point..."
            className="flex-1 text-xs px-2 py-1 rounded outline-none"
            style={{ background: '#131928', border: '1px solid #1c2540', color: '#dde4f5' }}
          />
          <button onClick={addPainPoint} className="text-xs px-2 py-1 rounded" style={{ background: '#4f7cff', color: '#fff' }}>+</button>
        </div>
      </Section>

      {/* Talk Track */}
      <Section icon={<MessageSquare size={14} />} title="Talk Track / Script">
        <textarea
          value={p.talkTrack}
          onChange={e => update({ talkTrack: e.target.value })}
          placeholder="How to approach them, key selling points, objection handling..."
          className="w-full rounded-lg p-2 text-xs resize-none outline-none"
          rows={3}
          style={{ background: '#131928', border: '1px solid #1c2540', color: '#dde4f5' }}
        />
      </Section>

      {/* Practice Info */}
      <div className="px-5 pb-4">
        <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: '#56688e', fontFamily: 'Syne, sans-serif' }}>Practice Info</h3>
        <div className="space-y-2">
          <Row label="Dentists"><span className="text-sm">{p.dentistCount ?? '—'}</span></Row>
          <Row label="Languages">
            <div className="flex flex-wrap gap-1">
              {p.languages.map(l => (
                <span key={l} className="text-[10px] px-2 py-0.5 rounded" style={{ background: '#1c2540', color: '#dde4f5' }}>{l}</span>
              ))}
            </div>
          </Row>
          <Row label="Google Rating">
            {p.rating ? (
              <span className="text-sm">{'⭐'.repeat(Math.round(p.rating))} {p.rating} ({p.reviewCount} reviews)</span>
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

      {/* Personal Notes */}
      <div className="px-5 pb-4">
        <h3 className="text-xs uppercase tracking-wider mb-2" style={{ color: '#56688e', fontFamily: 'Syne, sans-serif' }}>Your Personal Notes</h3>
        <textarea
          value={p.personalNotes}
          onChange={e => update({ personalNotes: e.target.value })}
          placeholder="Your own observations, follow-up reminders..."
          className="w-full rounded-lg p-3 text-xs leading-relaxed resize-none outline-none"
          rows={3}
          style={{ background: '#131928', border: '1px solid #1c2540', color: '#dde4f5' }}
        />
      </div>

      {/* Agent Notes */}
      {p.notes && (
        <div className="px-5 pb-5">
          <h3 className="text-xs uppercase tracking-wider mb-2" style={{ color: '#56688e', fontFamily: 'Syne, sans-serif' }}>Agent Notes</h3>
          <div className="rounded-lg p-3 text-xs leading-relaxed" style={{ background: '#131928', border: '1px solid #1c2540' }}>
            {p.notes}
          </div>
        </div>
      )}

      {/* Save button at bottom */}
      {dirty && (
        <div className="px-5 pb-5">
          <button
            onClick={handleSave}
            className="w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
            style={{ background: '#43b581', color: '#fff' }}
          >
            <Save size={14} /> Save Changes
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="px-5 pb-4">
      <h3 className="text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: '#56688e', fontFamily: 'Syne, sans-serif' }}>
        {icon} {title}
      </h3>
      <div className="space-y-2">{children}</div>
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

function EditableRow({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs flex-shrink-0" style={{ color: '#56688e' }}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="text-xs px-2 py-1 rounded outline-none text-right flex-1 min-w-0"
        style={{ background: '#131928', border: '1px solid #1c2540', color: '#dde4f5' }}
      />
    </div>
  );
}
