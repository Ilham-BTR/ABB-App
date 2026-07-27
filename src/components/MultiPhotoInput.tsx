import { useEffect, useState } from "react";

type Props = {
  label: string;
  facing: "user" | "environment";
  max?: number;
  required?: boolean;
  onChange: (files: File[]) => void;
};

// Field foto dengan beberapa slot yang langsung tampil sekaligus (default 2).
export function MultiPhotoInput({
  label,
  max = 2,
  required,
  onChange,
}: Props) {
  const [slots, setSlots] = useState<(File | null)[]>(() =>
    Array(max).fill(null)
  );
  const [previews, setPreviews] = useState<(string | null)[]>(() =>
    Array(max).fill(null)
  );

  useEffect(() => {
    const urls = slots.map((f) => (f ? URL.createObjectURL(f) : null));
    setPreviews(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [slots]);

  function setSlot(i: number, file: File | null) {
    const next = [...slots];
    next[i] = file;
    setSlots(next);
    onChange(next.filter((f): f is File => !!f));
  }

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
        <span className="ml-1 text-xs font-normal text-slate-400">
          (wajib {max} foto)
        </span>
      </span>

      <div className="grid grid-cols-2 gap-2">
        {slots.map((f, i) =>
          f ? (
            <div
              key={i}
              className="relative h-32 overflow-hidden rounded-lg border border-gray-200"
            >
              <img
                src={previews[i] ?? ""}
                alt={`${label} ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setSlot(i, null)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                aria-label="Hapus foto"
              >
                ✕
              </button>
            </div>
          ) : (
            <label
              key={i}
              className="flex h-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-brand hover:text-brand"
            >
              <span className="text-xl">📷</span>
              Ambil foto
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) setSlot(i, file);
                }}
              />
            </label>
          )
        )}
      </div>
    </div>
  );
}
