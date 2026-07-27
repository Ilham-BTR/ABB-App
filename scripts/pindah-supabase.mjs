// ============================================================
// Pindahkan seluruh data dari project Supabase LAMA ke project BARU.
//
// Sumber data = file backup JSON (hasil ops/backup/backup.mjs di repo lama).
//
// Yang dilakukan:
//   1. Buat ulang akun auth di project BARU (email sama, password baru).
//      -> Supabase memberi UUID baru, jadi script MEMETAKAN uid lama -> uid baru
//         dan mengganti semua referensi (profiles.id, stores.created_by, visits.fos_id).
//   2. Insert profiles (dengan role asli: fos / admin / superadmin).
//   3. Insert stores, lalu visits (urutan FK-aman).
//
// PRASYARAT di project BARU: jalankan dulu supabase/setup_fresh.sql di SQL Editor.
//
// Jalankan:
//   node scripts/pindah-supabase.mjs <file-backup.json>            (asli)
//   node scripts/pindah-supabase.mjs <file-backup.json> --dry-run  (cek dulu)
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cfgPath = join(__dirname, "pindah.config.json");
if (!existsSync(cfgPath)) {
  console.error(
    "Config belum ada. Copy pindah.config.example.json -> pindah.config.json lalu isi."
  );
  process.exit(1);
}
const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));

const file = process.argv[2];
if (!file || !existsSync(file)) {
  console.error(
    "Usage: node scripts/pindah-supabase.mjs <file-backup.json> [--dry-run]"
  );
  process.exit(1);
}
const dryRun = process.argv.includes("--dry-run");
const payload = JSON.parse(readFileSync(file, "utf8"));

const dest = createClient(cfg.newSupabaseUrl, cfg.newServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const profiles = payload.tables?.profiles ?? [];
const stores = payload.tables?.stores ?? [];
const visits = payload.tables?.visits ?? [];
const authUsers = payload.authUsers ?? [];

console.log(`Sumber : ${file}`);
console.log(`Dibuat : ${payload.meta?.createdAt ?? "?"}`);
console.log(`Tujuan : ${cfg.newSupabaseUrl}`);
console.log(
  `Isi    : ${authUsers.length} akun · ${profiles.length} profiles · ` +
    `${stores.length} stores · ${visits.length} visits`
);
if (dryRun) console.log("\n*** DRY-RUN — tidak ada yang ditulis ***");
console.log("");

// ---------- 1. Akun auth ----------
const uidMap = new Map(); // uid lama -> uid baru
const defaultPassword = cfg.defaultPassword || "AbbStar#2026";

for (const u of authUsers) {
  if (!u.email) continue;
  const roleOf =
    profiles.find((p) => p.id === u.id)?.role ?? "fos";

  if (dryRun) {
    console.log(`  [dry] akun ${u.email} (role ${roleOf})`);
    uidMap.set(u.id, `dry-${u.id}`);
    continue;
  }

  const { data, error } = await dest.auth.admin.createUser({
    email: u.email,
    password: defaultPassword,
    email_confirm: true,
    user_metadata: u.user_metadata ?? {},
  });

  if (error) {
    // Kalau sudah ada, cari uid-nya supaya tetap bisa dipetakan.
    const { data: list } = await dest.auth.admin.listUsers({ perPage: 1000 });
    const found = list?.users?.find((x) => x.email === u.email);
    if (found) {
      uidMap.set(u.id, found.id);
      console.log(`  = akun ${u.email} sudah ada, dipakai ulang`);
      continue;
    }
    console.error(`  ! gagal buat akun ${u.email}: ${error.message}`);
    continue;
  }

  uidMap.set(u.id, data.user.id);
  console.log(`  + akun ${u.email} (role ${roleOf})`);
}

const mapUid = (old) => (old ? uidMap.get(old) ?? null : null);

// ---------- 2. Profiles (role) ----------
// Trigger handle_new_user sudah membuat baris profiles; di sini kita set role & nama.
if (!dryRun) {
  for (const p of profiles) {
    const newId = mapUid(p.id);
    if (!newId) continue;
    const { error } = await dest
      .from("profiles")
      .upsert(
        { id: newId, full_name: p.full_name, role: p.role },
        { onConflict: "id" }
      );
    if (error) console.error(`  ! profile ${p.full_name}: ${error.message}`);
  }
  console.log(`  profiles: ${profiles.length} disesuaikan (nama + role)`);
} else {
  console.log(`  [dry] profiles: ${profiles.length} akan di-set nama + role`);
}

// ---------- 3. Stores ----------
const storeRows = stores.map((s) => ({ ...s, created_by: mapUid(s.created_by) }));
if (!dryRun) {
  for (let i = 0; i < storeRows.length; i += 500) {
    const chunk = storeRows.slice(i, i + 500);
    const { error } = await dest.from("stores").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error(`\n  ! stores: ${error.message}`);
      process.exit(1);
    }
    process.stdout.write(`\r  stores: ${Math.min(i + 500, storeRows.length)}/${storeRows.length}`);
  }
  console.log(`\r  stores: ${storeRows.length}/${storeRows.length} OK   `);
} else {
  console.log(`  [dry] stores: ${storeRows.length} akan di-insert`);
}

// ---------- 4. Visits ----------
const visitRows = visits
  .map((v) => ({ ...v, fos_id: mapUid(v.fos_id) }))
  .filter((v) => v.fos_id); // buang visit yang FOS-nya tidak terpetakan
if (!dryRun) {
  for (let i = 0; i < visitRows.length; i += 500) {
    const chunk = visitRows.slice(i, i + 500);
    const { error } = await dest.from("visits").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error(`\n  ! visits: ${error.message}`);
      process.exit(1);
    }
    process.stdout.write(`\r  visits: ${Math.min(i + 500, visitRows.length)}/${visitRows.length}`);
  }
  console.log(`\r  visits: ${visitRows.length}/${visitRows.length} OK   `);
} else {
  console.log(`  [dry] visits: ${visitRows.length} akan di-insert`);
}

console.log("\n============================================================");
if (dryRun) {
  console.log("DRY-RUN selesai. Tidak ada perubahan.");
} else {
  console.log("SELESAI. Data sudah pindah ke project Supabase baru.");
  console.log(`\nPASSWORD SEMENTARA semua akun: ${defaultPassword}`);
  console.log("Minta tiap user ganti password setelah login pertama.");
}
console.log("============================================================");
