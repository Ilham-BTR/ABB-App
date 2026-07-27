import { useEffect, useRef, useState } from "react";
import { getCurrentPosition, type LatLng } from "@/lib/geo";
import { MiniMap } from "@/components/MiniMap";

type Props = {
  value: LatLng | null;
  onChange: (latlng: LatLng | null) => void;
  required?: boolean;
  autoLoad?: boolean;
};

// Tombol ambil lokasi GPS + tampilkan koordinat.
export function GpsButton({ value, onChange, required, autoLoad }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoDone = useRef(false);

  // Auto-ambil lokasi saat form dibuka (sekali).
  useEffect(() => {
    if (autoLoad && !autoDone.current && !value) {
      autoDone.current = true;
      takeLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad]);

  async function takeLocation() {
    setLoading(true);
    setError(null);
    try {
      const latlng = await getCurrentPosition();
      onChange(latlng);
    } catch (e) {
      onChange(null);
      setError(e instanceof Error ? e.message : "Gagal mengambil lokasi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-gray-700">
        Lokasi (GPS) {required && <span className="text-red-500">*</span>}
      </span>
      {!value && (
        <button
          type="button"
          onClick={takeLocation}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand px-4 py-3 font-medium text-brand disabled:opacity-50"
        >
          {loading ? "Mengambil lokasi…" : "📍 Ambil lokasi sekarang"}
        </button>
      )}

      {value && (
        <>
          <p className="mt-1 text-sm text-green-700">
            ✓ {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
          </p>
          <MiniMap lat={value.lat} lng={value.lng} />
        </>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
