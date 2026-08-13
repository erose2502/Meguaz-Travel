import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOffer, createOrder, type OrderPassenger } from "@/lib/providers/duffel";
import { sendBookingConfirmation } from "@/lib/providers/whatsapp";
import { sendMetaEvent } from "@/lib/providers/meta-capi";
import { guard, failure, capExceeded } from "@/lib/security/guard";
import { SpendCapError } from "@/lib/security/spend-cap";
import { captureServerError } from "@/lib/monitoring";

// The actual purchase. Sign-in required — an order needs an owner. The offer
// is re-fetched first so the traveller confirms against the CURRENT price and
// an expired fare fails cleanly instead of booking stale.

const passengerSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(["m", "f"]),
  title: z.enum(["mr", "ms", "mrs", "miss"]),
});

const schema = z.object({
  offerId: z.string().min(4).max(120),
  email: z.string().email().max(320),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/), // E.164
  passengers: z.array(passengerSchema).min(1).max(9),
  /** The price the traveller saw; we refuse to book if it moved above this. */
  approvedAmount: z.number().positive(),
  /** Cosmetic — names the destination in the WhatsApp confirmation. */
  destCity: z.string().min(1).max(80).optional(),
  /** Traveller ticked "WhatsApp me the confirmation" in the booking sheet. */
  whatsappOptIn: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const g = await guard(req, "solve", { maxBodyBytes: 16_384 });
  if (!g.ok) return g.response;
  if (!g.caller.userId) {
    return NextResponse.json({ error: "Sign in to book" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the traveller details" }, { status: 400 });
  }
  const { offerId, email, phone, passengers, approvedAmount, destCity, whatsappOptIn } = parsed.data;

  try {
    const offer = await getOffer(offerId);
    if (!offer) {
      return NextResponse.json(
        { error: "This fare has expired — refresh the plan and try again", code: "offer_expired" },
        { status: 409 }
      );
    }
    if (offer.expiresAt && Date.parse(offer.expiresAt) < Date.now()) {
      return NextResponse.json(
        { error: "This fare has expired — refresh the plan and try again", code: "offer_expired" },
        { status: 409 }
      );
    }
    if (offer.passengerIds.length !== passengers.length) {
      return NextResponse.json(
        { error: "Traveller count doesn't match this fare — re-solve the plan", code: "passenger_mismatch" },
        { status: 409 }
      );
    }
    // Never charge more than the traveller approved (small drops are fine).
    if (Number(offer.totalAmount) > approvedAmount + 1) {
      return NextResponse.json(
        {
          error: `The fare moved to $${Math.round(Number(offer.totalAmount))} since you priced it — refresh to confirm the new price`,
          code: "price_changed",
        },
        { status: 409 }
      );
    }

    const orderPassengers: OrderPassenger[] = passengers.map((p, i) => ({
      id: offer.passengerIds[i],
      given_name: p.firstName,
      family_name: p.lastName,
      born_on: p.dob,
      gender: p.gender,
      title: p.title,
      email,
      phone_number: phone,
    }));

    const order = await createOrder(offer, orderPassengers);

    // Post-booking side effects are strictly non-blocking: a failed
    // notification or analytics event must never fail a paid order. Both
    // no-op until Meta credentials exist, and both sit behind spend caps.
    if (whatsappOptIn) {
      sendBookingConfirmation({
        phone,
        destCity: destCity ?? "your destination",
        reference: order.bookingReference ?? order.orderId.slice(0, 10),
        total: Number(order.totalAmount),
        currency: order.totalCurrency,
      }).catch((err) => captureServerError("whatsapp-confirm", err));
    }
    sendMetaEvent({
      name: "Purchase",
      value: Number(order.totalAmount),
      currency: order.totalCurrency,
      email,
      phone,
      ip: (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      fbp: req.cookies.get("_fbp")?.value,
      fbc: req.cookies.get("_fbc")?.value,
    }).catch((err) => captureServerError("meta-capi", err));

    return NextResponse.json({
      orderId: order.orderId,
      bookingReference: order.bookingReference,
      liveMode: order.liveMode,
      total: Math.round(Number(order.totalAmount)),
      currency: order.totalCurrency,
    });
  } catch (err) {
    if (err instanceof SpendCapError) return capExceeded();
    const message = err instanceof Error ? err.message : "";
    if (message.includes("offer_no_longer_available") || message.includes("offer_expired")) {
      return NextResponse.json(
        { error: "This fare has expired — refresh the plan and try again", code: "offer_expired" },
        { status: 409 }
      );
    }
    if (message.includes("insufficient_balance")) {
      return NextResponse.json(
        { error: "Live ticketing isn't enabled yet — booking works in test mode", code: "no_balance" },
        { status: 503 }
      );
    }
    captureServerError("book", err);
    return failure("Booking failed — nothing was charged");
  }
}
