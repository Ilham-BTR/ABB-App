import { useEffect } from "react";

type Tone = "success" | "warning" | "danger";

const TONE: Record<
  Tone,
  { ring: string; bg: string; icon: string; button: string }
> = {
  success: {
    ring: "ring-emerald-100",
    bg: "bg-emerald-50",
    icon: "text-emerald-600",
    button: "bg-emerald-600 hover:bg-emerald-700",
  },
  warning: {
    ring: "ring-amber-100",
    bg: "bg-amber-50",
    icon: "text-amber-600",
    button: "bg-amber-600 hover:bg-amber-700",
  },
  danger: {
    ring: "ring-red-100",
    bg: "bg-red-50",
    icon: "text-red-600",
    button: "bg-red-600 hover:bg-red-700",
  },
};

// Ikon per tone: centang (selesai), seru (peringatan), silang (gagal).
const PATH: Record<Tone, string> = {
  success: "M4.5 12.75l6 6 9-13.5",
  warning: "M12 9v3.75m0 3.75h.008M10.34 3.94L2.7 17.1A1.5 1.5 0 004 19.35h16a1.5 1.5 0 001.3-2.25L13.66 3.94a1.5 1.5 0 00-2.62 0z",
  danger: "M6 18L18 6M6 6l12 12",
};

/**
 * Dialog pemberitahuan di tengah layar. Dipakai untuk hal yang harus benar-benar
 * disadari MD (mis. toko sudah final) — pesan sebaris di bawah form gampang
 * terlewat kalau halamannya sedang ter-scroll jauh.
 */
export function AlertDialog({
  open,
  tone = "success",
  title,
  children,
  actionLabel,
  onAction,
  onClose,
}: {
  open: boolean;
  tone?: Tone;
  title: string;
  children: React.ReactNode;
  actionLabel: string;
  onAction: () => void;
  onClose?: () => void;
}) {
  // Esc menutup, dan halaman di belakang tidak ikut ter-scroll.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") (onClose ?? onAction)();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onAction, onClose]);

  if (!open) return null;
  const t = TONE[tone];

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={() => (onClose ?? onAction)()}
      />
      <div className="relative w-full max-w-sm animate-[pop_.18s_ease-out] rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div
          className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${t.bg} ring-8 ${t.ring}`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-7 w-7 ${t.icon}`}
            stroke="currentColor"
            aria-hidden
          >
            <path d={PATH[tone]} />
          </svg>
        </div>

        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        <div className="mt-2 text-sm leading-relaxed text-slate-500">
          {children}
        </div>

        <button
          type="button"
          onClick={onAction}
          className={`mt-6 w-full rounded-xl px-4 py-3 font-semibold text-white transition ${t.button}`}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
