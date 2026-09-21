import { and, desc, eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { analyticsEvents } from "@/lib/analytics/taxonomy";
import { markMeaningful, notify, track } from "@/lib/analytics/track";
import { requireMarketplaceUser } from "@/lib/auth/session";
import { getDb, getNow } from "@/lib/db";
import {
  conversations,
  messages,
  notifications,
  practiceSessions,
  profiles,
} from "@/lib/db/schema";
import { attendanceOutcome, isJoinWindowOpen } from "@/lib/domain/scheduling";
import { pairAllowed } from "@/lib/server/safety";

function pairIds(a: string, b: string) {
  return a < b ? [a, b] : [b, a];
}

export async function getOrCreateConversation(otherId: string) {
  const current = await requireMarketplaceUser();
  if (!(await pairAllowed(current.id, otherId))) {
    throw new Error("Messaging isn’t available with this person.");
  }
  const db = await getDb();
  const now = await getNow();
  const [low, high] = pairIds(current.id, otherId);
  const existing = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.userLowId, low), eq(conversations.userHighId, high)));
  if (existing[0]) return existing[0];
  const created = {
    id: nanoid(),
    userLowId: low,
    userHighId: high,
    createdAt: now,
    lastMessageAt: now,
  };
  await db.insert(conversations).values(created);
  return created;
}

export async function sendMessage(otherId: string, body: string) {
  const current = await requireMarketplaceUser();
  const text = body.trim();
  if (!text) throw new Error("Write a message first.");
  if (text.length > 4000) throw new Error("Please keep messages a little shorter.");
  if (!(await pairAllowed(current.id, otherId))) {
    throw new Error("You can’t send a new message to this person.");
  }
  const conversation = await getOrCreateConversation(otherId);
  const db = await getDb();
  const now = await getNow();
  await db.insert(messages).values({
    id: nanoid(),
    conversationId: conversation.id,
    senderId: current.id,
    body: text,
    createdAt: now,
  });
  await db
    .update(conversations)
    .set({ lastMessageAt: now })
    .where(eq(conversations.id, conversation.id));
  await markMeaningful(current.id);
  await track(analyticsEvents.message_sent, { userId: current.id });
  await notify({
    userId: otherId,
    type: "message",
    title: `${current.profile.fullName} sent you a message`,
    body: "Open Messages to continue the conversation.",
    href: `/messages/${conversation.id}`,
  });
  return { conversationId: conversation.id };
}

export async function listConversations() {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const rows = await db
    .select()
    .from(conversations)
    .where(or(eq(conversations.userLowId, current.id), eq(conversations.userHighId, current.id))!);
  const people = await db.select().from(profiles);
  return rows
    .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
    .map((row) => {
      const otherId = row.userLowId === current.id ? row.userHighId : row.userLowId;
      return {
        ...row,
        otherId,
        otherName: people.find((profile) => profile.userId === otherId)?.fullName || "Ally",
      };
    });
}

export async function listMessages(conversationId: string) {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId));
  if (!conversation || (conversation.userLowId !== current.id && conversation.userHighId !== current.id)) {
    throw new Error("You don’t have access to this conversation.");
  }
  const otherId = conversation.userLowId === current.id ? conversation.userHighId : conversation.userLowId;
  const blocked = !(await pairAllowed(current.id, otherId));
  const people = await db.select().from(profiles);
  const thread = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
  return {
    conversationId,
    otherId,
    otherName: people.find((profile) => profile.userId === otherId)?.fullName || "Ally",
    canReply: !blocked,
    messages: thread,
  };
}

export async function listMySessions() {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const now = await getNow();
  const rows = await db
    .select()
    .from(practiceSessions)
    .where(or(eq(practiceSessions.requesterId, current.id), eq(practiceSessions.receiverId, current.id))!);
  const people = await db.select().from(profiles);
  return rows
    .sort((a, b) => b.startUtc.getTime() - a.startUtc.getTime())
    .map((row) => {
      const otherId = row.requesterId === current.id ? row.receiverId : row.requesterId;
      return {
        ...row,
        otherName: people.find((profile) => profile.userId === otherId)?.fullName || "Ally",
        otherId,
        joinOpen: isJoinWindowOpen({ startUtc: row.startUtc, endUtc: row.endUtc, now }),
        isPast: row.endUtc.getTime() < now.getTime(),
      };
    });
}

