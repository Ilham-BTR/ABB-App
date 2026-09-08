-- ============================================================
-- Tambah Visit Result & Register Status baru: "Non NPWP Badan".
--
-- 1:1 mengikuti aturan app: status register toko = hasil kunjungan
-- terakhir. Bukan status final (hanya 'sudah_aktif' yang final), jadi
-- toko berstatus ini tetap bisa dikunjungi lagi oleh MD.
--
-- Aman diulang; catatan di public.schema_migrations diurus runner CI.
-- ============================================================

alter table public.visits drop constraint if exists visits_register_status_check;
alter table public.visits add constraint visits_register_status_check
  check (register_status in
    ('sudah_aktif','sudah_belum_aktif','new','no','decline','follow_up','other',
     'non_npwp_badan'));

alter table public.visits drop constraint if exists visits_visit_result_check;
alter table public.visits add constraint visits_visit_result_check
  check (visit_result is null or visit_result in
    ('yes_active','yes_inactive','decline','follow_up','other','non_npwp_badan'));
