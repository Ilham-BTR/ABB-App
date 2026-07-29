-- ============================================================
-- Rekap hasil kunjungan untuk satu rentang tanggal.
--
-- Dipanggil workflow "Laporan Kunjungan" (.github/workflows/laporan.yml)
-- dengan dua variabel psql: :dari dan :sampai (format YYYY-MM-DD).
--
-- Sengaja read-only: sesi dikunci agar query di sini tidak akan pernah
-- mengubah data, apa pun isinya.
-- ============================================================
set default_transaction_read_only = on;

\echo '=== 1. Ringkasan total ==='
select
  count(*)                                              as total_kunjungan,
  count(distinct store_id)                              as toko_unik,
  count(*) filter (where visit_result = 'yes_active')   as yes_active,
  count(*) filter (where visit_result = 'yes_inactive') as yes_inactive,
  count(*) filter (where visit_result = 'follow_up')    as follow_up,
  count(*) filter (where visit_result = 'decline')      as decline,
  count(*) filter (where visit_result = 'other')        as other,
  count(*) filter (where visit_result is null)          as kosong
from public.visits
where visit_date between :'dari'::date and :'sampai'::date;

\echo ''
\echo '=== 2. Per tanggal ==='
select
  visit_date                                            as tanggal,
  count(*)                                              as kunjungan,
  count(distinct store_id)                              as toko_unik,
  count(*) filter (where visit_result = 'yes_active')   as yes_active,
  count(*) filter (where visit_result = 'yes_inactive') as yes_inactive,
  count(*) filter (where visit_result = 'follow_up')    as follow_up,
  count(*) filter (where visit_result = 'decline')      as decline,
  count(*) filter (where visit_result = 'other')        as other
from public.visits
where visit_date between :'dari'::date and :'sampai'::date
group by visit_date
order by visit_date;

\echo ''
\echo '=== 3. Per MD ==='
select
  coalesce(p.full_name, '(tanpa nama)')                 as md,
  count(*)                                              as kunjungan,
  count(distinct v.store_id)                            as toko_unik,
  count(*) filter (where v.visit_result = 'yes_active') as yes_active
from public.visits v
left join public.profiles p on p.id = v.fos_id
where v.visit_date between :'dari'::date and :'sampai'::date
group by p.full_name
order by count(*) desc;

\echo ''
\echo '=== 4. Toko yang dikunjungi lebih dari sekali ==='
-- Sumber selisih paling umum antara "jumlah kunjungan" dan "jumlah toko".
select
  s.name                                                as toko,
  count(*)                                              as jumlah_kunjungan,
  string_agg(
    v.visit_date::text || ' -> ' || coalesce(v.visit_result, '-'),
    ', ' order by v.visit_date
  )                                                     as riwayat
from public.visits v
join public.stores s on s.id = v.store_id
where v.visit_date between :'dari'::date and :'sampai'::date
group by s.name
having count(*) > 1
order by count(*) desc, s.name;

\echo ''
\echo '=== 5. Selisih status: hasil kunjungan terakhir vs status toko ==='
-- Idealnya kosong. Kalau ada isinya, status toko tidak sinkron dengan
-- kunjungan terakhirnya (mis. sisa data lama sebelum aturan status final).
with terakhir as (
  select distinct on (store_id)
    store_id, visit_date, visit_result
  from public.visits
  where visit_date between :'dari'::date and :'sampai'::date
  order by store_id, visit_date desc, created_at desc
)
select
  s.name                as toko,
  t.visit_date          as kunjungan_terakhir,
  t.visit_result        as hasil_terakhir,
  s.register_status     as status_toko
from terakhir t
join public.stores s on s.id = t.store_id
where s.register_status is distinct from case t.visit_result
  when 'yes_active'   then 'sudah_aktif'
  when 'yes_inactive' then 'sudah_belum_aktif'
  when 'decline'      then 'decline'
  when 'follow_up'    then 'follow_up'
  when 'other'        then 'other'
end
order by s.name;
