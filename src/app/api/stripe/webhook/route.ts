import { mutate } from "@/lib/db";
import { stripeWebhookEvent } from "@/lib/integrations/stripe";
import { performPurchase } from "@/lib/logic";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });
  const payload = await request.text();
  try {
    const event = stripeWebhookEvent(payload, signature);
    if (!event) return NextResponse.json({ error: "stripe not configured" }, { status: 400 });
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const packageId = session.metadata?.packageId;
      if (userId && packageId && session.payment_status === "paid") {
        const customer = typeof session.customer === "string" ? session.customer : null;
        await mutate((db) => performPurchase(db, userId, packageId, session.id, customer));
      }
    }
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
}
