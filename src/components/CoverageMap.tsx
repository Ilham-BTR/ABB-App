import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type CoveragePoint = {
  lat: number;
  lng: number;
  name: string;
  date?: string;
};

const MARKER_COLOR = "#2563eb";

// Auto zoom agar semua titik terlihat.
function FitBounds({ points }: { points: CoveragePoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
      return;
    }
    const bounds = points.map((p) => [p.lat, p.lng]) as [number, number][];
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [points, map]);
  return null;
}

// Peta coverage (Leaflet + OpenStreetMap). Di SPA tidak perlu dynamic import.
export function CoverageMap({ points }: { points: CoveragePoint[] }) {
  const center: [number, number] = points.length
    ? [points[0].lat, points[0].lng]
    : [-6.2, 106.816]; // default: Jakarta

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200">
      <MapContainer
        center={center}
        zoom={11}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {points.map((p, i) => (
          <CircleMarker
            key={i}
            center={[p.lat, p.lng]}
            radius={7}
            pathOptions={{
              color: "#ffffff",
              weight: 1.5,
              fillColor: MARKER_COLOR,
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{p.name}</p>
                {p.date && <p className="text-gray-500">{p.date}</p>}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block font-medium text-blue-600 underline"
                >
                  📍 Buka di Google Maps
                </a>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
