// URL publik foto di R2. Kolom DB menyimpan "key" (mis. visit-photos/xxx.jpg),
// helper ini mengubahnya jadi URL penuh via custom domain R2.
// ponytail: domain di-hardcode (publik) — env VITE_R2_PUBLIC_URL dulu pernah
// ter-bake sebagai pub-*.r2.dev lama dan link export jadi acak. Kalau domain
// berubah, edit di sini + .env + secret VITE_R2_PUBLIC_URL sekaligus.
const BASE = "https://img.abb-form.click";

export function photoUrl(key: string | null | undefined): string {
  if (!key) return "";
  if (/^https?:\/\//i.test(key)) return key; // sudah URL penuh
  const enc = key.split("/").map(encodeURIComponent).join("/");
  return `${BASE}/${enc}`;
}
