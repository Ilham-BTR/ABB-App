export type HBar = { label: string; value: number; color: string };

// Horizontal bar chart sederhana dengan sumbu-X bertanda.
export function HBarChart({ data }: { data: HBar[] }) {
  const rawMax = Math.max(1, ...data.map((d) => d.value));
  // Bulatkan batas atas ke kelipatan yang enak (10/5) untuk tick.
  const step = rawMax > 40 ? 20 : rawMax > 20 ? 10 : rawMax > 10 ? 5 : 2;
  const max = Math.ceil(rawMax / step) * step;
  const ticks = [];
  for (let t = 0; t <= max; t += step) ticks.push(t);

  return (
    <div className="py-2">
      <div className="space-y-5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-right text-xs font-medium text-slate-500">
              {d.label}
            </span>
            <div className="flex flex-1 items-center gap-2">
              <div className="h-7 flex-1 rounded bg-slate-50">
                <div
                  className="h-7 rounded transition-all"
                  style={{
                    width: `${(d.value / max) * 100}%`,
                    backgroundColor: d.color,
                    minWidth: d.value > 0 ? 4 : 0,
                  }}
                />
              </div>
              <span className="w-7 shrink-0 text-sm font-bold text-slate-700">
                {d.value}
              </span>
            </div>
          </div>
        ))}
      </div>
      {/* Sumbu-X */}
      <div className="mt-3 flex items-center gap-3">
        <span className="w-16 shrink-0" />
        <div className="flex flex-1 justify-between pr-9 text-[10px] text-slate-400">
          {ticks.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
