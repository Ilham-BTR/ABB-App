import { VISIT_RESULT_OPTIONS, type VisitResult } from "@/lib/types";

type Props = {
  value: VisitResult | null;
  onChange: (value: VisitResult) => void;
};

// Pilihan Visit Result (hasil kunjungan — diisi MD tiap visit).
export function VisitResultRadio({ value, onChange }: Props) {
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-gray-700">
        Visit Result <span className="text-red-500">*</span>
      </span>
      <div className="grid grid-cols-2 gap-2">
        {VISIT_RESULT_OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`rounded-lg border px-3 py-3 text-sm font-medium transition ${
                active
                  ? "border-brand bg-brand text-white"
                  : "border-gray-300 bg-white text-gray-700"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
