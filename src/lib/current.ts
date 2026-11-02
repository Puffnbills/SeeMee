import "server-only";
import { read } from "./db";
import { getSessionUserId } from "./session";
import type { User } from "./types";

export async function getCurrentUser(): Promise<User | null> {
  const id = await getSessionUserId();
  if (!id) return null;
  return read((db) => {
    const user = db.users.find((item) => item.id === id);
    if (!user || user.banned) return null;
    return structuredClone(user);
  });
}
