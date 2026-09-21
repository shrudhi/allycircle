import { eq, or } from "drizzle-orm";
import { requireMarketplaceUser } from "@/lib/auth/session";
import { getDb, getNow } from "@/lib/db";
import {
  conversationReads,
  conversations,
  messages,
  notifications,
  practiceRequests,
  practiceSessions,
} from "@/lib/db/schema";

export async function getAttentionCounts() {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const now = await getNow();

  const notes = await db.select().from(notifications).where(eq(notifications.userId, current.id));
  const unreadNotifications = notes.filter((row) => !row.readAt).length;

  const threads = await db
    .select()
    .from(conversations)
    .where(or(eq(conversations.userLowId, current.id), eq(conversations.userHighId, current.id))!);
  const reads = await db.select().from(conversationReads).where(eq(conversationReads.userId, current.id));
  const readMap = new Map(reads.map((row) => [row.conversationId, row.lastReadAt]));
  const allMessages = await db.select().from(messages);
  let unreadMessages = 0;
  const unreadByOther = new Set<string>();
  for (const thread of threads) {
    const otherId = thread.userLowId === current.id ? thread.userHighId : thread.userLowId;
    const lastRead = readMap.get(thread.id);
    const incoming = allMessages.filter(
      (row) => row.conversationId === thread.id && row.senderId !== current.id
    );
    const unread = incoming.some((row) => !lastRead || row.createdAt.getTime() > lastRead.getTime());
    if (unread) {
      unreadMessages += 1;
      unreadByOther.add(otherId);
    }
  }

  const requests = await db
    .select()
    .from(practiceRequests)
    .where(or(eq(practiceRequests.requesterId, current.id), eq(practiceRequests.receiverId, current.id))!);
  const sessions = await db
    .select()
    .from(practiceSessions)
    .where(or(eq(practiceSessions.requesterId, current.id), eq(practiceSessions.receiverId, current.id))!);

  const receivedAction = requests.filter((row) => {
    if (row.receiverId !== current.id) return false;
    if (["pending", "alternate_time_proposed", "time_unavailable"].includes(row.state)) return true;
    if (row.pendingTwoWayBy && row.pendingTwoWayBy !== current.id && row.state === "pending") return true;
    return false;
  });
  const sentAction = requests.filter((row) => {
    if (row.requesterId !== current.id) return false;
    if (["alternate_time_proposed", "time_unavailable"].includes(row.state)) return true;
    if (row.pendingTwoWayBy && row.pendingTwoWayBy !== current.id) return true;
    return false;
  });
  const sessionAction = sessions.filter((row) => {
    if (row.state === "awaiting_attendance") return true;
    if (row.pendingRescheduleStartUtc && row.pendingRescheduleBy && row.pendingRescheduleBy !== current.id) {
      return true;
    }
    if (row.pendingTwoWayBy && row.pendingTwoWayBy !== current.id && row.state === "scheduled") return true;
    return false;
  });

  const practiceAction = receivedAction.length + sentAction.length + sessionAction.length;

  return {
    unreadMessages,
    unreadNotifications,
    receivedAction: receivedAction.length,
    sentAction: sentAction.length,
    practiceAction,
    unreadByOther,
    now,
  };
}
