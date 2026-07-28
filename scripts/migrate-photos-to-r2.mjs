// ============================================================
// Migrasi foto lama: Supabase Storage (project LAMA) -> Cloudflare R2.
//
// File foto ada di Storage project LAMA, sedangkan DB sudah pindah ke project
// BARU. Jadi skrip ini memakai DUA koneksi Supabase:
//   - source : project LAMA  -> tempat mengunduh file
//   - dest   : project BARU  -> tempat membaca & meng-update kolom foto
//
// Alur per foto: unduh dari Storage lama -> unggah ke R2 (key diberi prefix
// nama bucket) -> update kolom di DB baru. File lama TIDAK dihapus.
//
// Aman diulang (idempoten): nilai yang sudah berupa key R2 dilewati.
//
// Jalankan lokal:
//   1) copy migrate.config.example.json -> migrate.config.json, isi kredensial
//   2) npm install @supabase/supabase-js @aws-sdk/client-s3
//   3) node scripts/migrate-photos-to-r2.mjs        (tambah --dry-run untuk cek)
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

const need = [
  "sourceSupabaseUrl",
  "sourceServiceRoleKey",
  "destSupabaseUrl",
  "destServiceRoleKey",
  "r2AccountId",
  "r2AccessKeyId",
  "r2SecretAccessKey",
  "r2Bucket",
];
const missing = need.filter((k) => !cfg[k] || /^GANTI_/.test(String(cfg[k])));
if (missing.length) {
  console.error(`Config belum lengkap. Isi dulu: ${missing.join(", ")}`);
  process.exit(1);
}

// Sumber FILE = project lama (Storage). Tujuan DB = project baru.
const source = createClient(cfg.sourceSupabaseUrl, cfg.sourceServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const dest = createClient(cfg.destSupabaseUrl, cfg.destServiceRoleKey, {
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

// Kolom foto yang perlu dipindahkan.
const TARGETS = [
  ["visits", "selfie_url"],
  ["visits", "store_photo_url"],
  ["visits", "store_photo_url_2"],
  ["visits", "activity_photo_url"],
  ["visits", "activity_photo_url_2"],
  ["stores", "front_photo_url"],
];

// Foto lama bisa berada di salah satu bucket ini — dicoba berurutan.
const BUCKETS = ["visit-photos", "store-photos"];
const alreadyMigrated = (v) =>
  BUCKETS.some((b) => v.startsWith(`${b}/`)) || /^https?:\/\//i.test(v);

let migrated = 0;
let skipped = 0;
let failed = 0;
const failures = [];

console.log(`Sumber file : ${cfg.sourceSupabaseUrl}`);
console.log(`Tujuan DB   : ${cfg.destSupabaseUrl}`);
console.log(`Bucket R2   : ${cfg.r2Bucket}`);
if (dryRun) console.log("\n*** DRY-RUN — tidak ada yang dipindahkan ***");

for (const [table, column] of TARGETS) {
  const { data: rows, error } = await dest
    .from(table)
    .select(`id, ${column}`)
    .not(column, "is", null);
  if (error) {
    console.error(`\n== ${table}.${column} == gagal baca: ${error.message}`);
    failed++;
    continue;
  }

  const all = rows ?? [];
  const todo = all.filter((r) => r[column] && !alreadyMigrated(r[column]));
  skipped += all.length - todo.length;
  console.log(
    `\n== ${table}.${column} == perlu dipindah: ${todo.length}, dilewati: ${
      all.length - todo.length
    }`
  );

  for (const row of todo) {
    const value = row[column];

    if (dryRun) {
      console.log(`  [dry] ${value}`);
      migrated++;
      continue;
    }

    try {
      // 1) Unduh dari Storage project LAMA — coba tiap bucket.
      let blob = null;
      let foundBucket = null;
      for (const b of BUCKETS) {
        const { data, error: dlErr } = await source.storage
          .from(b)
          .download(value);
        if (!dlErr && data) {
          blob = data;
          foundBucket = b;
          break;
        }
      }
      if (!blob) throw new Error("file tidak ada di Storage project lama");

      const newKey = `${foundBucket}/${value}`;
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

      // 3) Update kolom di DB project BARU.
      const { error: upErr } = await dest
        .from(table)
        .update({ [column]: newKey })
        .eq("id", row.id);
      if (upErr) throw new Error(upErr.message);

      migrated++;
      process.stdout.write(`\r  dipindah: ${migrated} file`);
    } catch (e) {
      failed++;
      failures.push(`${table}.${column} | ${value} | ${e.message}`);
    }
  }
}

console.log(
  `\n\n============================================================` +
    `\nSelesai. Dipindah: ${migrated} · Dilewati: ${skipped} · Gagal: ${failed}` +
    `\n============================================================`
);
if (failures.length) {
  console.log(`\nDaftar gagal (${failures.length}, tampil maks 10):`);
  failures.slice(0, 10).forEach((f) => console.log(`  - ${f}`));
}
if (dryRun) console.log("\n(DRY-RUN — tidak ada perubahan)");
