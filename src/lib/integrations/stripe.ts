import Stripe from "stripe";
import { COIN_PACKAGES } from "../constants";

function client() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function startCheckout(opts: { packageId: string; userId: string; origin: string; email: string }) {
  const pack = COIN_PACKAGES.find((item) => item.id === opts.packageId);
  const stripe = client();
  if (!pack) return { mode: "error" as const, error: "Unknown coin pack." };
  if (!stripe) return { mode: "demo" as const };
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: opts.email,
    success_url: `${opts.origin}/wallet?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${opts.origin}/wallet?canceled=1`,
    metadata: { userId: opts.userId, packageId: pack.id, coins: String(pack.coins) },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(pack.amount * 100),
          product_data: { name: `${pack.coins} SeeMee coins (${pack.name})` },
        },
      },
    ],
  });
  return { mode: "stripe" as const, url: session.url };
}

export async function fulfillCheckoutSession(sessionId: string) {
  const stripe = client();
  if (!stripe) return null;
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") return null;
  const userId = session.metadata?.userId;
  const packageId = session.metadata?.packageId;
  if (!userId || !packageId) return null;
  const customer = typeof session.customer === "string" ? session.customer : null;
  return { userId, packageId, externalId: session.id, customer };
}

export function stripeWebhookEvent(payload: string, signature: string) {
  const stripe = client();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return null;
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
