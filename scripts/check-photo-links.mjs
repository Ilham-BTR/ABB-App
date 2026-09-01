// Hitung isi kolom foto di DB: key R2 vs URL lengkap (warisan lama) vs lainnya.
// Read-only — tidak mengubah apa pun. Config dipakai dari ops/backup/backup.config.json.
// Jalankan: node scripts/check-photo-links.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(
  readFileSync(join(__dirname, "../ops/backup/backup.config.json"), "utf8")
);
const db = createClient(cfg.supabaseUrl, cfg.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TARGETS = [
  ["visits", "selfie_url", "created_at"],
  ["visits", "store_photo_url", "created_at"],
  ["visits", "store_photo_url_2", "created_at"],
  ["visits", "activity_photo_url", "created_at"],
  ["visits", "activity_photo_url_2", "created_at"],
  ["stores", "front_photo_url", null],
];

const BUCKETS = ["visit-photos", "store-photos"];

for (const [table, column, tsCol] of TARGETS) {
  let query = db.from(table).select(tsCol ? `id, ${column}, ${tsCol}` : `id, ${column}`).not(column, "is", null);
  const { data: rows, error } = await query;
  if (error) {
    console.error(`== ${table}.${column} == gagal: ${error.message}`);
    continue;
  }
  const all = rows ?? [];
  const classes = new Map(); // kelas -> { count, sample, minTs, maxTs }
  for (const r of all) {
    const v = String(r[column] ?? "");
    let k;
    if (BUCKETS.some((b) => v.startsWith(`${b}/`))) k = "key R2 (aman)";
    else if (/^https?:\/\//i.test(v)) {
      let host;
      try {
        host = new URL(v).host;
      } catch {
        host = "(URL tidak valid)";
      }
      k = `URL lengkap -> ${host}`;
    } else k = "path lain (perlu dicek)";
    const c = classes.get(k) ?? { count: 0, sample: v, min: null, max: null };
    c.count++;
    if (tsCol && r[tsCol]) {
      c.min = !c.min || r[tsCol] < c.min ? r[tsCol] : c.min;
      c.max = !c.max || r[tsCol] > c.max ? r[tsCol] : c.max;
    }
    classes.set(k, c);
  }
  console.log(`\n== ${table}.${column} == total non-null: ${all.length}`);
  for (const [k, c] of [...classes.entries()].sort((a, b) => b[1].count - a[1].count)) {
    const ts = tsCol && c.min ? ` | kunjungan ${c.min.slice(0, 10)} s/d ${c.max.slice(0, 10)}` : "";
    console.log(`  ${String(c.count).padStart(5)}  ${k}${ts}`);
    console.log(`        contoh: ${c.sample.slice(0, 100)}`);
  }
}
