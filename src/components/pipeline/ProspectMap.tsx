import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Prospect, Priority } from '@/types/prospect';

const PRIORITY_COLORS: Record<Priority, string> = {
  Hot: '#f04747',
  Warm: '#f5a623',
  Cold: '#3d4f70',
};

function createIcon(priority: Priority, selected: boolean) {
  const color = PRIORITY_COLORS[priority];
  const size = selected ? 18 : 13;
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};
      box-shadow:0 0 ${selected ? 12 : 6}px ${color}80;
      border:2px solid ${selected ? '#fff' : color}40;
    "></div>`,
  });
}

function FlyToHandler({ flyTo }: { flyTo: { lat: number; lng: number } | null }) {
  const map = useMap();
  const prevFlyTo = useRef(flyTo);
  useEffect(() => {
    if (flyTo && flyTo !== prevFlyTo.current) {
      map.setView([flyTo.lat, flyTo.lng], 14, { animate: true });
      prevFlyTo.current = flyTo;
    }
  }, [flyTo, map]);
  return null;
}

interface ProspectMapProps {
  prospects: Prospect[];
  selectedIndex: number | null;
  flyTo: { lat: number; lng: number } | null;
  onSelect: (index: number) => void;
}

export default function ProspectMap({ prospects, selectedIndex, flyTo, onSelect }: ProspectMapProps) {
  return (
    <MapContainer
      center={[50.88, 4.70]}
      zoom={11}
      className="h-full w-full"
      style={{ background: '#090d1a' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <Circle
        center={[50.88, 4.70]}
        radius={15000}
        pathOptions={{
          color: 'rgba(79,124,255,0.45)',
          fillColor: 'rgba(79,124,255,0.04)',
          dashArray: '6 4',
          weight: 1.5,
        }}
      />
      {prospects.map((p, i) => (
        <Marker
          key={`${p.name}-${i}`}
          position={[p.lat, p.lng]}
          icon={createIcon(p.priority, selectedIndex === i)}
          eventHandlers={{ click: () => onSelect(i) }}
        >
          <Popup>
            <div style={{ fontFamily: 'DM Sans, sans-serif', minWidth: 160 }}>
              <div style={{ fontWeight: 700, fontSize: 13, fontFamily: 'Syne, sans-serif' }}>{p.name}</div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{p.address}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                <span style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 4,
                  background: PRIORITY_COLORS[p.priority], color: '#fff', fontWeight: 600,
                }}>{p.priority}</span>
                {p.rating && <span style={{ fontSize: 11 }}>⭐ {p.rating}</span>}
                <span style={{ fontSize: 11 }}>{p.onlineBooking === true ? '✅ Booking' : p.onlineBooking === 'Partial' ? '⚠️ Partial' : '❌ No booking'}</span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
      <FlyToHandler flyTo={flyTo} />
    </MapContainer>
  );
}
