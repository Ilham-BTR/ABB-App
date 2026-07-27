export function Logo({ size = 40 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl bg-white font-bold text-brand shadow-sm"
      style={{ width: size, height: size, fontSize: size * 0.32 }}
    >
      ABB
    </span>
  );
}
