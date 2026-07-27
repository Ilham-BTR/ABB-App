# ABB Star Reward

App field-sales untuk Field Officer Sales (FOS/MD): mencatat kunjungan toko dengan
foto + GPS, plus panel admin (dashboard, data toko, kunjungan, export/import Excel).

**Arsitektur: tanpa Vercel, tanpa Next.js.**

| Lapisan | Teknologi |
| --- | --- |
| Frontend | **Vite + React + TypeScript + Tailwind** (SPA statis) |
| Hosting | **Cloudflare Pages** (statis, gratis) |
| Database & Auth | **Supabase** (Postgres + RLS + Auth) |
| Upload foto | **Supabase Edge Function** (`get-upload-url`) → presigned URL |
| Penyimpanan foto | **Cloudflare R2** (egress gratis) via domain sendiri |

---

## 1. Setup lokal

```bash
npm install
cp .env.example .env.local     # isi VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_R2_PUBLIC_URL
npm run dev
```

`VITE_*` adalah variabel **publik** (aman di client) — keamanan data ditegakkan oleh
**Row Level Security** di Supabase.

## 2. Setup Cloudflare R2 (penyimpanan foto)

1. Cloudflare → **R2** → **Create bucket**, mis. `abb-star-reward-photos`.
2. Bucket → **Settings → Custom Domain** → hubungkan mis. `img.abb-form.click`
   (domain harus dikelola di Cloudflare). Ini jadi `VITE_R2_PUBLIC_URL`.
3. R2 → **Manage API Tokens** → buat token (Object Read & Write) → catat
   **Access Key ID**, **Secret Access Key**, dan **Account ID**.

## 3. Deploy Edge Function (presigned upload)

Kredensial R2 **hanya** disimpan sebagai secret Edge Function — tidak pernah ke browser.

```bash
supabase login
supabase link --project-ref <project-ref>

supabase secrets set R2_ACCOUNT_ID=xxxx
supabase secrets set R2_ACCESS_KEY_ID=xxxx
supabase secrets set R2_SECRET_ACCESS_KEY=xxxx
supabase secrets set R2_BUCKET=abb-star-reward-photos

supabase functions deploy get-upload-url
```

## 4. Deploy frontend ke Cloudflare Pages

1. Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** → pilih repo ini.
2. Build settings:
   - **Framework preset:** None / Vite
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
3. **Environment variables** (Production & Preview):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_R2_PUBLIC_URL`
4. Deploy. SPA fallback sudah diatur lewat `public/_redirects`.

## 5. Migrasi foto lama (Supabase Storage → R2)

Sekali jalan, dari komputer lokal:

```bash
cd scripts
cp migrate.config.example.json migrate.config.json    # isi kredensial (gitignored)
npm install @supabase/supabase-js @aws-sdk/client-s3
node migrate-photos-to-r2.mjs --dry-run               # cek dulu
node migrate-photos-to-r2.mjs                         # jalankan
```

Script mengunduh tiap foto dari Supabase Storage → unggah ke R2 (key sama + prefix
bucket) → update kolom DB. **File lama di Supabase tidak dihapus**, jadi tetap ada
cadangan sampai migrasi terverifikasi.

## 6. Database

Skema & perbaikan data ada di repo lama (`Mobil1_Form-1/supabase/migrations/`) dan
tetap berlaku — database Supabase-nya sama. Backup rutin: lihat `ops/backup` di repo
tersebut.
