# Panduan Setup ABB Star Reward (dari nol)

Urutan ini memindahkan app dari **Vercel + Supabase lama** ke
**Cloudflare Pages + Supabase baru + R2**, lengkap dengan data & foto.

> **Aturan keamanan:** semua key rahasia (service_role, R2 Secret, token Cloudflare)
> **cukup kamu ketik di komputermu sendiri** — jangan pernah dikirim lewat chat.

---

## Ringkasan langkah

| # | Langkah | Perlu | Waktu |
|---|---------|-------|-------|
| 1 | Backup data lama | repo lama: `ops/backup/BACKUP-1KLIK.bat` | 2 mnt |
| 2 | Buat bucket R2 + custom domain | Cloudflare | 3 mnt |
| 3 | Buat project Supabase baru + schema | Supabase | 3 mnt |
| 4 | Pindahkan data ke Supabase baru | `PINDAH-DATABASE.bat` | 3 mnt |
| 5 | Setup R2 + deploy Edge Function | `SETUP-R2.bat` | 3 mnt |
| 6 | Migrasi foto lama ke R2 | `MIGRASI-FOTO.bat` | 5 mnt |
| 7 | Deploy ke Cloudflare Pages | Cloudflare | 5 mnt |

---

## 1. Backup data lama (WAJIB — jaring pengaman)

Di repo lama (`Mobil1_Form-1`), dobel-klik **`ops/backup/BACKUP-1KLIK.bat`**.
Catat lokasi file JSON yang dihasilkan — dipakai di langkah 4.

## 2. Cloudflare R2

1. Cloudflare → **R2** → **Create bucket** → nama: `abb-star-reward-photos` → **Create**.
2. Buka bucket → **Settings** → **Public Development URL** → **Enable**.
   Muncul URL `https://pub-xxxxx.r2.dev` → itu jadi `VITE_R2_PUBLIC_URL`.
   *(Untuk produksi, lebih baik pasang **Custom Domain** mis. `img.abb-form.click`.)*
3. **WAJIB — CORS Policy.** Masih di Settings → **CORS Policy** → **+ Add** → tempel:
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
   Tanpa ini, upload foto dari browser **akan ditolak** (browser memblokir PUT lintas-origin).
   Setelah URL app final diketahui, persempit `AllowedOrigins` ke URL itu.
4. R2 → **Manage R2 API Tokens** → **Create API token** → **Object Read & Write**
   → pilih bucket tadi → **Create**.
   **Catat: Access Key ID + Secret Access Key** (secret hanya tampil sekali!)
   dan **Account ID** (ada di sidebar R2 / di URL dashboard).

## 3. Project Supabase baru

1. supabase.com → **New project** (pilih region **Southeast Asia (Singapore)**).
2. Tunggu project siap → **SQL Editor** → **New query**.
3. Tempel seluruh isi **`supabase/setup_fresh.sql`** → **Run**.
   Ini membuat semua tabel, constraint, fungsi, dan RLS sekaligus.
4. Catat dari **Project Settings → API**:
   - **Project URL** → nanti jadi `VITE_SUPABASE_URL`
   - **publishable / anon key** → nanti jadi `VITE_SUPABASE_ANON_KEY` (aman, publik)
   - **secret / service_role key** → untuk langkah 4 (rahasia!)

## 4. Pindahkan data lama → Supabase baru

```
setup\PINDAH-DATABASE.bat
```
Sebelumnya: copy `scripts/pindah.config.example.json` → `pindah.config.json`,
isi **URL + service_role key project BARU**, dan `defaultPassword`.

Script akan: buat ulang akun (email sama, password sementara) → memetakan ID lama ke
ID baru → memindahkan `profiles`, `stores`, `visits`. Ada **dry-run** dulu.

> Setelah pindah, semua akun memakai **password sementara** dari config.
> Minta tiap user menggantinya setelah login pertama.

## 5. Setup R2 + Edge Function upload

```
setup\SETUP-R2.bat
```
Script akan menanyakan: project ref, nama bucket, Account ID, Access Key ID,
Secret Access Key. Lalu otomatis: login Supabase → link project → simpan secret →
deploy Edge Function `get-upload-url`.

> Kredensial R2 disimpan sebagai **secret di Supabase**, tidak pernah sampai ke browser.

## 6. Migrasi foto lama → R2

```
setup\MIGRASI-FOTO.bat
```
Sebelumnya: copy `scripts/migrate.config.example.json` → `migrate.config.json`,
isi kredensial **Supabase LAMA** (sumber foto) + **R2**.

Script mengunduh tiap foto dari Supabase Storage lama → unggah ke R2 → update kolom
di DB. Ada **dry-run** dulu. **File lama tidak dihapus.**

> Kalau langkah 4 sudah dijalankan lebih dulu, jalankan script ini dengan config
> Supabase **BARU** supaya kolom yang di-update adalah data yang aktif.

## 7. Deploy ke Cloudflare Pages

1. Cloudflare → **Workers & Pages** → **Create** → tab **Pages** → **Connect to Git**
   → pilih repo **ABB-App**.
2. Build settings:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
3. **Environment variables** (Production **dan** Preview):
   | Nama | Isi |
   |---|---|
   | `VITE_SUPABASE_URL` | Project URL Supabase **baru** |
   | `VITE_SUPABASE_ANON_KEY` | publishable / anon key |
   | `VITE_R2_PUBLIC_URL` | `https://img.abb-form.click` |
4. **Save and Deploy**.
5. (Opsional) **Custom domain** → arahkan `abb-form.click` ke Pages ini.

---

## Verifikasi akhir

- [ ] Login berhasil (pakai password sementara)
- [ ] Dashboard menampilkan angka yang sama seperti app lama
- [ ] Foto lama tampil (berarti migrasi R2 sukses)
- [ ] Buat 1 kunjungan uji → foto baru terupload → cek muncul di bucket R2
- [ ] Ganti password akun
