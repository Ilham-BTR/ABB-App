export type DonutSlice = { label: string; value: number; color: string };

// Donut chart (SVG murni, tanpa library) + total di tengah + angka pada tiap slice.
export function DonutChart({
  data,
  centerValue,
  centerLabel,
  size = 210,
  thickness = 44,
}: {
  data: DonutSlice[];
  centerValue: number | string;
  centerLabel?: string;
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;

  const slices = data.filter((d) => d.value > 0);
  let acc = 0;
  const rendered = slices.map((d) => {
    const len = (d.value / total) * C;
    const dashoffset = -acc;
    const midFrac = (acc + len / 2) / C;
    const ang = midFrac * 2 * Math.PI - Math.PI / 2;
    const lx = cx + r * Math.cos(ang);
    const ly = cy + r * Math.sin(ang);
    acc += len;
    return { d, len, dashoffset, lx, ly };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        {total === 0 ? (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={thickness}
          />
        ) : (
          rendered.map((s, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.d.color}
              strokeWidth={thickness}
              strokeDasharray={`${s.len} ${C - s.len}`}
              strokeDashoffset={s.dashoffset}
            />
          ))
        )}
      </g>

      {/* Angka pada tiap slice */}
      {total > 0 &&
        rendered.map((s, i) =>
          s.len / C > 0.05 ? (
            <text
              key={`l${i}`}
              x={s.lx}
              y={s.ly}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#ffffff"
              style={{ fontSize: 13, fontWeight: 700 }}
            >
              {s.d.value}
            </text>
          ) : null
        )}

      {/* Total di tengah */}
      <text
        x="50%"
        y="46%"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#1e293b"
        style={{ fontSize: size * 0.17, fontWeight: 800 }}
      >
        {centerValue}
      </text>
      {centerLabel && (
        <text
          x="50%"
          y="59%"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#94a3b8"
          style={{ fontSize: size * 0.07, fontWeight: 600 }}
        >
          {centerLabel}
        </text>
      )}
    </svg>
  );
}
