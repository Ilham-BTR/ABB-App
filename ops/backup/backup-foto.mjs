// ============================================================
// Backup SEMUA foto dari Cloudflare R2 -> folder lokal, dengan nama file
// yang bisa dibaca manusia.
//
// Nama file diambil dari database (toko + tanggal + jenis foto), jadi orang
// yang membuka folder backup langsung tahu foto apa itu:
//
//   kunjungan/2026-07-21/Lautan Mas Electric/selfie.jpg
//   kunjungan/2026-07-21/Lautan Mas Electric/foto-toko-1.jpg
//   toko/Guntur Electric - foto-depan.jpg
//
// Hanya foto yang MASIH punya data visit/toko yang di-backup. File yatim
// (sisa kunjungan yang dihapus admin) dilewati — tetap tersimpan di R2.
//
// Idempoten & bisa dilanjutkan: file yang sudah ada dengan ukuran sama
// dilewati, jadi aman diulang — hanya foto baru yang diunduh.
//
// Jalankan:  dobel-klik BACKUP-FOTO-1KLIK.bat  (atau: node backup-foto.mjs)
// Config  :  foto.config.json  (kredensial R2)
//            backup.config.json (service_role key — untuk baca nama toko)
// ============================================================
import { createClient } from "@supabase/supabase-js";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { pipeline } from "node:stream/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readConfig(name, hint) {
  const p = join(__dirname, name);
  if (!existsSync(p)) {
    console.error(`Config ${name} belum ada. ${hint}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(p, "utf8"));
}

const foto = readConfig(
  "foto.config.json",
  "Copy foto.config.example.json lalu isi kredensial R2."
);
const db = readConfig(
  "backup.config.json",
  "Copy backup.config.example.json lalu isi service_role key."
);

const missing = [
  ["r2AccountId", foto],
  ["r2AccessKeyId", foto],
  ["r2SecretAccessKey", foto],
  ["r2Bucket", foto],
  ["supabaseUrl", db],
  ["serviceRoleKey", db],
].filter(([k, c]) => !c[k] || /^GANTI_/.test(String(c[k])));
if (missing.length) {
  console.error(`Config belum lengkap: ${missing.map(([k]) => k).join(", ")}`);
  process.exit(1);
}

const targetDir =
  foto.targetDir && String(foto.targetDir).trim()
    ? String(foto.targetDir)
    : join(__dirname, "foto");
mkdirSync(targetDir, { recursive: true });

const s3 = new S3Client({
  region: "auto",
  endpoint:
    foto.r2Endpoint || `https://${foto.r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: foto.r2AccessKeyId,
    secretAccessKey: foto.r2SecretAccessKey,
  },
});
const supabase = createClient(db.supabaseUrl, db.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Aman untuk nama file/folder Windows.
function safeName(s) {
  return (
    String(s ?? "")
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[. ]+$/, "")
      .slice(0, 60) || "tanpa-nama"
  );
}
function extOf(key) {
  const m = /\.([a-zA-Z0-9]{2,5})$/.exec(key);
  return m ? m[1].toLowerCase() : "jpg";
}

async function fetchAll(table, cols) {
  const rows = [];
  const batch = 1000;
  for (let from = 0; ; from += batch) {
    const { data, error } = await supabase
      .from(table)
      .select(cols)
      .range(from, from + batch - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < batch) break;
  }
  return rows;
}

console.log(`Bucket : ${foto.r2Bucket}`);
console.log(`Tujuan : ${targetDir}\n`);
console.log("Membaca database (nama toko & kunjungan)...");

const stores = await fetchAll("stores", "id, name, front_photo_url");
const visits = await fetchAll(
  "visits",
  "id, visit_date, store_id, selfie_url, store_photo_url, store_photo_url_2, activity_photo_url, activity_photo_url_2"
);
const storeName = new Map(stores.map((s) => [s.id, s.name]));

