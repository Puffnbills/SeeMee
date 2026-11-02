const buckets = new Map<string, { id: string; emoji: string; at: number }[]>();
const ALLOWED = new Set(["🔥", "👏", "💜", "😂"]);

export function pushReaction(streamId: string, emoji: string) {
  if (!ALLOWED.has(emoji)) return null;
  const now = Date.now();
  const list = (buckets.get(streamId) ?? []).filter((item) => now - item.at < 8000);
  const item = { id: crypto.randomUUID(), emoji, at: now };
  list.push(item);
  buckets.set(streamId, list.slice(-30));
  return item;
}

export function recentReactions(streamId: string) {
  const now = Date.now();
  return (buckets.get(streamId) ?? []).filter((item) => now - item.at < 8000);
}
