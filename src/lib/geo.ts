// Ambil koordinat GPS dari browser. Mengembalikan {lat, lng} atau melempar
// error dengan pesan yang ramah untuk ditampilkan ke FOS.

export type LatLng = { lat: number; lng: number };

export function getCurrentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Perangkat tidak mendukung GPS."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error("Izin lokasi ditolak. Aktifkan GPS untuk lanjut."));
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          reject(new Error("Lokasi tidak tersedia. Coba lagi di area terbuka."));
        } else if (err.code === err.TIMEOUT) {
          reject(new Error("Waktu ambil lokasi habis. Coba lagi."));
        } else {
          reject(new Error("Gagal mengambil lokasi."));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}
