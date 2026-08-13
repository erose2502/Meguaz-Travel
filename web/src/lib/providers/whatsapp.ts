import { env } from "@/lib/env";
import { assertSpendCap } from "@/lib/security/spend-cap";

// Booking confirmations over the WhatsApp Cloud API. Business-initiated
// messages must use an approved template: a fresh Meta app only has
// hello_world, so we send that (no parameters) until META_WA_TEMPLATE points
// at an approved booking template with {{destination}} {{reference}} {{total}}
// body slots. Callers treat this as fire-and-forget — a failed notification
// must never fail the booking it announces.

export function whatsappEnabled(): boolean {
  return Boolean(env.metaWaToken && env.metaWaPhoneId);
}

export type BookingMessage = {
  phone: string; // E.164, as collected by the booking sheet
  destCity: string;
  reference: string;
  total: number;
  currency: string;
};

export async function sendBookingConfirmation(msg: BookingMessage): Promise<void> {
  if (!whatsappEnabled()) return;
  await assertSpendCap("whatsapp");

  const template = env.metaWaTemplate;
  const body = {
    messaging_product: "whatsapp",
    to: msg.phone.replace(/[^0-9]/g, ""),
    type: "template",
    template: {
      name: template,
      language: { code: template === "hello_world" ? "en_US" : "en" },
      ...(template === "hello_world"
        ? {}
        : {
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: msg.destCity },
                  { type: "text", text: msg.reference },
                  { type: "text", text: `$${Math.round(msg.total)} ${msg.currency}` },
                ],
              },
            ],
          }),
    },
  };

  const res = await fetch(`https://graph.facebook.com/v23.0/${env.metaWaPhoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.metaWaToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`WhatsApp send failed (${res.status})`);
}
