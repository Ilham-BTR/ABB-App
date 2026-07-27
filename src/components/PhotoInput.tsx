import { useEffect, useRef, useState } from "react";

type Props = {
  label: string;
  // "user" = kamera depan (selfie), "environment" = kamera belakang (toko).
  facing: "user" | "environment";
  onChange: (file: File | null) => void;
  required?: boolean;
};

// Tombol ambil foto (dari kamera atau galeri) + preview.
export function PhotoInput({ label, onChange, required }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : null);
    onChange(file);
  }

  function remove() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    onChange(null);
  }

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      {preview ? (
        <div className="relative h-48 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          <img
            src={preview}
            alt={label}
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={remove}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white transition hover:bg-black/75"
            aria-label="Hapus foto"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-300 px-4 py-8 text-gray-500 transition hover:border-brand hover:bg-brand/5 hover:text-brand"
        >
          <span className="text-2xl">📷</span>
          <span className="text-sm font-medium">Ambil foto</span>
        </button>
      )}
    </div>
  );
}
