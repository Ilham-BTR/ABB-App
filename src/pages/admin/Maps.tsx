import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CoverageMap, type CoveragePoint } from "@/components/CoverageMap";
import type { Store } from "@/lib/types";

export default function MapsPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [distributor, setDistributor] = useState("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("stores")
        .select("id, name, register_status, distributor, latitude, longitude")
        .order("name", { ascending: true });
      setStores((data as Store[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const distributorOptions = useMemo(() => {
    const set = new Set<string>();
    stores.forEach((s) => s.distributor && set.add(s.distributor));
    return Array.from(set).sort();
  }, [stores]);

  const filtered = stores.filter((s) => {
    if (
      query.trim() &&
      !s.name.toLowerCase().includes(query.trim().toLowerCase())
    )
      return false;
    if (distributor !== "all" && (s.distributor ?? "") !== distributor)
      return false;
    return true;
  });

  const withCoord = filtered.filter(
    (s) => s.latitude != null && s.longitude != null
  );
  const points: CoveragePoint[] = withCoord.map((s) => ({
    lat: s.latitude as number,
    lng: s.longitude as number,
    name: s.name,
  }));
  const noCoord = filtered.length - withCoord.length;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Coverage Map</h1>

      {/* Filter */}
      <div className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        <Field label="Search Store">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Store name…"
            className={inputClass}
          />
        </Field>
        <Select label="Distributor" value={distributor} onChange={setDistributor}>
          <option value="all">All Distributors</option>
          {distributorOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            {points.length} stores on the map
            {noCoord > 0 && (
              <span className="text-slate-400">
                {" "}
                · {noCoord} stores without coordinates yet (not visited)
              </span>
            )}
          </p>
          <CoverageMap points={points} />
        </>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        {children}
      </select>
    </Field>
  );
}
