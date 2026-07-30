// ============================================================
// Bersihkan foto YATIM di R2 — file yang tidak dirujuk oleh baris mana pun
// di database (mis. sisa kunjungan yang sudah dihapus admin).
//
// DUA TAHAP, sengaja:
//   node bersihkan-foto-r2.mjs            -> hanya MENAMPILKAN daftar (dry-run)
//   node bersihkan-foto-r2.mjs --hapus    -> benar-benar menghapus
//
// Pengaman:
//   - Membaca SEMUA kolom foto (visits x5 + stores.front_photo_url).
//   - Batal otomatis kalau hasil baca DB mencurigakan (terlalu sedikit) —
//     supaya gangguan koneksi tidak berujung menghapus seisi bucket.
//   - PERHATIAN: foto yatim TIDAK ikut di-backup, jadi penghapusan di sini
//     PERMANEN. Alat ini opsional — membiarkan file yatim juga tidak apa-apa.
//
// Config: foto.config.json (R2) + backup.config.json (service_role).
// ============================================================
import { createClient } from "@supabase/supabase-js";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const doDelete = process.argv.includes("--hapus");

function readConfig(name, hint) {
  const p = join(__dirname, name);
  if (!existsSync(p)) {
    console.error(`Config ${name} belum ada. ${hint}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(p, "utf8"));
}
const foto = readConfig("foto.config.json", "Isi kredensial R2 dulu.");
const db = readConfig("backup.config.json", "Isi service_role key dulu.");

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

console.log(doDelete ? "MODE: HAPUS" : "MODE: dry-run (hanya menampilkan)");
console.log(`Bucket: ${foto.r2Bucket}\n`);

// 1) Kumpulkan semua key yang MASIH dirujuk database.
const stores = await fetchAll("stores", "front_photo_url");
const visits = await fetchAll(
  "visits",
  "selfie_url, store_photo_url, store_photo_url_2, activity_photo_url, activity_photo_url_2"
);
const referenced = new Set();
for (const v of visits)
  for (const k of [
    v.selfie_url,
    v.store_photo_url,
    v.store_photo_url_2,
    v.activity_photo_url,
    v.activity_photo_url_2,
  ])
    if (k && !/^https?:\/\//i.test(k)) referenced.add(k);
for (const s of stores)
  if (s.front_photo_url && !/^https?:\/\//i.test(s.front_photo_url))
    referenced.add(s.front_photo_url);

console.log(
  `DB: ${visits.length} kunjungan, ${stores.length} toko, ${referenced.size} foto dirujuk.`
);

// Pengaman: kalau angka DB tidak masuk akal, jangan lanjut.
if (visits.length === 0 || referenced.size < visits.length) {
  console.error(
    "\nBATAL: hasil baca database mencurigakan (terlalu sedikit). " +
      "Cek koneksi/kredensial dulu — tidak ada yang dihapus."
  );
  process.exit(1);
}

// 2) Daftar isi bucket, cari yang tidak dirujuk.
const orphans = [];
let total = 0;
let token;
do {
  const res = await s3.send(
    new ListObjectsV2Command({ Bucket: foto.r2Bucket, ContinuationToken: token })
  );
  for (const o of res.Contents ?? []) {
    if (!o.Key || o.Key.endsWith("/")) continue;
    total++;
    if (!referenced.has(o.Key))
      orphans.push({ key: o.Key, size: o.Size ?? 0 });
  }
  token = res.IsTruncated ? res.NextContinuationToken : undefined;
} while (token);

const mb = (orphans.reduce((a, o) => a + o.size, 0) / 1048576).toFixed(1);
console.log(`Bucket: ${total} file, yatim: ${orphans.length} (${mb} MB)\n`);

if (!orphans.length) {
  console.log("Bersih — tidak ada file yatim. Tidak ada yang perlu dihapus.");
  process.exit(0);
}

console.log("Daftar file yatim:");
for (const o of orphans) console.log(`  - ${o.key}`);

if (!doDelete) {
  console.log(
    `\n(dry-run — TIDAK ada yang dihapus. Jalankan lagi dengan --hapus` +
      ` untuk benar-benar menghapus ${orphans.length} file di atas.)`
  );
  process.exit(0);
}

// 3) Hapus (batch maks 1000 per panggilan).
let deleted = 0;
for (let i = 0; i < orphans.length; i += 1000) {
  const chunk = orphans.slice(i, i + 1000);
  const res = await s3.send(
    new DeleteObjectsCommand({
      Bucket: foto.r2Bucket,
      Delete: { Objects: chunk.map((o) => ({ Key: o.key })), Quiet: true },
    })
  );
  deleted += chunk.length - (res.Errors?.length ?? 0);
  for (const e of res.Errors ?? [])
    console.error(`  gagal: ${e.Key} (${e.Message})`);
}
console.log(`\nSelesai. Terhapus: ${deleted} dari ${orphans.length} file.`);
