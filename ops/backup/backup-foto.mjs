// ============================================================
// Backup SEMUA foto dari Cloudflare R2 -> folder lokal.
//
// Mengunduh seluruh isi bucket (visit-photos/, store-photos/, dst) dengan
// struktur folder yang sama. Idempoten & bisa dilanjutkan: file yang sudah
// ada dengan ukuran sama akan dilewati, jadi aman diulang kapan saja dan
// hanya foto baru yang diunduh.
//
// Jalankan:  dobel-klik BACKUP-FOTO-1KLIK.bat  (atau: node backup-foto.mjs)
// Config  :  foto.config.json (copy dari foto.config.example.json)
// ============================================================
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
const cfgPath = join(__dirname, "foto.config.json");
if (!existsSync(cfgPath)) {
  console.error(
    "Config belum ada. Copy foto.config.example.json -> foto.config.json lalu isi."
  );
  process.exit(1);
}
const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));

const need = ["r2AccountId", "r2AccessKeyId", "r2SecretAccessKey", "r2Bucket"];
const missing = need.filter((k) => !cfg[k] || /^GANTI_/.test(String(cfg[k])));
if (missing.length) {
  console.error(`Config belum lengkap. Isi dulu: ${missing.join(", ")}`);
  process.exit(1);
}

const targetDir =
  cfg.targetDir && String(cfg.targetDir).trim()
    ? String(cfg.targetDir)
    : join(__dirname, "foto");
mkdirSync(targetDir, { recursive: true });

const s3 = new S3Client({
  region: "auto",
  endpoint:
    cfg.r2Endpoint || `https://${cfg.r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: cfg.r2AccessKeyId,
    secretAccessKey: cfg.r2SecretAccessKey,
  },
});

console.log(`Bucket : ${cfg.r2Bucket}`);
console.log(`Tujuan : ${targetDir}\n`);

// 1) Daftar semua objek (paginated).
const objects = [];
let token;
do {
  const res = await s3.send(
    new ListObjectsV2Command({
      Bucket: cfg.r2Bucket,
      ContinuationToken: token,
    })
  );
  for (const o of res.Contents ?? []) {
    if (o.Key && !o.Key.endsWith("/")) objects.push({ key: o.Key, size: o.Size ?? 0 });
  }
  token = res.IsTruncated ? res.NextContinuationToken : undefined;
} while (token);
console.log(`Total di bucket: ${objects.length} file`);

// 2) Unduh yang belum ada / ukurannya beda.
let downloaded = 0;
let skipped = 0;
let failed = 0;
let bytes = 0;
const failures = [];

for (const { key, size } of objects) {
  const dest = join(targetDir, ...key.split("/"));
  if (existsSync(dest) && statSync(dest).size === size) {
    skipped++;
    continue;
  }
  try {
    mkdirSync(dirname(dest), { recursive: true });
    const res = await s3.send(
      new GetObjectCommand({ Bucket: cfg.r2Bucket, Key: key })
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
    `\n============================================================`
);
if (failures.length) {
  console.log(`\nDaftar gagal (tampil maks 10):`);
  failures.slice(0, 10).forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
