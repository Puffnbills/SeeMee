import "server-only";
import { cookies } from "next/headers";

const SESSION = "seemee_uid";
const GATE = "seemee_gate";
const JOINED = "seemee_joined";

export async function getSessionUserId() {
  const jar = await cookies();
  return jar.get(SESSION)?.value ?? null;
}

export async function setSession(userId: string) {
  const jar = await cookies();
  jar.set(SESSION, userId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION);
}

export async function hasAcknowledged(streamId: string) {
  const jar = await cookies();
  return (jar.get(GATE)?.value ?? "").split(",").includes(streamId);
}

export async function acknowledge(streamId: string) {
  const jar = await cookies();
  const ids = new Set((jar.get(GATE)?.value ?? "").split(",").filter(Boolean));
  ids.add(streamId);
  jar.set(GATE, [...ids].slice(-40).join(","), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function hasJoined(streamId: string) {
  const jar = await cookies();
  return (jar.get(JOINED)?.value ?? "").split(",").includes(streamId);
}

export async function markJoined(streamId: string) {
  const jar = await cookies();
  const ids = (jar.get(JOINED)?.value ?? "").split(",").filter(Boolean);
  if (ids.includes(streamId)) return;
  ids.push(streamId);
  jar.set(JOINED, ids.slice(-80).join(","), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}
