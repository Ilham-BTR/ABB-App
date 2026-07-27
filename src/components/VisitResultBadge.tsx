import { VISIT_RESULT_OPTIONS } from "@/lib/types";

const STYLES: Record<string, string> = {
  yes_active: "bg-green-100 text-green-700 ring-green-600/20",
  yes_inactive: "bg-amber-100 text-amber-700 ring-amber-600/20",
  decline: "bg-red-100 text-red-700 ring-red-600/20",
  follow_up: "bg-blue-100 text-blue-700 ring-blue-600/20",
  other: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function VisitResultBadge({ result }: { result: string | null }) {
  if (!result) return <span className="text-slate-400">-</span>;
  const label =
    VISIT_RESULT_OPTIONS.find((o) => o.value === result)?.label ?? result;
  const style = STYLES[result] ?? "bg-slate-100 text-slate-600 ring-slate-500/20";
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${style}`}
    >
      {label}
    </span>
  );
}
