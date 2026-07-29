-- ============================================================
-- Aturan: "Yes, Active" (register_status = 'sudah_aktif') adalah STATUS FINAL.
--
-- Toko yang sudah aktif dianggap selesai: MD tidak boleh mencatat kunjungan
-- baru untuk toko itu, dan tidak boleh menurunkan statusnya. Admin/superadmin
-- tetap bisa (untuk koreksi salah input).
--
-- Ada DUA penjaga karena app menyimpan dalam 2 langkah terpisah
-- (update stores lalu insert visits), bukan 1 transaksi:
--   a) stores  : blokir perubahan status yang meninggalkan 'sudah_aktif'
--   b) visits  : blokir insert kunjungan untuk toko yang sudah 'sudah_aktif'
-- Tanpa (a), kunjungan follow-up akan lebih dulu menurunkan status toko
-- sehingga (b) tidak pernah kena.
--
-- Jalankan di Supabase Dashboard -> SQL Editor. Aman diulang.
-- ============================================================

-- (a) Status toko tidak boleh berubah setelah 'sudah_aktif'.
create or replace function public.guard_store_final_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if old.register_status = 'sudah_aktif'
     and new.register_status is distinct from old.register_status then
    raise exception 'STORE_ALREADY_ACTIVE'
      using hint = 'Yes, Active adalah status final.';
  end if;
  return new;
end;
$$;

drop trigger if exists stores_guard_final_status on public.stores;
create trigger stores_guard_final_status
  before update on public.stores
  for each row execute function public.guard_store_final_status();

-- (b) Tidak boleh menambah kunjungan untuk toko yang sudah final.
create or replace function public.guard_visit_on_final_store()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cur text;
begin
  if public.is_admin() then
    return new;
  end if;
  select register_status into cur
    from public.stores where id = new.store_id;
  if cur = 'sudah_aktif' then
    raise exception 'STORE_ALREADY_ACTIVE'
      using hint = 'Yes, Active adalah status final.';
  end if;
  return new;
end;
$$;

drop trigger if exists visits_guard_final_store on public.visits;
create trigger visits_guard_final_store
  before insert on public.visits
  for each row execute function public.guard_visit_on_final_store();