export async function getSessionDetail(sessionId: string) {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const now = await getNow();
  const [session] = await db.select().from(practiceSessions).where(eq(practiceSessions.id, sessionId));
  if (!session || (session.requesterId !== current.id && session.receiverId !== current.id)) {
    throw new Error("You don’t have access to this session.");
  }
  const people = await db.select().from(profiles);
  const otherId = session.requesterId === current.id ? session.receiverId : session.requesterId;
  const joinOpen = isJoinWindowOpen({ startUtc: session.startUtc, endUtc: session.endUtc, now });
  return {
    session,
    otherName: people.find((profile) => profile.userId === otherId)?.fullName || "Ally",
    otherId,
    joinOpen,
    canSeeMeet: Boolean(session.meetUrl) && session.meetProvisionState === "ready",
    myAttendance:
      session.requesterId === current.id ? session.requesterAttendance : session.receiverAttendance,
  };
}

export async function joinSession(sessionId: string) {
  const detail = await getSessionDetail(sessionId);
  if (!detail.joinOpen) {
    throw new Error("Join Session isn’t available yet. It opens 15 minutes before the start time.");
  }
  if (!detail.session.meetUrl) {
    throw new Error("Your session is confirmed. We’re preparing the room.");
  }
  await track(analyticsEvents.session_join_clicked, { userId: detail.session.requesterId });
  return { url: detail.session.meetUrl };
}

export async function recordAttendance(sessionId: string, happened: "yes" | "no") {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const now = await getNow();
  const [session] = await db.select().from(practiceSessions).where(eq(practiceSessions.id, sessionId));
  if (!session || (session.requesterId !== current.id && session.receiverId !== current.id)) {
    throw new Error("You don’t have access to this session.");
  }
  const patch =
    session.requesterId === current.id
      ? { requesterAttendance: happened }
      : { receiverAttendance: happened };
  const requester = session.requesterId === current.id ? happened : session.requesterAttendance;
  const receiver = session.receiverId === current.id ? happened : session.receiverAttendance;
  const outcome = attendanceOutcome(
    (requester as "yes" | "no" | null) || null,
    (receiver as "yes" | "no" | null) || null
  );
  await db
    .update(practiceSessions)
    .set({ ...patch, state: outcome === "awaiting_attendance" ? "awaiting_attendance" : outcome, updatedAt: now })
    .where(eq(practiceSessions.id, sessionId));
  await track(analyticsEvents.session_attendance_recorded, {
    userId: current.id,
    properties: { happened },
  });
  if (outcome === "completed") {
    await track(analyticsEvents.session_completed, { userId: current.id });
  }
  if (outcome === "did_not_happen") {
    await track(analyticsEvents.session_did_not_happen, { userId: current.id });
  }
  return { outcome };
}

export async function cancelSession(sessionId: string) {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const now = await getNow();
  const [session] = await db.select().from(practiceSessions).where(eq(practiceSessions.id, sessionId));
  if (!session || (session.requesterId !== current.id && session.receiverId !== current.id)) {
    throw new Error("You don’t have access to this session.");
  }
  await db
    .update(practiceSessions)
    .set({ state: "cancelled", updatedAt: now })
    .where(eq(practiceSessions.id, sessionId));
  const other = session.requesterId === current.id ? session.receiverId : session.requesterId;
  await notify({
    userId: other,
    type: "session_cancelled",
    title: "A practice session was cancelled",
    body: "The time is free again. You can still message each other if you’d like to reschedule.",
    href: "/practice",
  });
  await track(analyticsEvents.session_cancelled, { userId: current.id });
}

export async function listNotifications() {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, current.id))
    .orderBy(desc(notifications.createdAt));
}

export async function markNotificationsRead() {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const now = await getNow();
  await db.update(notifications).set({ readAt: now }).where(eq(notifications.userId, current.id));
}
