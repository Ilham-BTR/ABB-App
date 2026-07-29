-- ============================================================
-- ABB Star Reward — SKEMA LENGKAP untuk project Supabase BARU.
-- Gabungan seluruh migrasi (0001–0021) dalam satu file.
-- Jalankan SEKALI di: Supabase Dashboard → SQL Editor → Run.
-- Aman diulang (idempoten).
-- ============================================================

-- ============================================================
-- 1. TABEL
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'fos',
  created_at timestamptz not null default now()
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  owner_name text,
  distributor text,
  front_photo_url text,
  latitude double precision,
  longitude double precision,
  register_status text,   -- status terkini toko (hasil kunjungan terakhir)
  baseline_status text,   -- status awal (dari import / 'new' untuk toko baru MD)
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  fos_id uuid not null references public.profiles (id),
  visit_date date not null default current_date,
  register_status text not null,
  visit_result text,
  selfie_url text,
  store_photo_url text,
  store_photo_url_2 text,
  activity_photo_url text,
  activity_photo_url_2 text,
  latitude double precision,
  longitude double precision,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- Constraint nilai status ----------
alter table public.visits drop constraint if exists visits_register_status_check;
alter table public.visits add constraint visits_register_status_check
  check (register_status in
    ('sudah_aktif','sudah_belum_aktif','new','no','decline','follow_up','other'));

alter table public.visits drop constraint if exists visits_visit_result_check;
alter table public.visits add constraint visits_visit_result_check
  check (visit_result is null or visit_result in
    ('yes_active','yes_inactive','decline','follow_up','other'));

-- 1 toko maksimal 1 kunjungan per hari (cegah dobel input).
alter table public.visits drop constraint if exists visits_store_date_unique;
alter table public.visits add constraint visits_store_date_unique
  unique (store_id, visit_date);

-- ---------- Index ----------
create index if not exists visits_fos_id_idx on public.visits (fos_id);
create index if not exists visits_store_id_idx on public.visits (store_id);
create index if not exists visits_date_idx on public.visits (visit_date);
create index if not exists stores_name_idx on public.stores (name);

-- ============================================================
-- 2. FUNGSI BANTU (SECURITY DEFINER — hindari rekursi RLS)
-- ============================================================

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'superadmin')
  );
$$;

create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'superadmin'
  );
$$;

-- Auto-buat profile saat user baru dibuat.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 3. HAK AKSES DATA API (PostgREST)
-- Eksplisit, supaya schema ini tetap jalan walau opsi
-- "Automatically expose new tables" dimatikan saat buat project.
-- Keamanan sesungguhnya tetap ditegakkan oleh RLS di bawah.
-- ============================================================

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.stores   to authenticated;
grant select, insert, update, delete on public.visits   to authenticated;

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.stores   enable row level security;
alter table public.visits   enable row level security;

-- ---------- profiles ----------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select to authenticated using (public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_update_superadmin" on public.profiles;
create policy "profiles_update_superadmin" on public.profiles
  for update to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

-- ---------- stores ----------
drop policy if exists "stores_select_authenticated" on public.stores;
create policy "stores_select_authenticated" on public.stores
  for select to authenticated using (true);

drop policy if exists "stores_insert_own" on public.stores;
create policy "stores_insert_own" on public.stores
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists "stores_update_authenticated" on public.stores;
create policy "stores_update_authenticated" on public.stores
  for update to authenticated using (true) with check (true);

drop policy if exists "stores_delete_superadmin" on public.stores;
create policy "stores_delete_superadmin" on public.stores
  for delete to authenticated using (public.is_superadmin());

-- ---------- visits ----------
drop policy if exists "visits_select_own_or_admin" on public.visits;
create policy "visits_select_own_or_admin" on public.visits
  for select to authenticated using (fos_id = auth.uid() or public.is_admin());

drop policy if exists "visits_insert_own" on public.visits;
create policy "visits_insert_own" on public.visits
  for insert to authenticated with check (fos_id = auth.uid());

drop policy if exists "visits_update_superadmin" on public.visits;
create policy "visits_update_superadmin" on public.visits
  for update to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "visits_delete_superadmin" on public.visits;
create policy "visits_delete_superadmin" on public.visits
  for delete to authenticated using (public.is_superadmin());

-- ============================================================
-- 5. ATURAN STATUS FINAL
-- ============================================================
-- "Yes, Active" dikunci sebagai status final lewat trigger. Isinya ada di
-- supabase/migrations/0001_final_status_yes_active.sql — jalankan file itu
-- setelah script ini.

-- ============================================================
-- SELESAI.
-- Catatan: foto disimpan di Cloudflare R2 (bukan Supabase Storage),
-- jadi tidak ada bucket yang perlu dibuat di project ini.
-- ============================================================
