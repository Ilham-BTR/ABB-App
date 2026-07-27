import LeafletMap from "@/components/LeafletMap";

type Props = {
  lat: number;
  lng: number;
};

// Peta kecil interaktif (Leaflet + OpenStreetMap) dengan marker di titik lokasi.
export function MiniMap({ lat, lng }: Props) {
  const link = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;

  return (
    <div className="relative isolate mt-2 overflow-hidden rounded-lg border border-gray-200">
      <div className="h-40 w-full">
        {/* key memaksa peta re-center saat koordinat berubah */}
        <LeafletMap key={`${lat},${lng}`} lat={lat} lng={lng} />
      </div>
      <a
        href={link}
        target="_blank"
        rel="noreferrer"
        className="block bg-gray-50 px-3 py-2 text-center text-xs font-medium text-brand"
      >
        Buka peta lebih besar ↗
      </a>
    </div>
  );
}
