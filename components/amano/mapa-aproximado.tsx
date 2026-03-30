'use client'
import { useMemo } from 'react'
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

interface Props {
  lat: number
  lng: number
  exact?: boolean
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center);
  return null;
}

export default function MapaAproximado({ lat, lng, exact = false }: Props) {
  // Fix default marker icon issue in Leaflet with Next.js (Safe for SSR)
  if (typeof window !== 'undefined') {
    // @ts-expect-error - Leaflet internal property access
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }

  const coords = useMemo(() => {
    if (exact) return { lat, lng }
    
    // Deterministic offset based on coordinates for React 19 purity
    // This replaces Math.random() with a stable pseudo-random value
    const seed = (lat * 1000 + lng * 1000) % 1;
    const offset = 0.001 + Math.abs(seed) * 0.001;
    const signLat = Math.sin(lat * 1000) > 0 ? 1 : -1;
    const signLng = Math.cos(lng * 1000) > 0 ? 1 : -1;

    return {
      lat: lat + signLat * offset,
      lng: lng + signLng * offset,
    }
  }, [lat, lng, exact])

  return (
    <div className="overflow-hidden rounded-2xl border border-outline-variant/20 shadow-sm">
      <MapContainer
        center={[coords.lat, coords.lng]}
        zoom={15}
        style={{ height: '220px', width: '100%', zIndex: 0 }}
        dragging={false}
        scrollWheelZoom={false}
        zoomControl={false}
        doubleClickZoom={false}
        touchZoom={false}
      >
        <ChangeView center={[coords.lat, coords.lng]} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Circle
          center={[coords.lat, coords.lng]}
          radius={exact ? 25 : 400}
          pathOptions={{ 
            color: '#0056b3', 
            fillColor: '#0056b3', 
            fillOpacity: exact ? 0.35 : 0.2, 
            weight: 2 
          }}
        />
      </MapContainer>
    </div>
  )
}