// key R2 -> path tujuan yang deskriptif.
const plan = new Map();
const used = new Set(); // hindari dua key menimpa file yang sama

function assign(key, relPath) {
  if (!key || /^https?:\/\//i.test(key) || plan.has(key)) return;
  let p = relPath;
  for (let i = 2; used.has(p.toLowerCase()); i++) {
    p = relPath.replace(/(\.[a-z0-9]+)$/i, ` (${i})$1`);
  }
  used.add(p.toLowerCase());
  plan.set(key, p);
}

const JENIS = [
  ["selfie_url", "selfie"],
  ["store_photo_url", "foto-toko-1"],
  ["store_photo_url_2", "foto-toko-2"],
  ["activity_photo_url", "aktivitas-1"],
  ["activity_photo_url_2", "aktivitas-2"],
];
for (const v of visits) {
  // Per tanggal, lalu per nama toko: kunjungan/<tanggal>/<toko>/<jenis>.jpg
  const folder = join(
    "kunjungan",
    String(v.visit_date),
    safeName(storeName.get(v.store_id) ?? "Toko Terhapus")
  );
  for (const [col, label] of JENIS) {
    const key = v[col];
    if (key) assign(key, join(folder, `${label}.${extOf(key)}`));
  }
}
for (const s of stores) {
  const key = s.front_photo_url;
  if (key)
    assign(key, join("toko", `${safeName(s.name)} - foto-depan.${extOf(key)}`));
}
console.log(
  `  ${visits.length} kunjungan, ${stores.length} toko, ${plan.size} foto terdaftar di DB.\n`
);

// Daftar semua objek di bucket.
const objects = [];
let token;
do {
  const res = await s3.send(
    new ListObjectsV2Command({ Bucket: foto.r2Bucket, ContinuationToken: token })
  );
  for (const o of res.Contents ?? []) {
    if (o.Key && !o.Key.endsWith("/"))
      objects.push({ key: o.Key, size: o.Size ?? 0 });
  }
  token = res.IsTruncated ? res.NextContinuationToken : undefined;
} while (token);
console.log(`Total di bucket: ${objects.length} file. Mengunduh...\n`);

let downloaded = 0;
let skipped = 0;
let failed = 0;
let orphan = 0;
let bytes = 0;
const failures = [];

for (const { key, size } of objects) {
  // Hanya foto yang masih punya data visit/toko yang ikut di-backup.
  // File yatim (sisa kunjungan yang sudah dihapus) dilewati — tetap ada
  // di R2 kalau sewaktu-waktu dibutuhkan, tapi tidak memenuhi backup.
  const rel = plan.get(key);
  if (!rel) {
    orphan++;
    continue;
  }
  const dest = join(targetDir, rel);
  if (existsSync(dest) && statSync(dest).size === size) {
    skipped++;
    continue;
  }
  try {
    mkdirSync(dirname(dest), { recursive: true });
    const res = await s3.send(
      new GetObjectCommand({ Bucket: foto.r2Bucket, Key: key })
    );
    await pipeline(res.Body, createWriteStream(dest));
    downloaded++;
    bytes += size;
    if (downloaded % 25 === 0)
      process.stdout.write(
        `\r  diunduh: ${downloaded} file (${(bytes / 1048576).toFixed(0)} MB)`
      );
  } catch (e) {
    failed++;
    failures.push(`${key} | ${e.message}`);
  }
}

console.log(
  `\n\n============================================================` +
    `\nSelesai. Diunduh: ${downloaded} (${(bytes / 1048576).toFixed(1)} MB)` +
    ` · Sudah ada: ${skipped} · Gagal: ${failed}` +
    `\nDilewati (tidak punya data visit/toko, tetap ada di R2): ${orphan}` +
    `\n============================================================`
);
if (failures.length) {
  console.log(`\nDaftar gagal (tampil maks 10):`);
  failures.slice(0, 10).forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
