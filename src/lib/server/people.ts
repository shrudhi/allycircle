import { inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

export async function loadProfilesByIds(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map<string, typeof profiles.$inferSelect>();
  const db = await getDb();
  const rows = await db.select().from(profiles).where(inArray(profiles.userId, unique));
  return new Map(rows.map((row) => [row.userId, row]));
}

export function displayName(map: Map<string, { fullName: string }>, userId: string) {
  return map.get(userId)?.fullName || "Ally";
}
