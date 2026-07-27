export type Bar = {
  label: string;
  value: number;
  color?: string;
  sub?: string; // teks kecil di bawah label (mis. "awal 88")
};

const PLOT = 190; // tinggi area plot (px)

// Tentukan skala "cantik" + tick untuk sumbu-Y.
function niceScale(maxVal: number) {
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000];
  const target = Math.max(maxVal, 1) / 4;
  const step = steps.find((s) => s >= target) ?? Math.ceil(target);
  const niceMax = Math.max(Math.ceil(maxVal / step) * step, step);
  const ticks: number[] = [];
  for (let t = 0; t <= niceMax; t += step) ticks.push(t);
  return { niceMax, ticks };
}

// Grafik batang vertikal (SVG-less) dengan gridline, sumbu-Y & baseline.
export function BarChart({
  data,
  empty = "Belum ada data",
}: {
  data: Bar[];
  empty?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div className="card flex min-h-[140px] items-center justify-center p-4 text-center text-sm text-slate-400 sm:min-h-[260px]">
        {empty}
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value));
  const { niceMax, ticks } = niceScale(maxVal);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex gap-3">
        {/* Sumbu-Y */}
        <div
          className="relative w-5 shrink-0"
          style={{ height: PLOT }}
          aria-hidden
        >
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2 text-[9px] font-medium text-slate-300"
              style={{ top: (1 - t / niceMax) * PLOT }}
            >
              {t}
            </span>
          ))}
        </div>

        {/* Area plot */}
        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height: PLOT }}>
            {/* Gridlines putus-putus */}
            {ticks.map((t) => (
              <div
                key={t}
                className="absolute inset-x-0 border-t border-dashed border-slate-100"
                style={{ top: (1 - t / niceMax) * PLOT }}
              />
            ))}
            {/* Batang — bentuk seperti Store Visited Result: solid + track */}
            <div className="absolute inset-0 flex items-end gap-2.5">
              {data.map((d) => {
                const color = d.color ?? "#2563eb";
                const pct = Math.max((d.value / niceMax) * 100, d.value > 0 ? 2 : 0);
                return (
                  <div
                    key={d.label}
                    className="group relative flex h-full min-w-0 max-w-[60px] flex-1 justify-center"
                  >
                    {/* Track */}
                    <div className="absolute bottom-0 h-full w-full max-w-[34px] rounded-md bg-slate-50" />
                    {/* Bar */}
                    <div
                      className="absolute bottom-0 w-full max-w-[34px] rounded-md transition-all duration-200 group-hover:brightness-110"
                      style={{ height: `${pct}%`, backgroundColor: color }}
                      title={`${d.label}: ${d.value}`}
                    />
                    {/* Angka */}
                    <span
                      className="pointer-events-none absolute text-[11px] font-semibold text-slate-500"
                      style={{ bottom: `calc(${pct}% + 3px)` }}
                    >
                      {d.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Label */}
          <div className="mt-2.5 flex gap-2.5">
            {data.map((d) => (
              <div
                key={d.label}
                className="flex min-w-0 max-w-[60px] flex-1 flex-col items-center"
              >
                <span
                  className="line-clamp-2 w-full break-words text-center text-[10px] leading-tight text-slate-400"
                  title={d.label}
                >
                  {d.label}
                </span>
                {d.sub && (
                  <span className="text-[9px] leading-none text-slate-300">
                    {d.sub}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
