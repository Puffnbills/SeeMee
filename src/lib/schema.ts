export const TABLE_ORDER = [
  "users",
  "categories",
  "contentRatings",
  "gifts",
  "streams",
  "messages",
  "follows",
  "giftTransactions",
  "walletTransactions",
  "notifications",
  "reports",
] as const;

export const SQL_TABLE: Record<(typeof TABLE_ORDER)[number], string> = {
  users: "users",
  categories: "categories",
  contentRatings: "content_ratings",
  gifts: "gifts",
  streams: "streams",
  messages: "chat_messages",
  follows: "follows",
  giftTransactions: "gift_transactions",
  walletTransactions: "wallet_transactions",
  notifications: "notifications",
  reports: "reports",
};

export const COLUMNS: Record<(typeof TABLE_ORDER)[number], readonly string[]> = {
  users: [
    "id",
    "username",
    "display_name",
    "email",
    "avatar",
    "bio",
    "verified",
    "coin_balance",
    "followers_count",
    "following_count",
    "total_streams",
    "total_views",
    "total_revenue",
    "stripe_customer_id",
    "content_filter_enabled",
    "role",
    "created_date",
    "banned",
    "warning_count",
  ],
  categories: ["id", "name", "icon", "active_streams"],
  contentRatings: ["id", "name", "minimum_age", "description"],
  gifts: ["id", "name", "icon", "coin_cost", "animation_url"],
  streams: [
    "id",
    "title",
    "description",
    "category",
    "creator",
    "status",
    "stream_room_id",
    "thumbnail",
    "viewer_count",
    "peak_viewers",
    "total_watch_time",
    "replay_url",
    "content_rating",
    "sensitive_content_warning",
    "includes_nudity",
    "sexual_content",
    "language",
    "location",
    "latitude",
    "longitude",
    "tags",
    "moderation_status",
    "ingest_url",
    "cloudflare_input_id",
    "started_at",
    "ended_at",
  ],
  messages: ["id", "stream", "sender", "message", "created_at", "removed"],
  follows: ["id", "follower", "creator", "created_at"],
  giftTransactions: ["id", "sender", "receiver", "stream", "gift", "coins_spent", "created_at"],
  walletTransactions: ["id", "user", "transaction_type", "coins", "amount", "external_id", "created_at"],
  notifications: ["id", "recipient", "type", "title", "body", "read", "link", "created_at"],
  reports: [
    "id",
    "reporter",
    "reported_user",
    "reported_stream",
    "reported_message",
    "reason",
    "status",
    "created_at",
  ],
};

const NUMERIC = new Set([
  "coin_balance",
  "followers_count",
  "following_count",
  "total_streams",
  "total_views",
  "total_revenue",
  "warning_count",
  "active_streams",
  "minimum_age",
  "coin_cost",
  "viewer_count",
  "peak_viewers",
  "total_watch_time",
  "latitude",
  "longitude",
  "coins_spent",
  "coins",
  "amount",
]);

const ARRAYS = new Set(["tags"]);

export function normalizeRow(table: (typeof TABLE_ORDER)[number], row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const column of COLUMNS[table]) {
    let value = row[column];
    if (value === undefined || value === null) {
      value = ARRAYS.has(column) ? [] : null;
    } else if (NUMERIC.has(column) && typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      value = Number.isFinite(parsed) ? parsed : value;
    }
    out[column] = value;
  }
  return out;
}

export function diffById<T extends { id: string }>(before: T[], after: T[]) {
  const previous = new Map(before.map((row) => [row.id, JSON.stringify(row)]));
  const next = new Map(after.map((row) => [row.id, row]));
  const upserts = [];
  for (const [id, row] of next) {
    if (previous.get(id) !== JSON.stringify(row)) upserts.push(row);
  }
  const deletes = [];
  for (const id of previous.keys()) {
    if (!next.has(id)) deletes.push(id);
  }
  return { upserts, deletes };
}
