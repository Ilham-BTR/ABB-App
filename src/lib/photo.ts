// URL publik foto di R2. Kolom DB menyimpan "key" (mis. visit-photos/xxx.jpg),
// helper ini mengubahnya jadi URL penuh via custom domain R2.
const BASE = import.meta.env.VITE_R2_PUBLIC_URL?.replace(/\/$/, "") ?? "";

export function photoUrl(key: string | null | undefined): string {
  if (!key) return "";
  if (/^https?:\/\//i.test(key)) return key; // sudah URL penuh
  const enc = key.split("/").map(encodeURIComponent).join("/");
  return `${BASE}/${enc}`;
}
