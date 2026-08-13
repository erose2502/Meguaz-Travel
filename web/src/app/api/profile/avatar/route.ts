import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { admin, adminAvailable } from "@/lib/supabase/admin";
import { guard, failure } from "@/lib/security/guard";
import { captureServerError } from "@/lib/monitoring";

// Avatar upload → Supabase Storage (public `avatars` bucket, one folder per
// user), then the profile row points at the public URL. Server-side so the
// file is validated before it costs storage, and the path can never be forged.

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(req: NextRequest) {
  const g = await guard(req, "search", { maxBodyBytes: MAX_BYTES + 4096 });
  if (!g.ok) return g.response;
  if (!g.caller.userId) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }
  if (!adminAvailable()) {
    return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Attach an image file" }, { status: 400 });
    }
    const ext = TYPES[file.type];
    if (!ext) {
      return NextResponse.json({ error: "Use a JPEG, PNG or WebP image" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Keep it under 2 MB" }, { status: 400 });
    }

    const path = `${g.caller.userId}/avatar.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await admin()
      .storage.from("avatars")
      .upload(path, bytes, { contentType: file.type, upsert: true });
    if (upErr) {
      captureServerError("avatar-upload", upErr);
      return failure("Could not store the image");
    }

    const { data } = admin().storage.from("avatars").getPublicUrl(path);
    // Cache-buster: the path is stable, so browsers would otherwise keep the
    // old picture until the CDN TTL expires.
    const url = `${data.publicUrl}?v=${Date.now()}`;

    const supabase = await createClient();
    const { error: rowErr } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", g.caller.userId);
    if (rowErr) return failure("Could not save your profile");

    return NextResponse.json({ avatarUrl: url });
  } catch (err) {
    captureServerError("avatar-upload", err);
    return failure("Could not update your avatar");
  }
}
