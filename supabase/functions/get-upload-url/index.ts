// Edge Function: generate presigned PUT URL untuk upload foto ke Cloudflare R2.
//
// Flow:
//   1. Client (login) minta URL ke endpoint ini (JWT lewat Authorization).
//   2. Function validasi JWT, buat key `visit-photos/<userId>/<folder>/<uuid>.jpg`,
//      lalu presigned PUT URL (15 menit).
//   3. Client PUT file langsung ke R2 (tidak lewat server).
//
// Secrets di Supabase (Dashboard > Edge Functions > Secrets):
//   R2_ACCOUNT_ID       (atau R2_ENDPOINT langsung)
//   R2_ACCESS_KEY_ID
//   R2_SECRET_ACCESS_KEY
//   R2_BUCKET

import { createClient } from "npm:@supabase/supabase-js@2";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_FOLDERS = ["selfie", "store", "activity"];
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth header" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Invalid token" }, 401);

    const { folder, contentType } = await req.json();
    if (!folder || !ALLOWED_FOLDERS.includes(folder))
      return json({ error: `Invalid folder. Allowed: ${ALLOWED_FOLDERS.join(", ")}` }, 400);
    if (!contentType || !ALLOWED_TYPES.includes(contentType))
      return json({ error: "Only image/jpeg, image/png, image/webp allowed" }, 400);

    const ext = contentType.split("/")[1].replace("jpeg", "jpg");
    const uuid = crypto.randomUUID();
    const key = `visit-photos/${user.id}/${folder}/${uuid}.${ext}`;

    const endpoint =
      Deno.env.get("R2_ENDPOINT") ||
      `https://${Deno.env.get("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`;

    const s3 = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
        secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
      },
    });

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: Deno.env.get("R2_BUCKET")!,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 900 }
    );

    return json({ uploadUrl, key });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
