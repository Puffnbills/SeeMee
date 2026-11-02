import { getCurrentUser } from "@/lib/current";
import { mutate } from "@/lib/db";
import { performHeartbeat } from "@/lib/logic";
import { NextResponse } from "next/server";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  await mutate((db) => {
    performHeartbeat(db, user?.id ?? null, id, 15);
    return null;
  });
  return NextResponse.json({ ok: true });
}
