import { and, eq, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { blocks, calendarConnections, practiceSessions, user } from "@/lib/db/schema";

export async function pairAllowed(a: string, b: string) {
  if (a === b) return false;
  const db = await getDb();
  const rows = await db
    .select()
    .from(blocks)
    .where(
      or(
        and(eq(blocks.blockerId, a), eq(blocks.blockedId, b)),
        and(eq(blocks.blockerId, b), eq(blocks.blockedId, a))
      )!
    );
  return rows.length === 0;
}

export async function activeSessionBusyRanges(userId: string, excludeSessionId?: string) {
  const db = await getDb();
  const rows = await db.select().from(practiceSessions).where(
    or(eq(practiceSessions.requesterId, userId), eq(practiceSessions.receiverId, userId))!
  );
  return rows
    .filter((row) => row.state === "scheduled" || row.state === "awaiting_attendance")
    .filter((row) => row.id !== excludeSessionId)
    .map((row) => ({ start: row.startUtc, end: row.endUtc }));
}

export type CalendarBusyState = {
  connected: boolean;
  checked: boolean;
  provider: string | null;
  busy: { start: Date; end: Date }[];
  error?: string;
};

export async function calendarBusyState(
  userId: string,
  now?: Date,
  opts?: { fresh?: boolean }
): Promise<CalendarBusyState> {
  const db = await getDb();
  const [connection] = await db
    .select()
    .from(calendarConnections)
    .where(eq(calendarConnections.userId, userId))
    .limit(1);
  if (!connection || connection.status !== "connected") {
    return { connected: false, checked: true, provider: null, busy: [] };
  }
  if (connection.encryptedRefreshToken || connection.encryptedAccessToken) {
    try {
      const { googleFreeBusyRanges } = await import("@/lib/integrations/google-calendar");
      const busy = await googleFreeBusyRanges(userId, { timeMin: now, skipCache: opts?.fresh });
      return { connected: true, checked: true, provider: connection.provider, busy };
    } catch {
      return {
        connected: true,
        checked: false,
        provider: connection.provider,
        busy: [],
        error: "We couldn’t check Google Calendar. Try again in a moment.",
      };
    }
  }
  if (connection.mockBusyJson) {
    try {
      const parsed = JSON.parse(connection.mockBusyJson) as { start: string; end: string }[];
      return {
        connected: true,
        checked: true,
        provider: connection.provider,
        busy: parsed.map((item) => ({ start: new Date(item.start), end: new Date(item.end) })),
      };
    } catch {
      return {
        connected: true,
        checked: false,
        provider: connection.provider,
        busy: [],
        error: "The connected calendar could not be read.",
      };
    }
  }
  return { connected: true, checked: true, provider: connection.provider, busy: [] };
}

export async function calendarBusyRanges(userId: string, now?: Date) {
  const state = await calendarBusyState(userId, now);
  if (state.connected && !state.checked) {
    throw new Error(state.error || "We couldn’t verify calendar availability.");
  }
  return state.busy;
}

export async function displayUser(userId: string) {
  const db = await getDb();
  const [row] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  return row;
}
