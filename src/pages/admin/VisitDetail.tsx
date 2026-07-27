import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { photoUrl } from "@/lib/photo";
import { useAuth } from "@/context/AuthContext";
import { MiniMap } from "@/components/MiniMap";
import { StatusBadge } from "@/components/StatusBadge";
import { VisitResultBadge } from "@/components/VisitResultBadge";
import { VisitAdminPanel } from "@/components/VisitAdminPanel";
import { visitResultLabel, type VisitResult } from "@/lib/types";

type VisitDetailRow = {
  id: string;
  visit_date: string;
  visit_result: VisitResult | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  selfie_url: string | null;
  store_photo_url: string | null;
  store_photo_url_2: string | null;
  activity_photo_url: string | null;
  activity_photo_url_2: string | null;
  stores: {
    name: string;
    address: string | null;
    register_status: string | null;
  } | null;
  fos: { full_name: string | null } | null;
};

export default function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const isSuper = role === "superadmin";

  const [visit, setVisit] = useState<VisitDetailRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from("visits")
      .select(
        "*, stores(name, address, register_status), fos:profiles!visits_fos_id_fkey(full_name)"
      )
      .eq("id", id)
      .single();
    setVisit((data as unknown as VisitDetailRow) ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  if (!visit)
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          to="/admin"
          className="inline-flex text-sm font-medium text-brand hover:underline"
        >
          ← Back
        </Link>
        <p className="card px-3 py-10 text-center text-sm text-slate-400">
          Visit not found.
        </p>
      </div>
    );

  // Foto disimpan sebagai key objek R2 → ubah jadi URL penuh.
  function fotoUrl(path: string | null) {
    if (!path) return null;
    return photoUrl(path);
  }
  const selfieUrl = fotoUrl(visit.selfie_url);
  const storePhotoUrl = fotoUrl(visit.store_photo_url);
  const storePhotoUrl2 = fotoUrl(visit.store_photo_url_2);
  const activityUrl = fotoUrl(visit.activity_photo_url);
  const activityUrl2 = fotoUrl(visit.activity_photo_url_2);

  const store = visit.stores;
  const fos = visit.fos;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        to="/admin"
        className="inline-flex text-sm font-medium text-brand hover:underline"
      >
        ← Back
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-slate-800">
          {store?.name ?? "Visit"}
        </h1>
        <VisitResultBadge result={visit.visit_result} />
      </div>

      <div className="card grid grid-cols-2 gap-4 p-4 text-sm">
        <Info label="Date" value={visit.visit_date} />
        <Info label="FOS" value={fos?.full_name ?? "-"} />
        <Info label="Visit Result" value={visitResultLabel(visit.visit_result)} />
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Registration Status
          </p>
          {store?.register_status ? (
            <StatusBadge status={store.register_status} />
          ) : (
            <span className="text-slate-300">-</span>
          )}
        </div>
        <Info label="Address" value={store?.address ?? "-"} />
        {visit.notes && <Info label="Notes" value={visit.notes} />}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Photo label="Selfie" url={selfieUrl} />
        <Photo label="Store Photo 1" url={storePhotoUrl} />
        <Photo label="Store Photo 2" url={storePhotoUrl2} />
        <Photo label="Activity Photo 1" url={activityUrl} />
        <Photo label="Activity Photo 2" url={activityUrl2} />
      </div>

      {visit.latitude != null && visit.longitude != null && (
        <div className="card overflow-hidden p-0">
          <p className="border-b border-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
            Location
          </p>
          <div className="p-3">
            <MiniMap lat={visit.latitude} lng={visit.longitude} />
          </div>
        </div>
      )}

      {isSuper && (
        <VisitAdminPanel
          visitId={visit.id}
          initialResult={visit.visit_result}
          initialDate={visit.visit_date}
          initialNotes={visit.notes}
          onChanged={load}
          photos={[
            { key: "selfie_url", label: "Selfie", path: visit.selfie_url },
            { key: "store_photo_url", label: "Store Photo", path: visit.store_photo_url },
            { key: "store_photo_url_2", label: "Store Photo 2", path: visit.store_photo_url_2 },
            { key: "activity_photo_url", label: "Activity Photo", path: visit.activity_photo_url },
            { key: "activity_photo_url_2", label: "Activity Photo 2", path: visit.activity_photo_url_2 },
          ]}
        />
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  );
}

function Photo({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="card overflow-hidden p-3">
      <p className="mb-2 text-sm font-medium text-slate-700">{label}</p>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <div className="relative h-40 w-full overflow-hidden rounded-lg bg-slate-100">
            <img src={url} alt={label} className="h-full w-full object-cover" />
          </div>
        </a>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-400">
          No photo
        </div>
      )}
    </div>
  );
}
