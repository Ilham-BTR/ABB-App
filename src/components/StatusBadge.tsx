import { REGISTER_STATUS_OPTIONS } from "@/lib/types";

const STYLES: Record<string, string> = {
  sudah_aktif: "bg-green-100 text-green-700 ring-green-600/20",
  sudah_belum_aktif: "bg-amber-100 text-amber-700 ring-amber-600/20",
  new: "bg-blue-100 text-blue-700 ring-blue-600/20",
  no: "bg-gray-100 text-gray-600 ring-gray-500/20",
  decline: "bg-red-100 text-red-700 ring-red-600/20",
  follow_up: "bg-indigo-100 text-indigo-700 ring-indigo-600/20",
  other: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function StatusBadge({ status }: { status: string }) {
  const label =
    REGISTER_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
  const style = STYLES[status] ?? "bg-slate-100 text-slate-600 ring-slate-500/20";
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${style}`}
    >
      {label}
    </span>
  );
}
