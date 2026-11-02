import { getCurrentUser } from "@/lib/current";
import { read } from "@/lib/db";
import { buildStreamState } from "@/lib/logic";
import { recentReactions } from "@/lib/reactions";
import { NextResponse } from "next/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  const state = await read((db) => buildStreamState(db, id, user));
  if (!state) return NextResponse.json({ error: "not found" }, { status: 404 });
  if ("forbidden" in state && state.forbidden) return NextResponse.json({ error: "filtered" }, { status: 403 });
  return NextResponse.json({ ...state, reactions: recentReactions(id) });
}
