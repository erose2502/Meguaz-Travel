import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { assertSpendCap } from "@/lib/security/spend-cap";

// Meta Conversions API — the server half of ad-funnel tracking. The browser
// Pixel and this endpoint send the same event with a shared event_id, so Meta
// dedupes the pair; events that only exist server-side (Purchase) come through
// here alone, which also keeps them out of reach of ad blockers and spoofers.
// PII is SHA-256 hashed before it leaves, per Meta's matching spec.

export function capiEnabled(): boolean {
  return Boolean(env.metaPixelId && env.metaCapiToken);
}

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export type MetaEvent = {
  name: "PageView" | "Search" | "ViewContent" | "InitiateCheckout" | "Purchase";
  eventId?: string;
  sourceUrl?: string;
  value?: number;
  currency?: string;
  email?: string;
  phone?: string;
  ip?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
};

export async function sendMetaEvent(evt: MetaEvent): Promise<void> {
  if (!capiEnabled()) return;
  await assertSpendCap("meta");

  const user_data: Record<string, unknown> = {};
  if (evt.email) user_data.em = [sha256(evt.email.trim().toLowerCase())];
  if (evt.phone) user_data.ph = [sha256(evt.phone.replace(/[^0-9]/g, ""))];
  if (evt.ip) user_data.client_ip_address = evt.ip;
  if (evt.userAgent) user_data.client_user_agent = evt.userAgent;
  if (evt.fbp) user_data.fbp = evt.fbp;
  if (evt.fbc) user_data.fbc = evt.fbc;

  const custom_data: Record<string, unknown> = {};
  if (evt.value != null) {
    custom_data.value = evt.value;
    custom_data.currency = evt.currency ?? "USD";
  }

  const payload = {
    data: [
      {
        event_name: evt.name,
        event_time: Math.floor(Date.now() / 1000),
        ...(evt.eventId ? { event_id: evt.eventId } : {}),
        action_source: "website",
        ...(evt.sourceUrl ? { event_source_url: evt.sourceUrl } : {}),
        user_data,
        ...(Object.keys(custom_data).length ? { custom_data } : {}),
      },
    ],
  };

  const res = await fetch(
    `https://graph.facebook.com/v23.0/${env.metaPixelId}/events?access_token=${encodeURIComponent(env.metaCapiToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) throw new Error(`Meta CAPI failed (${res.status})`);
}
