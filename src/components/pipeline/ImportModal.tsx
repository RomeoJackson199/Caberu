import { useState } from 'react';
import { X } from 'lucide-react';
import type { Prospect } from '@/types/prospect';

const SAMPLE_DATA: Prospect[] = [
  { name: "Tandartspraktijk Dr. Hermans", address: "Bondgenotenlaan 14, 3000 Leuven", phone: "+32 16 22 11 45", website: "", rating: 4.1, reviewCount: 38, dentistCount: 1, languages: ["Dutch"], onlineBooking: false, priority: "Hot", receptionSignal: "3 reviews mention missed calls and long phone waits", notes: "Solo practice. Website from 2018. No patient portal. Strong Caberu candidate.", lat: 50.879, lng: 4.703 },
  { name: "Dental Studio Tienen", address: "Leuvensestraat 88, 3300 Tienen", phone: "+32 16 81 55 22", website: "https://example.be", rating: 4.4, reviewCount: 72, dentistCount: 2, languages: ["Dutch", "French"], onlineBooking: false, priority: "Hot", receptionSignal: "Reviews say they struggle to reach the practice by phone", notes: "2 dentists, bilingual. No booking system despite 70+ reviews.", lat: 50.800, lng: 4.940 },
  { name: "Tandarts Van Acker", address: "Stationsstraat 5, 3200 Aarschot", phone: "+32 16 56 77 10", website: "", rating: 3.9, reviewCount: 21, dentistCount: 1, languages: ["Dutch"], onlineBooking: false, priority: "Hot", receptionSignal: "No digital presence detected", notes: "Solo practice, no website. Relies 100% on phone calls.", lat: 51.000, lng: 4.833 },
  { name: "Tandheelkunde Lubbeek", address: "Dorpsstraat 8, 3210 Lubbeek", phone: "+32 16 62 33 50", website: "https://example2.be", rating: 4.5, reviewCount: 29, dentistCount: 2, languages: ["Dutch"], onlineBooking: false, priority: "Warm", receptionSignal: "1 review mentions phone not answered", notes: "2-dentist practice. No online booking. Good local reputation.", lat: 50.884, lng: 4.828 },
  { name: "Cabinet Dentaire Beaumont", address: "Tiensestraat 101, 3000 Leuven", phone: "+32 16 29 44 55", website: "https://example3.be", rating: 4.3, reviewCount: 44, dentistCount: 3, languages: ["French", "Dutch"], onlineBooking: "Partial", priority: "Warm", receptionSignal: "Mixed reviews about appointment wait times", notes: "3 dentists, primarily French-speaking. Partial booking widget appears broken.", lat: 50.875, lng: 4.698 },
  { name: "Praktijk Smile Haacht", address: "Wespelaarsesteenweg 12, 3150 Haacht", phone: "+32 16 60 22 88", website: "https://example4.be", rating: 4.7, reviewCount: 55, dentistCount: 2, languages: ["Dutch"], onlineBooking: false, priority: "Warm", receptionSignal: "Receptionist praised in reviews — may already be covered", notes: "Well-reviewed practice but no digital booking.", lat: 50.975, lng: 4.635 },
  { name: "Tandarts Rotselaar", address: "Provinciebaan 22, 3110 Rotselaar", phone: "+32 16 44 11 20", website: "", rating: 4.0, reviewCount: 18, dentistCount: 1, languages: ["Dutch"], onlineBooking: false, priority: "Hot", receptionSignal: "No digital presence at all", notes: "Solo practice in Rotselaar. No website found. Manual booking only.", lat: 50.957, lng: 4.717 },
  { name: "Tandartspraktijk Mertens", address: "Kapucijnenvoer 33, 3000 Leuven", phone: "+32 16 20 03 77", website: "https://example5.be", rating: 4.6, reviewCount: 130, dentistCount: 4, languages: ["Dutch", "English", "French"], onlineBooking: true, priority: "Cold", receptionSignal: "Reviews consistently praise reception and booking system", notes: "4 dentists, active online booking, excellent reviews. Already well-served.", lat: 50.883, lng: 4.706 },
];

interface ImportModalProps {
  onImport: (data: Prospect[]) => void;
  onClose: () => void;
}

export function ImportModal({ onImport, onClose }: ImportModalProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const handleImport = () => {
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) {
        setError('Data must be a JSON array.');
        return;
      }
      if (data.length === 0) {
        setError('Array is empty.');
        return;
      }
      // Validate required fields
      for (const item of data) {
        if (!item.name || item.lat === undefined || item.lng === undefined) {
          setError('Each item must have at least name, lat, and lng fields.');
          return;
        }
      }
      onImport(data);
    } catch {
      setError('Invalid JSON. Please check the format.');
    }
  };

  const handleLoadSample = () => {
    setText(JSON.stringify(SAMPLE_DATA, null, 2));
    setError('');
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-[600px] max-h-[80vh] flex flex-col rounded-xl" style={{ background: '#0d1220', border: '1px solid #1c2540' }}>
        <div className="flex items-center justify-between p-5 pb-3">
          <div>
            <h2 className="text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Import Agent Data</h2>
            <p className="text-xs mt-1" style={{ color: '#56688e' }}>
              Paste the JSON array from your research agent. Existing data will be <strong>replaced</strong>.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5">
            <X size={18} style={{ color: '#56688e' }} />
          </button>
        </div>

        <div className="px-5 flex-1 overflow-hidden">
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setError(''); }}
            placeholder='[{"name": "...", "lat": 50.88, "lng": 4.70, ...}]'
            className="w-full h-[300px] rounded-lg p-3 text-xs font-mono resize-none outline-none"
            style={{ background: '#131928', border: '1px solid #1c2540', color: '#dde4f5' }}
          />
          {error && <p className="text-xs mt-2" style={{ color: '#f04747' }}>{error}</p>}
        </div>

        <div className="p-5 flex gap-2 justify-end">
          <button
            onClick={handleLoadSample}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'transparent', color: '#56688e', border: '1px solid #1c2540' }}
          >
            Load Sample
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ color: '#56688e' }}>
            Cancel
          </button>
          <button
            onClick={handleImport}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: '#4f7cff', color: '#fff' }}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
