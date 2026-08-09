// Setel folder tujuan backup otomatis (dipanggil PASANG-JADWAL-1KLIK.bat).
// Mengubah HANYA folder tujuan di config — kredensial tidak disentuh.
//
// Ganti dua konstanta di bawah kalau folder tujuannya pindah.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const FOLDER_DATA = "C:\\Users\\Ilham_PC\\OneDrive\\Backup App\\Backup-ABB Form";
const FOLDER_FOTO = FOLDER_DATA + "\\foto";

// Data (JSON): tujuan utama OneDrive, cadangan kedua tetap D: kalau sudah ada.
const dataCfgPath = join(__dirname, "backup.config.json");
if (!existsSync(dataCfgPath)) {
  console.error(
    "backup.config.json belum ada — jalankan BACKUP-1KLIK.bat sekali dulu."
  );
  process.exit(1);
}
const dataCfg = JSON.parse(readFileSync(dataCfgPath, "utf8"));
const lama = Array.isArray(dataCfg.backupDirs) ? dataCfg.backupDirs : [];
const kedua = lama.find((d) => d && !d.includes("OneDrive")) || "D:\\Backup\\ABB";
dataCfg.backupDirs = [FOLDER_DATA, kedua];
writeFileSync(dataCfgPath, JSON.stringify(dataCfg, null, 2));
console.log(`Data  -> ${FOLDER_DATA}`);
console.log(`        (cadangan kedua: ${kedua})`);

// Foto: kalau confignya sudah ada, arahkan targetDir-nya juga.
const fotoCfgPath = join(__dirname, "foto.config.json");
if (existsSync(fotoCfgPath)) {
  const fotoCfg = JSON.parse(readFileSync(fotoCfgPath, "utf8"));
  fotoCfg.targetDir = FOLDER_FOTO;
  writeFileSync(fotoCfgPath, JSON.stringify(fotoCfg, null, 2));
  console.log(`Foto  -> ${FOLDER_FOTO}`);
} else {
  console.log(
    "Foto  -> DILEWATI: foto.config.json belum ada. Backup malam tetap jalan" +
      " untuk data saja. Isi foto.config.json (lihat foto.config.example.json)" +
      " lalu dobel-klik PASANG-JADWAL-1KLIK.bat lagi kalau mau foto ikut."
  );
}
