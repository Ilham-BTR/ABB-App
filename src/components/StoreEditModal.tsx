import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { REGISTER_STATUS_OPTIONS } from "@/lib/types";
import type { Store } from "@/lib/types";

export function StoreEditModal({
  store,
  onClose,
  onSaved,
}: {
  store: Store;
  onClose: () => void;
  onSaved: (s: Store) => void;
}) {
  const [name, setName] = useState(store.name ?? "");
  const [address, setAddress] = useState(store.address ?? "");
  const [phone, setPhone] = useState(store.phone ?? "");
  const [owner, setOwner] = useState(store.owner_name ?? "");
  const [distributor, setDistributor] = useState(store.distributor ?? "");
  const [status, setStatus] = useState(store.register_status ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) {
      setError("Nama toko wajib diisi.");
      return;
    }
    setSaving(true);
    setError(null);
    const patch = {
      name: name.trim(),
      address: address.trim() || null,
      phone: phone.trim() || null,
      owner_name: owner.trim() || null,
      distributor: distributor.trim() || null,
      register_status: status || null,
    };
    const { error } = await supabase
      .from("stores")
      .update(patch)
      .eq("id", store.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved({ ...store, ...patch } as Store);
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Edit Toko</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <FormField
            label="Nama Toko"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <FormField
            label="Alamat"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <FormField
            label="No. Telp"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <FormField
            label="Owner / Sales"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          />
          <FormField
            label="Distributor"
            value={distributor}
            onChange={(e) => setDistributor(e.target.value)}
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Status Register Program
            </span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input"
            >
              <option value="">-</option>
              {REGISTER_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button onClick={save} loading={saving}>
              Simpan
            </Button>
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
