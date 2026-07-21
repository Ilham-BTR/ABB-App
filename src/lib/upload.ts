import imageCompression from "browser-image-compression";
import { supabase } from "@/lib/supabase";

// Kompres foto sebelum upload (hemat kuota, tetap Full HD).
export async function compressImage(file: File | Blob): Promise<Blob> {
  return imageCompression(file as File, {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 1920,
    initialQuality: 0.9,
    useWebWorker: true,
  });
}

export type PhotoFolder = "selfie" | "store" | "activity";

// Upload blob ke R2 via presigned URL dari Edge Function `get-upload-url`.
// Return: key objek (mis. "visit-photos/<uid>/selfie/<id>.jpg").
export async function uploadBlob(
  folder: PhotoFolder,
  blob: Blob
): Promise<string> {
  const contentType = blob.type || "image/jpeg";
  const { data, error } = await supabase.functions.invoke("get-upload-url", {
    body: { folder, contentType },
  });
  if (error) throw new Error(`Gagal minta URL upload: ${error.message}`);
  const { uploadUrl, key } = data as { uploadUrl: string; key: string };

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!put.ok) throw new Error(`Gagal upload foto (${put.status}).`);
  return key;
}

// Kompres + upload sekaligus.
export async function compressAndUpload(
  folder: PhotoFolder,
  file: File
): Promise<string> {
  const blob = await compressImage(file);
  return uploadBlob(folder, blob);
}
