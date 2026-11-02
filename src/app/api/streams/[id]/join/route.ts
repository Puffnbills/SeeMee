import { mutate } from "@/lib/db";
import { performJoin } from "@/lib/logic";
import { hasJoined, markJoined } from "@/lib/session";
import { NextResponse } from "next/server";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (await hasJoined(id)) return NextResponse.json({ counted: false });
  const result = await mutate((db) => performJoin(db, id));
  if (result.ok && result.data.counted) await markJoined(id);
  return NextResponse.json(result.ok ? result.data : { counted: false });
}
