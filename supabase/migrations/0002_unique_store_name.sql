-- ============================================================
-- Nama toko tidak boleh kembar.
--
-- Kasus nyata: dua submit paralel (dobel-tap, selisih 141 md) sama-sama
-- mengecek "nama sudah ada?" sebelum salah satunya tersimpan — keduanya
-- membuat toko "Multi Abadi", lalu aturan 1-kunjungan-per-hari (berbasis
-- store_id) tidak menahan apa-apa. Pengecekan di aplikasi tidak bisa
-- menutup celah waktu ini; hanya index unik di database yang bisa.
--
-- Urutan: gabungkan dulu toko yang telanjur kembar, baru pasang kuncinya.
-- ============================================================

-- Peta: toko duplikat -> toko yang dipertahankan (yang paling awal dibuat).
create temp table dup_map on commit drop as
select d.id as dup_id, k.id as keep_id
from public.stores d
join lateral (
  select id from public.stores k
  where lower(trim(k.name)) = lower(trim(d.name))
  order by created_at, id
  limit 1
) k on true
where d.id <> k.id;

-- Lengkapi kolom kosong di toko yang dipertahankan dari duplikatnya.
update public.stores k
set address         = coalesce(k.address, d.address),
    phone           = coalesce(k.phone, d.phone),
    owner_name      = coalesce(k.owner_name, d.owner_name),
    distributor     = coalesce(k.distributor, d.distributor),
    front_photo_url = coalesce(k.front_photo_url, d.front_photo_url),
    latitude        = coalesce(k.latitude, d.latitude),
    longitude       = coalesce(k.longitude, d.longitude)
from dup_map m
join public.stores d on d.id = m.dup_id
where k.id = m.keep_id;

-- Kunjungan yang akan bertabrakan setelah digabung (toko sama, tanggal sama):
-- pertahankan yang paling awal diinput, sisanya dihapus. File fotonya TIDAK
-- disentuh — tetap ada di R2 sesuai kebijakan.
with calon as (
  select v.id,
         coalesce(m.keep_id, v.store_id) as final_store,
         v.visit_date, v.created_at
  from public.visits v
  left join dup_map m on m.dup_id = v.store_id
),
ranked as (
  select id,
         row_number() over (
           partition by final_store, visit_date
           order by created_at, id
         ) as rn
  from calon
)
delete from public.visits where id in (select id from ranked where rn > 1);

-- Pindahkan kunjungan dari toko duplikat ke toko yang dipertahankan.
update public.visits v
set store_id = m.keep_id
from dup_map m
where v.store_id = m.dup_id;

-- Status toko yang dipertahankan = hasil kunjungan terakhirnya.
-- Toko yang sudah final (sudah_aktif) tidak diturunkan.
update public.stores s
set register_status = sub.rs
from (
  select distinct on (v.store_id) v.store_id,
         case v.visit_result
           when 'yes_active'   then 'sudah_aktif'
           when 'yes_inactive' then 'sudah_belum_aktif'
           when 'decline'      then 'decline'
           when 'follow_up'    then 'follow_up'
           else 'other'
         end as rs
  from public.visits v
  where v.visit_result is not null
    and v.store_id in (select keep_id from dup_map)
  order by v.store_id, v.visit_date desc, v.created_at desc
) sub
where s.id = sub.store_id
  and s.register_status is distinct from 'sudah_aktif';

-- Buang baris toko duplikat (kunjungannya sudah dipindah).
delete from public.stores where id in (select dup_id from dup_map);

-- Kunci permanen: nama toko unik, abaikan besar-kecil huruf & spasi pinggir.
create unique index if not exists stores_name_unique
  on public.stores (lower(trim(name)));
