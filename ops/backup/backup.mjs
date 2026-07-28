// ============================================================
// Backup data Supabase (ABB Star Reward / FOS MOBILE) -> 1 file JSON.
// Semua tabel public + daftar akun auth. TANPA Docker, TANPA install:
// pakai Node + @supabase/supabase-js (sudah jadi dependency app).
// Pakai service_role key supaya bypass RLS & baca semua data + akun.
//
// Jalankan:  node ops/backup/backup.mjs
// ============================================================
import { createClient } from "@supabase/supabase-js";
import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  statSync,
  unlinkSync,
  appendFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cfgPath = join(__dirname, "backup.config.json");

if (!existsSync(cfgPath)) {
  console.error(
    "Config belum ada. Copy backup.config.example.json -> backup.config.json lalu isi."
  );
  process.exit(1);
}
const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
if (
  !cfg.supabaseUrl ||
  !cfg.serviceRoleKey ||
  /GANTI_/.test(cfg.serviceRoleKey)
) {
  console.error(
    "supabaseUrl / serviceRoleKey belum diisi di backup.config.json."
  );
  process.exit(1);
}
const keepLast = cfg.keepLast || 12;
// Bisa 1 folder ("backupDir": "...") atau BANYAK folder ("backupDirs": ["...","..."]).
// Kosong = simpan ke ./dumps.
const rawDirs = Array.isArray(cfg.backupDirs)
  ? cfg.backupDirs
  : [cfg.backupDir];
const dumpDirs = rawDirs
  .map((d) => (d && String(d).trim() ? String(d) : join(__dirname, "dumps")))
  .filter((d, i, a) => a.indexOf(d) === i); // buang duplikat
for (const d of dumpDirs) if (!existsSync(d)) mkdirSync(d, { recursive: true });
const logFile = join(__dirname, "backup.log");

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  appendFileSync(logFile, line + "\n");
  console.log(line);
}

const supabase = createClient(cfg.supabaseUrl, cfg.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Urutan FK-aman (parent dulu) — dipakai juga saat restore.
const TABLES = ["profiles", "stores", "visits"];

async function dumpTable(name) {
  const rows = [];
  const batch = 1000;
  for (let from = 0; ; from += batch) {
    const { data, error } = await supabase
      .from(name)
      .select("*")
      .range(from, from + batch - 1);
    if (error) throw new Error(`Tabel ${name}: ${error.message}`);
    rows.push(...data);
    if (data.length < batch) break;
  }
  return rows;
}

async function dumpAuthUsers() {
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw new Error(`auth users: ${error.message}`);
    const list = data?.users || [];
    users.push(
      ...list.map((u) => ({
        id: u.id,
        email: u.email,
        phone: u.phone,
        created_at: u.created_at,
        email_confirmed_at: u.email_confirmed_at,
        user_metadata: u.user_metadata,
        app_metadata: u.app_metadata,
      }))
    );
    if (list.length < 1000) break;
  }
  return users;
}

try {
  log("Mulai backup...");
  const tables = {};
  const counts = {};
  for (const t of TABLES) {
    const rows = await dumpTable(t);
    tables[t] = rows;
    counts[t] = rows.length;
    log(`  ${t}: ${rows.length} baris`);
  }

  let authUsers = [];
  try {
    authUsers = await dumpAuthUsers();
    counts["auth.users"] = authUsers.length;
    log(`  auth.users: ${authUsers.length} akun`);
  } catch (e) {
    log(
      `  PERINGATAN: gagal ambil auth users (${e.message}) — lanjut tanpa itu.`
    );
  }

  const ts = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
  const payload = {
    meta: {
      app: "abb-star-reward",
      createdAt: new Date().toISOString(),
      supabaseUrl: cfg.supabaseUrl,
      tableOrder: TABLES,
      counts,
    },
    tables,
    authUsers,
  };
  const fname = `supabase_backup_${ts}.json`;
  const json = JSON.stringify(payload);

  // Tulis ke folder pertama, lalu salin ke folder-folder lainnya.
  const primary = join(dumpDirs[0], fname);
  writeFileSync(primary, json);
  const sizeMB = (statSync(primary).size / (1024 * 1024)).toFixed(2);
  log(`OK: ${primary} (${sizeMB} MB)`);
  for (const d of dumpDirs.slice(1)) {
    copyFileSync(primary, join(d, fname));
    log(`Salinan: ${join(d, fname)}`);
  }

  // Rotasi tiap folder: simpan keepLast file terbaru, sisanya hapus.
  for (const d of dumpDirs) {
    const files = readdirSync(d)
      .filter((f) => /^supabase_backup_.*\.json$/.test(f))
      .map((f) => ({ f, t: statSync(join(d, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    for (const { f } of files.slice(keepLast)) {
      unlinkSync(join(d, f));
      log(`Hapus backup lama: ${join(d, f)}`);
    }
  }
  log(`Selesai. Backup disimpan di ${dumpDirs.length} folder (maks ${keepLast}/folder).`);
} catch (e) {
  log(`GAGAL: ${e.message}`);
  process.exit(1);
}
