import { getCurrentUser } from "@/lib/current";
import { read } from "@/lib/db";
import { createLiveKitToken } from "@/lib/integrations/livekit";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const room = url.searchParams.get("room");
  const publish = url.searchParams.get("publish") === "1";
  if (!room) return NextResponse.json({ error: "room required" }, { status: 400 });
  const user = await getCurrentUser();
  if (publish) {
    const stream = await read((db) => db.streams.find((item) => item.stream_room_id === room) ?? null);
    if (!stream) return NextResponse.json({ error: "unknown room" }, { status: 404 });
    if (!user || (user.id !== stream.creator && user.role !== "administrator")) {
      return NextResponse.json({ error: "not allowed to publish" }, { status: 403 });
    }
  }
  const identity = user?.id ?? `guest-${crypto.randomUUID().slice(0, 8)}`;
  const token = await createLiveKitToken({
    room,
    identity,
    name: user?.display_name ?? "Guest",
    publish,
  });
  if (!token) return NextResponse.json({ mode: "placeholder" });
  return NextResponse.json({ mode: "livekit", token: token.token, url: token.url });
}
