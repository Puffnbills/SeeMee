import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { unstable_noStore as noStore } from "next/cache";
import { COLUMNS, SQL_TABLE, TABLE_ORDER, diffById, normalizeRow } from "./schema";
import { createSeed } from "./seed";
import type { Database } from "./types";

const globalForStore = globalThis as unknown as { __seemee?: Database };

function memory(): Database {
  if (!globalForStore.__seemee) globalForStore.__seemee = createSeed();
  return globalForStore.__seemee;
}

export function resetMemory() {
  globalForStore.__seemee = createSeed();
}

export function dataMode(): "memory" | "supabase" {
  const mode = process.env.SEEMEE_DATA_SOURCE ?? "memory";
  if (mode === "memory") return "memory";
  if (mode === "supabase") {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SEEMEE_DATA_SOURCE=supabase requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    }
    return "supabase";
  }
  throw new Error(`Unknown SEEMEE_DATA_SOURCE ${mode}`);
}

function admin(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function blank(): Database {
  return {
    users: [],
    streams: [],
    messages: [],
    follows: [],
    gifts: [],
    giftTransactions: [],
    walletTransactions: [],
    notifications: [],
    reports: [],
    categories: [],
    contentRatings: [],
  };
}

async function loadAll(): Promise<Database> {
  const client = admin();
  const db = blank();
  const buckets: Record<(typeof TABLE_ORDER)[number], unknown[]> = {
    users: db.users,
    streams: db.streams,
    messages: db.messages,
    follows: db.follows,
    giftTransactions: db.giftTransactions,
    walletTransactions: db.walletTransactions,
    notifications: db.notifications,
    reports: db.reports,
    categories: db.categories,
    contentRatings: db.contentRatings,
    gifts: db.gifts,
  };
  await Promise.all(
    TABLE_ORDER.map(async (key) => {
      const { data, error } = await client.from(SQL_TABLE[key]).select("*");
      if (error) throw new Error(error.message);
      const target = buckets[key] as Record<string, unknown>[];
      target.splice(0, target.length);
      for (const row of data ?? []) target.push(normalizeRow(key, row as Record<string, unknown>));
    }),
  );
  return db;
}

async function persistDiff(before: Database, after: Database) {
  const client = admin();
  for (const key of [...TABLE_ORDER].reverse()) {
    const diff = diffById(
      before[key] as Array<{ id: string }>,
      after[key] as Array<{ id: string }>,
    );
    if (diff.deletes.length === 0) continue;
    const { error } = await client.from(SQL_TABLE[key]).delete().in("id", diff.deletes);
    if (error) throw new Error(error.message);
  }
  for (const key of TABLE_ORDER) {
    const diff = diffById(
      before[key] as Array<{ id: string }>,
      after[key] as Array<{ id: string }>,
    );
    if (diff.upserts.length === 0) continue;
    const rows = diff.upserts.map((row) => normalizeRow(key, row as unknown as Record<string, unknown>));
    const { error } = await client.from(SQL_TABLE[key]).upsert(rows);
    if (error) throw new Error(error.message);
  }
}

export async function read<T>(fn: (db: Database) => T): Promise<T> {
  noStore();
  if (dataMode() === "memory") return fn(memory());
  return fn(await loadAll());
}

export async function mutate<T>(fn: (db: Database) => T): Promise<T> {
  noStore();
  if (dataMode() === "memory") return fn(memory());
  const before = await loadAll();
  const draft = structuredClone(before);
  const result = fn(draft);
  await persistDiff(before, draft);
  return result;
}
