import { cache } from "react";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import {
  conversationReads,
  conversations,
  messages,
  notifications,
  practiceRequests,
  practiceSessions,
} from "@/lib/db/schema";

async function loadAttentionCounts() {
  const current = await getSessionUser();
  if (!current?.profile?.onboardingComplete) {
    return {
      unreadMessages: 0,
      unreadNotifications: 0,
      receivedAction: 0,
      sentAction: 0,
      practiceAction: 0,
      unreadByOther: new Set<string>(),
      now: new Date(),
    };
  }
  const db = await getDb();
  const now = new Date();

  const threads = await db
    .select({
      id: conversations.id,
      userLowId: conversations.userLowId,
      userHighId: conversations.userHighId,
    })
    .from(conversations)
    .where(or(eq(conversations.userLowId, current.id), eq(conversations.userHighId, current.id))!);

  const [unreadNotes, reads, requests, sessions] = await Promise.all([
    db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, current.id), isNull(notifications.readAt))),
    db.select().from(conversationReads).where(eq(conversationReads.userId, current.id)),
    db
      .select()
      .from(practiceRequests)
      .where(or(eq(practiceRequests.requesterId, current.id), eq(practiceRequests.receiverId, current.id))!),
    db
      .select()
      .from(practiceSessions)
      .where(or(eq(practiceSessions.requesterId, current.id), eq(practiceSessions.receiverId, current.id))!),
  ]);

  const readMap = new Map(reads.map((row) => [row.conversationId, row.lastReadAt]));
  const unreadByOther = new Set<string>();
  let unreadMessages = 0;
  if (threads.length) {
    const threadMessages = await db
      .select({
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(inArray(messages.conversationId, threads.map((thread) => thread.id)));
    for (const thread of threads) {
      const otherId = thread.userLowId === current.id ? thread.userHighId : thread.userLowId;
      const lastRead = readMap.get(thread.id);
      const unread = threadMessages.some(
        (row) =>
          row.conversationId === thread.id &&
          row.senderId !== current.id &&
          (!lastRead || row.createdAt.getTime() > lastRead.getTime())
      );
      if (unread) {
        unreadMessages += 1;
        unreadByOther.add(otherId);
      }
    }
  }

  const receivedAction = requests.filter((row) => {
    if (row.receiverId !== current.id) return false;
    if (["pending", "alternate_time_proposed", "time_unavailable"].includes(row.state)) return true;
    if (row.pendingTwoWayBy && row.pendingTwoWayBy !== current.id && row.state === "pending") return true;
    return false;
  }).length;
  const sentAction = requests.filter((row) => {
    if (row.requesterId !== current.id) return false;
    if (["alternate_time_proposed", "time_unavailable"].includes(row.state)) return true;
    if (row.pendingTwoWayBy && row.pendingTwoWayBy !== current.id) return true;
    return false;
  }).length;
  const sessionAction = sessions.filter((row) => {
    if (row.state === "awaiting_attendance") return true;
    if (row.pendingRescheduleStartUtc && row.pendingRescheduleBy && row.pendingRescheduleBy !== current.id) {
      return true;
    }
    if (row.pendingTwoWayBy && row.pendingTwoWayBy !== current.id && row.state === "scheduled") return true;
    return false;
  }).length;

  return {
    unreadMessages,
    unreadNotifications: unreadNotes.length,
    receivedAction,
    sentAction,
    practiceAction: receivedAction + sentAction + sessionAction,
    unreadByOther,
    now,
  };
}

export const getAttentionCounts = cache(async () => {
  try {
    return await loadAttentionCounts();
  } catch {
    return {
      unreadMessages: 0,
      unreadNotifications: 0,
      receivedAction: 0,
      sentAction: 0,
      practiceAction: 0,
      unreadByOther: new Set<string>(),
      now: new Date(),
    };
  }
});
