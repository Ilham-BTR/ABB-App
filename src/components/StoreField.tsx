import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FormField } from "@/components/FormField";
import type { Store } from "@/lib/types";

export type NewStoreData = {
  name: string;
  address: string;
  phone: string;
  ownerName: string;
  distributor: string;
};

// Detail toko terdaftar yang boleh dilengkapi/diedit MD saat kunjungan.
export type StoreDetails = {
  address: string;
  phone: string;
  ownerName: string;
  distributor: string;
};

export type StoreSelection =
  | { mode: "existing"; store: Store; details: StoreDetails }
  | { mode: "new"; data: NewStoreData }
  | null;

const EMPTY: NewStoreData = {
  name: "",
  address: "",
  phone: "",
  ownerName: "",
  distributor: "",
};

function detailsFromStore(s: Store): StoreDetails {
  return {
    address: s.address ?? "",
    phone: s.phone ?? "",
    ownerName: s.owner_name ?? "",
    distributor: s.distributor ?? "",
  };
}

// Satu kolom "Toko" pintar: cari toko terdaftar, atau tambah toko baru.
// Toko terdaftar: FOS cukup pilih (detail dilengkapi admin).
export function StoreField({
  onChange,
}: {
  onChange: (selection: StoreSelection) => void;
}) {
  const [query, setQuery] = useState("");
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Store | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [data, setData] = useState<NewStoreData>(EMPTY);
  // Toko dengan nama mirip (untuk peringatan saat bikin toko baru).
  const [similar, setSimilar] = useState<Store[]>([]);
  // Detail toko terdaftar — MD hanya boleh mengisi field yang masih kosong.
  const [details, setDetails] = useState<StoreDetails>({
    address: "",
    phone: "",
    ownerName: "",
    distributor: "",
  });

  useEffect(() => {
    if (selected || creatingNew) return;
    let active = true;
    setLoading(true);
    const handle = setTimeout(async () => {
      let req = supabase
        .from("stores")
        .select("*")
        .order("name", { ascending: true })
        .limit(20);
      if (query.trim()) req = req.ilike("name", `%${query.trim()}%`);
      const { data: rows } = await req;
      if (active) {
        setStores((rows as Store[]) ?? []);
        setLoading(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [query, selected, creatingNew]);

  // Saat bikin toko baru: cek apakah ada nama mirip di database (peringatan).
  useEffect(() => {
    if (!creatingNew) {
      setSimilar([]);
      return;
    }
    const q = data.name.trim();
    if (q.length < 3) {
      setSimilar([]);
      return;
    }
    let active = true;
    const handle = setTimeout(async () => {
      const { data: rows } = await supabase
        .from("stores")
        .select("*")
        .ilike("name", `%${q}%`)
        .limit(5);
      if (active) setSimilar((rows as Store[]) ?? []);
    }, 350);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [creatingNew, data.name]);

  function pickExisting(store: Store) {
    const det = detailsFromStore(store);
    setSelected(store);
    setDetails(det);
    setCreatingNew(false);
    setSimilar([]);
    setOpen(false);
    onChange({ mode: "existing", store, details: det });
  }

  function updateDetails(patch: Partial<StoreDetails>) {
    const next = { ...details, ...patch };
    setDetails(next);
    if (selected) onChange({ mode: "existing", store: selected, details: next });
  }

  function startNew() {
    const next = { ...EMPTY, name: query.trim() };
    setData(next);
    setCreatingNew(true);
    setSelected(null);
    onChange({ mode: "new", data: next });
  }

  function updateNew(patch: Partial<NewStoreData>) {
    const next = { ...data, ...patch };
    setData(next);
    onChange({ mode: "new", data: next });
  }

  function reset() {
    setSelected(null);
    setCreatingNew(false);
    setData(EMPTY);
    setQuery("");
    onChange(null);
  }

  // 1) Toko terdaftar sudah dipilih — semua field langsung tampil.
  // Field yang sudah ada datanya = read-only (abu-abu); yang kosong = bisa diisi.
  if (selected) {
    const isEmpty = {
      address: !(selected.address ?? "").trim(),
      phone: !(selected.phone ?? "").trim(),
      ownerName: !(selected.owner_name ?? "").trim(),
      distributor: !(selected.distributor ?? "").trim(),
    };

    return (
      <div>
        <Label />
        <div className="rounded-lg border border-brand bg-brand/5">
          <div className="flex items-center justify-between px-3 py-3">
            <p className="font-medium">{selected.name}</p>
            <button
              type="button"
              onClick={reset}
              className="text-sm font-medium text-brand"
            >
              Ganti
            </button>
          </div>

          <div className="space-y-3 border-t border-brand/20 px-3 py-3">
            <p className="text-xs text-gray-500">
              Data yang masih kosong bisa dilengkapi (opsional). Data yang sudah
              ada tidak bisa diubah.
            </p>
            <DetailField
              label="Alamat"
              empty={isEmpty.address}
              value={details.address}
              onChange={(v) => updateDetails({ address: v })}
            />
            <DetailField
              label="No. Telp"
              empty={isEmpty.phone}
              value={details.phone}
              onChange={(v) => updateDetails({ phone: v })}
              type="tel"
              inputMode="numeric"
            />
            <DetailField
              label="Owner / Sales (nama)"
              empty={isEmpty.ownerName}
              value={details.ownerName}
              onChange={(v) => updateDetails({ ownerName: v })}
            />
            <DetailField
              label="Distributor"
              empty={isEmpty.distributor}
              value={details.distributor}
              onChange={(v) => updateDetails({ distributor: v })}
            />
          </div>
        </div>
      </div>
    );
  }

  // 2) Sedang menambah toko baru
  if (creatingNew) {
    return (
      <div className="space-y-4 rounded-lg border border-brand/40 bg-brand/5 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-brand">Toko Baru</p>
          <button
            type="button"
            onClick={reset}
            className="text-sm font-medium text-gray-500"
          >
            ← Cari toko
          </button>
        </div>
        <FormField
          label="Nama Toko"
          value={data.name}
          onChange={(e) => updateNew({ name: e.target.value })}
          required
        />
        {similar.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5">
            <p className="text-xs font-medium text-amber-700">
              ⚠️ Toko dengan nama mirip sudah ada. Pilih yang sudah ada daripada
              membuat baru:
            </p>
            <div className="mt-1.5 space-y-1">
              {similar.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pickExisting(s)}
                  className="block w-full rounded-md border border-amber-200 bg-white px-2.5 py-1.5 text-left text-sm hover:bg-amber-100"
                >
                  <span className="font-medium">{s.name}</span>
                  {s.address && (
                    <span className="block text-xs text-gray-500">
                      {s.address}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-amber-600">
              Kalau memang toko berbeda, lanjutkan isi form di bawah.
            </p>
          </div>
        )}
        <FormField
          label="Alamat"
          value={data.address}
          onChange={(e) => updateNew({ address: e.target.value })}
          required
        />
        <FormField
          label="No. Telp"
          type="tel"
          inputMode="numeric"
          value={data.phone}
          onChange={(e) => updateNew({ phone: e.target.value })}
          required
        />
        <FormField
          label="Owner / Sales (nama)"
          value={data.ownerName}
          onChange={(e) => updateNew({ ownerName: e.target.value })}
          required
        />
        <FormField
          label="Distributor"
          value={data.distributor}
          onChange={(e) => updateNew({ distributor: e.target.value })}
        />
      </div>
    );
  }

  // 3) Mode pencarian (default) — dropdown combobox
  return (
    <div>
      <Label />
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Cari atau ketik nama toko…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
        {open && (
          <div className="absolute z-[1000] mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {loading && <p className="p-3 text-sm text-gray-400">Memuat…</p>}
            {!loading &&
              stores.map((store) => (
                <button
                  key={store.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickExisting(store)}
                  className="block w-full border-b border-gray-100 px-3 py-3 text-left hover:bg-gray-50"
                >
                  <p className="font-medium">{store.name}</p>
                  {store.address && (
                    <p className="text-sm text-gray-500">{store.address}</p>
                  )}
                </button>
              ))}
            {!loading && stores.length === 0 && (
              <p className="p-3 text-sm text-gray-400">Toko tidak ditemukan.</p>
            )}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={startNew}
              className="sticky bottom-0 block w-full border-t border-gray-200 bg-white px-3 py-3 text-left font-medium text-brand hover:bg-brand/5"
            >
              + Tambah toko baru{query.trim() ? `: "${query.trim()}"` : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Label() {
  return (
    <span className="mb-1 block text-sm font-medium text-gray-700">
      Toko <span className="text-red-500">*</span>
    </span>
  );
}

// Field detail toko: kalau kosong -> bisa diisi; kalau sudah ada -> read-only abu-abu.
function DetailField({
  label,
  empty,
  value,
  onChange,
  type,
  inputMode,
}: {
  label: string;
  empty: boolean;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: "numeric";
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {empty ? (
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Belum ada — bisa diisi"
          className="input"
        />
      ) : (
        <input
          value={value}
          readOnly
          disabled
          className="input cursor-not-allowed bg-slate-100 text-slate-500"
        />
      )}
    </label>
  );
}
