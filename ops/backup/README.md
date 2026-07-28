# Backup Database Supabase — ABB Star Reward

Backup seluruh **data** app ke 1 file JSON di komputermu — **gratis**, tanpa Docker,
tanpa install PostgreSQL. Jalan pakai **Node** + `@supabase/supabase-js` (sudah jadi
dependency app).

> **Schema** tersimpan di Git (`supabase/setup_fresh.sql`). **Data** tersimpan di file
> backup JSON ini. Digabung = pemulihan lengkap.

> ⚠️ Project Supabase yang dipakai sekarang ada di plan **Free** — Supabase **tidak**
> membuat backup otomatis. File di folder ini satu-satunya cadangan data yang kamu punya,
> jadi pastikan `JADWAL-AUTO-BACKUP.ps1` benar-benar terpasang.

## Yang di-backup

- Semua tabel data: `profiles`, `stores`, `visits`.
- Daftar **akun auth** (email + metadata) lewat service_role key.

> Catatan: ini backup **database**, bukan file foto. Foto ada di Cloudflare R2
> (bucket `abb-star-reward-photos`) dan tidak ikut ter-backup oleh skrip ini.
> Kolom foto di DB hanya menyimpan *key*-nya.

## Cara TERCEPAT (Windows, 1 klik) 🖱️

1. **Isi konfigurasi sekali:** copy `backup.config.example.json` → rename jadi
   `backup.config.json`, lalu isi `supabaseUrl`, `serviceRoleKey`, dan folder tujuan.
   - **1 tempat:** isi `backupDir` (mis. folder OneDrive).
   - **2+ tempat sekaligus** (mis. OneDrive **dan** D: lokal): isi `backupDirs`
     dengan daftar folder — kalau ini diisi, `backupDir` diabaikan. Contoh:
     ```json
     "backupDirs": [
       "C:\\Users\\Ilham_PC\\OneDrive\\ABB\\backups",
       "D:\\Backup\\ABB"
     ]
     ```
     ⚠️ Pakai `\\` (dobel backslash) di path Windows.
2. **Dobel-klik `BACKUP-1KLIK.bat`.** Skrip otomatis: cek Node → pasang dependency
   (sekali) → jalankan backup → simpan ke folder OneDrive/D: yang kamu set.
   - Kalau Node belum ada, skrip kasih tahu link install (https://nodejs.org, versi LTS).

### Mau backup OTOMATIS tiap hari (tanpa klik)?
Setelah `BACKUP-1KLIK.bat` jalan sukses sekali, klik-kanan **`JADWAL-AUTO-BACKUP.ps1`**
→ **Run with PowerShell** (atau `powershell -ExecutionPolicy Bypass -File .\JADWAL-AUTO-BACKUP.ps1`).
Ini mendaftarkan **auto-backup harian jam 12:00** ke Windows Task Scheduler. Ubah
jam/hari-nya di dalam file `.ps1` kalau perlu.

---

## Cara manual (via perintah)

1. **Isi konfigurasi:**
   ```bash
   cd ops/backup
   cp backup.config.example.json backup.config.json
   ```
   Buka `backup.config.json`, isi:
   - `supabaseUrl` → sudah terisi project aktif (`vyoyhurpqnwhmlemjzrc`), ganti hanya kalau pindah project.
   - `serviceRoleKey` → dari **Supabase Dashboard → Project Settings → API Keys**.
     **Pakai `service_role` key** (rahasia, bukan `anon`) supaya bisa baca semua data + akun.
   - `keepLast` → berapa file backup terakhir disimpan (default 12).
   - `backupDir` (opsional) → folder Google Drive/OneDrive tersinkron untuk salinan **off-site**.

   File `backup.config.json`, folder `dumps/`, dan `backup.log` **sudah di-gitignore** —
   aman, tak akan ke-commit.

2. **Jalankan backup:**
   ```bash
   node ops/backup/backup.mjs
   ```
   Berhasil → muncul file `dumps/supabase_backup_<tanggal>.json` + baris `OK: ... MB`
   beserta jumlah baris tiap tabel.

## Restore (memulihkan data)

**Data kepencet hapus / keubah, project masih ada:**
```bash
node ops/backup/restore.mjs ops/backup/dumps/supabase_backup_<tanggal>.json
node ops/backup/restore.mjs <file> --only=stores,visits   # sebagian tabel
node ops/backup/restore.mjs <file> --dry-run              # lihat dulu, tak menulis
```
Restore = **upsert by id** dalam urutan FK-aman (`profiles` → `stores` → `visits`).
Baris hilang dibuat lagi, baris ada ditimpa isi backup. Aman diulang.

**Pemulihan total (project baru dari nol):** buat project Supabase baru → jalankan
`supabase/setup_fresh.sql` di SQL Editor → lalu `restore.mjs` dari file backup.

Catatan: `restore.mjs` memulihkan **tabel data** saja, bukan akun login. Akun di
`authUsers` (bagian dari file backup) harus dibuat ulang lewat Supabase Dashboard atau
`scripts/pindah-supabase.mjs`, karena password tidak ikut ter-backup.
