// ============================================================
// Migrasi foto lama: Supabase Storage -> Cloudflare R2.
//
// Untuk tiap kolom foto di DB: unduh file dari Supabase Storage, unggah ke R2
// dengan key yang sama (diberi prefix bucket), lalu update kolom di DB jadi key R2.
// File lama di Supabase TIDAK dihapus (tetap jadi cadangan).
//
// Aman diulang (idempoten): baris yang nilainya sudah berupa key R2 dilewati.
//
// Jalankan lokal:
//   1) copy migrate.config.example.json -> migrate.config.json, isi kredensial
//   2) npm install @supabase/supabase-js @aws-sdk/client-s3
//   3) node scripts/migrate-photos-to-r2.mjs            (tambah --dry-run untuk cek dulu)
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cfgPath = join(__dirname, "migrate.config.json");
if (!existsSync(cfgPath)) {
  console.error(
    "Config belum ada. Copy migrate.config.example.json -> migrate.config.json lalu isi."
  );
  process.exit(1);
}
const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
const dryRun = process.argv.includes("--dry-run");

const supabase = createClient(cfg.supabaseUrl, cfg.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const s3 = new S3Client({
  region: "auto",
  endpoint:
    cfg.r2Endpoint || `https://${cfg.r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: cfg.r2AccessKeyId,
    secretAccessKey: cfg.r2SecretAccessKey,
  },
});

// Kolom foto: [tabel, kolom, bucket asal di Supabase]
const TARGETS = [
  ["visits", "selfie_url", "visit-photos"],
  ["visits", "store_photo_url", "visit-photos"],
  ["visits", "store_photo_url_2", "visit-photos"],
  ["visits", "activity_photo_url", "visit-photos"],
  ["visits", "activity_photo_url_2", "visit-photos"],
  ["stores", "front_photo_url", "store-photos"],
];

let migrated = 0;
let skipped = 0;
let failed = 0;

for (const [table, column, bucket] of TARGETS) {
  console.log(`\n== ${table}.${column} (bucket: ${bucket}) ==`);
  const { data: rows, error } = await supabase
    .from(table)
    .select(`id, ${column}`)
    .not(column, "is", null);
  if (error) {
    console.error(`  Gagal baca ${table}: ${error.message}`);
    failed++;
    continue;
  }

  for (const row of rows ?? []) {
    const value = row[column];
    if (!value) continue;
    // Sudah key R2 (mengandung prefix bucket) -> lewati.
    if (value.startsWith(`${bucket}/`) || /^https?:\/\//i.test(value)) {
      skipped++;
      continue;
    }

    const newKey = `${bucket}/${value}`;
    if (dryRun) {
      console.log(`  [dry] ${value} -> ${newKey}`);
      migrated++;
      continue;
    }

    try {
      // 1) Unduh dari Supabase Storage.
      const { data: blob, error: dlErr } = await supabase.storage
        .from(bucket)
        .download(value);
      if (dlErr || !blob) throw new Error(dlErr?.message || "download gagal");
      const body = Buffer.from(await blob.arrayBuffer());

      // 2) Unggah ke R2.
      await s3.send(
        new PutObjectCommand({
          Bucket: cfg.r2Bucket,
          Key: newKey,
          Body: body,
          ContentType: blob.type || "image/jpeg",
        })
      );

      // 3) Update kolom DB jadi key R2.
      const { error: upErr } = await supabase
        .from(table)
        .update({ [column]: newKey })
        .eq("id", row.id);
      if (upErr) throw new Error(upErr.message);

      migrated++;
      process.stdout.write(`\r  migrasi: ${migrated} file`);
    } catch (e) {
      failed++;
      console.error(`\n  GAGAL ${value}: ${e.message}`);
    }
  }
}

console.log(
  `\n\nSelesai. Migrasi: ${migrated} · Dilewati (sudah R2): ${skipped} · Gagal: ${failed}`
);
if (dryRun) console.log("(DRY-RUN — tidak ada yang benar-benar dipindahkan)");
