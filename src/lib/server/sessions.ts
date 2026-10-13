import { and, desc, eq, inArray, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { analyticsEvents } from "@/lib/analytics/taxonomy";
import { markMeaningful, notify, track } from "@/lib/analytics/track";
import { requireMarketplaceUser } from "@/lib/auth/session";
import { productConfig } from "@/lib/config/product";
import { getDb, getNow } from "@/lib/db";
import {
  conversations,
  conversationReads,
  messages,
  notifications,
  practiceSessions,
  profiles,
  superLikes,
  feedback,
  testimonials,
  requestEvents,
  practiceRequests,
} from "@/lib/db/schema";
import {
  attendanceOutcome,
  interviewerIdsForCompletedSession,
  isJoinWindowOpen,
  rangesOverlap,
  sessionDurationMinutes,
  twoWayEndFromStart,
} from "@/lib/domain/scheduling";
import type { RequestFormat } from "@/lib/domain/types";
import { enqueueJob, processJobs, scheduleSessionReminders } from "@/lib/server/jobs";
import { displayName, loadProfilesByIds } from "@/lib/server/people";
import { activeSessionBusyRanges, calendarBusyRanges, pairAllowed } from "@/lib/server/safety";

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
    href: `/messages?id=${conversation.id}`,
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
  const otherIds = rows.map((row) => (row.userLowId === current.id ? row.userHighId : row.userLowId));
  const people = await loadProfilesByIds(otherIds);
  const reads = await db.select().from(conversationReads).where(eq(conversationReads.userId, current.id));
  const readMap = new Map(reads.map((row) => [row.conversationId, row.lastReadAt]));
  const threadMessages = rows.length
    ? await db
        .select()
        .from(messages)
        .where(inArray(messages.conversationId, rows.map((row) => row.id)))
    : [];
  return rows
    .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
    .map((row) => {
      const otherId = row.userLowId === current.id ? row.userHighId : row.userLowId;
      const lastRead = readMap.get(row.id);
      const unread = threadMessages.some(
        (message) =>
          message.conversationId === row.id &&
          message.senderId !== current.id &&
          (!lastRead || message.createdAt.getTime() > lastRead.getTime())
      );
      const last = threadMessages
        .filter((message) => message.conversationId === row.id)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      return {
        ...row,
        otherId,
        otherName: displayName(people, otherId),
        unread,
        lastPreview: last?.body || "",
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
  const people = await loadProfilesByIds([otherId]);
  const thread = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
  const now = await getNow();
  try {
    await db
      .insert(conversationReads)
      .values({ userId: current.id, conversationId, lastReadAt: now })
      .onConflictDoUpdate({
        target: [conversationReads.userId, conversationReads.conversationId],
        set: { lastReadAt: now },
      });
  } catch {
    /* unread state is best-effort in local preview */
  }
  return {
    conversationId,
    otherId,
    otherName: displayName(people, otherId),
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
  const people = await loadProfilesByIds(
    rows.map((row) => (row.requesterId === current.id ? row.receiverId : row.requesterId))
  );
  return rows
    .sort((a, b) => b.startUtc.getTime() - a.startUtc.getTime())
    .map((row) => {
      const otherId = row.requesterId === current.id ? row.receiverId : row.requesterId;
      return {
        ...row,
        otherName: displayName(people, otherId),
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
  const otherId = session.requesterId === current.id ? session.receiverId : session.requesterId;
  const people = await loadProfilesByIds([otherId]);
  const joinOpen = isJoinWindowOpen({ startUtc: session.startUtc, endUtc: session.endUtc, now });
  const likes = await db.select().from(superLikes).where(eq(superLikes.sessionId, sessionId));
  const alreadySuperLiked = likes.some((row) => row.fromUserId === current.id);
  const interviewers = interviewerIdsForCompletedSession({
    format: session.format as RequestFormat,
    interviewerId: session.interviewerId,
    requesterId: session.requesterId,
    receiverId: session.receiverId,
  });
  return {
    session,
    otherName: displayName(people, otherId),
    otherId,
    joinOpen,
    isPast: session.endUtc.getTime() <= now.getTime(),
    canSeeMeet: Boolean(session.meetUrl) && session.meetProvisionState === "ready",
    myAttendance:
      session.requesterId === current.id ? session.requesterAttendance : session.receiverAttendance,
    iProposedReschedule: session.pendingRescheduleBy === current.id,
    canRespondToReschedule: Boolean(
      session.pendingRescheduleStartUtc && session.pendingRescheduleBy && session.pendingRescheduleBy !== current.id
    ),
    canProposeReschedule: session.state === "scheduled" && session.startUtc.getTime() > now.getTime(),
    canSuperLike: session.state === "completed" && interviewers.includes(current.id) && !alreadySuperLiked,
    alreadySuperLiked,
    pendingTwoWay: Boolean(session.pendingTwoWayBy),
    iProposedTwoWay: session.pendingTwoWayBy === current.id,
    canRespondToTwoWay: Boolean(session.pendingTwoWayBy && session.pendingTwoWayBy !== current.id && session.state === "scheduled" && session.format === "interview_me"),
    canProposeTwoWay: session.state === "scheduled" && session.format === "interview_me" && !session.pendingTwoWayBy,
  };
}

async function assertSessionTimeFree(
  requesterId: string,
  receiverId: string,
  start: Date,
  end: Date,
  excludeSessionId: string
) {
  const busy = [
    ...(await activeSessionBusyRanges(requesterId, excludeSessionId)),
    ...(await activeSessionBusyRanges(receiverId, excludeSessionId)),
    ...(await calendarBusyRanges(requesterId)),
    ...(await calendarBusyRanges(receiverId)),
  ];
  if (busy.some((range) => rangesOverlap(start, end, range.start, range.end))) {
    throw new Error("That time was just booked. Pick another time that still works.");
  }
}

export async function proposeReschedule(sessionId: string, startIso: string) {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const now = await getNow();
  const [session] = await db.select().from(practiceSessions).where(eq(practiceSessions.id, sessionId));
  if (!session || (session.requesterId !== current.id && session.receiverId !== current.id)) {
    throw new Error("You don’t have access to this session.");
  }
  if (session.state !== "scheduled") {
    throw new Error("You can only reschedule a confirmed upcoming session.");
  }
  if (session.startUtc.getTime() <= now.getTime()) {
    throw new Error("This session has already started. Confirm attendance after it ends, or cancel if you need to.");
  }
  if (!startIso) throw new Error("Choose a new time.");
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) throw new Error("That time doesn’t look valid.");
  const end = new Date(
    start.getTime() + sessionDurationMinutes(session.format as RequestFormat) * 60 * 1000
  );
  const earliest = new Date(now.getTime() + productConfig.minNoticeHours * 60 * 60 * 1000);
  if (start.getTime() < earliest.getTime()) {
    throw new Error("Please pick a time at least 24 hours from now.");
  }
  await assertSessionTimeFree(session.requesterId, session.receiverId, start, end, session.id);
  await db
    .update(practiceSessions)
    .set({
      pendingRescheduleStartUtc: start,
      pendingRescheduleBy: current.id,
      updatedAt: now,
    })
    .where(eq(practiceSessions.id, sessionId));
  const other = session.requesterId === current.id ? session.receiverId : session.requesterId;
  await notify({
    userId: other,
    type: "reschedule_proposed",
    title: "A new time was suggested for your session",
    body: "The original time stays until you accept. Confirm if this works, or keep the current time.",
    href: `/practice/sessions/${sessionId}`,
  });
}

export async function respondToReschedule(sessionId: string, action: "accept" | "decline") {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const now = await getNow();
  const [session] = await db.select().from(practiceSessions).where(eq(practiceSessions.id, sessionId));
  if (!session || (session.requesterId !== current.id && session.receiverId !== current.id)) {
    throw new Error("You don’t have access to this session.");
  }
  if (!session.pendingRescheduleStartUtc || !session.pendingRescheduleBy) {
    throw new Error("There’s no pending time change on this session.");
  }
  if (session.pendingRescheduleBy === current.id) {
    throw new Error("Wait for your ally to respond, or suggest a different time.");
  }
  const other = session.pendingRescheduleBy;
  if (action === "decline") {
    await db
      .update(practiceSessions)
      .set({ pendingRescheduleStartUtc: null, pendingRescheduleBy: null, updatedAt: now })
      .where(eq(practiceSessions.id, sessionId));
    await notify({
      userId: other,
      type: "reschedule_declined",
      title: "Your ally is keeping the original time",
      body: "The session stays on the calendar as originally confirmed. You can still suggest another time.",
      href: `/practice/sessions/${sessionId}`,
    });
    return;
  }
  const start = session.pendingRescheduleStartUtc;
  const end = new Date(
    start.getTime() + sessionDurationMinutes(session.format as RequestFormat) * 60 * 1000
  );
  await assertSessionTimeFree(session.requesterId, session.receiverId, start, end, session.id);
  await db
    .update(practiceSessions)
    .set({
      startUtc: start,
      endUtc: end,
      pendingRescheduleStartUtc: null,
      pendingRescheduleBy: null,
      updatedAt: now,
    })
    .where(eq(practiceSessions.id, sessionId));
  await scheduleSessionReminders(sessionId, start, end);
  if (session.meetProvisionState !== "ready") {
    await enqueueJob("provision_meet", now, `meet:${sessionId}:${start.toISOString()}`, { sessionId });
    await processJobs();
  }
  for (const userId of [session.requesterId, session.receiverId]) {
    await notify({
      userId,
      type: "session_rescheduled",
      title: "Your practice session moved",
      body: "The same session is confirmed for the new time. Join Session still opens 15 minutes before it starts.",
      href: `/practice/sessions/${sessionId}`,
    });
  }
  await track(analyticsEvents.session_rescheduled, { userId: current.id });
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

export async function superLikeAlly(sessionId: string) {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const now = await getNow();
  const [session] = await db.select().from(practiceSessions).where(eq(practiceSessions.id, sessionId));
  if (!session || session.state !== "completed") {
    throw new Error("You can highlight a profile after you both confirm the session happened.");
  }
  if (session.requesterId !== current.id && session.receiverId !== current.id) {
    throw new Error("You don’t have access to this session.");
  }
  const interviewers = interviewerIdsForCompletedSession({
    format: session.format as RequestFormat,
    interviewerId: session.interviewerId,
    requesterId: session.requesterId,
    receiverId: session.receiverId,
  });
  if (!interviewers.includes(current.id)) {
    throw new Error("Only the person who ran the interview can highlight this profile.");
  }
  const toUserId = session.requesterId === current.id ? session.receiverId : session.requesterId;
  await db
    .insert(superLikes)
    .values({
      id: nanoid(),
      sessionId,
      fromUserId: current.id,
      toUserId,
      createdAt: now,
    })
    .onConflictDoNothing();
  await notify({
    userId: toUserId,
    type: "super_like",
    title: `${current.profile.fullName} highlighted your profile`,
    body: "They marked you as someone they’d gladly practice with again. You can show this on your profile.",
    href: "/record",
  });
  await track(analyticsEvents.super_like_given, { userId: current.id });
}

export async function proposeSessionTwoWay(sessionId: string) {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const now = await getNow();
  const [session] = await db.select().from(practiceSessions).where(eq(practiceSessions.id, sessionId));
  if (!session || (session.requesterId !== current.id && session.receiverId !== current.id)) {
    throw new Error("You don’t have access to this session.");
  }
  if (session.state !== "scheduled" || session.format !== "interview_me") {
    throw new Error("Two-way can only be added to a confirmed 30-minute Interview Me session.");
  }
  await db
    .update(practiceSessions)
    .set({ pendingTwoWayBy: current.id, updatedAt: now })
    .where(eq(practiceSessions.id, sessionId));
  const other = session.requesterId === current.id ? session.receiverId : session.requesterId;
  await notify({
    userId: other,
    type: "two_way_proposed",
    title: `${current.profile.fullName} suggested adding a two-way segment`,
    body: "The original 30 minutes stay. Confirm if you also want the extra 30 minutes after, so you take turns.",
    href: `/practice/sessions/${sessionId}`,
  });
}

export async function respondSessionTwoWay(sessionId: string, action: "accept" | "decline") {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const now = await getNow();
  const [session] = await db.select().from(practiceSessions).where(eq(practiceSessions.id, sessionId));
  if (!session || (session.requesterId !== current.id && session.receiverId !== current.id)) {
    throw new Error("You don’t have access to this session.");
  }
  if (!session.pendingTwoWayBy || session.pendingTwoWayBy === current.id) {
    throw new Error("There’s no two-way proposal waiting for you.");
  }
  const other = session.pendingTwoWayBy;
  if (action === "decline") {
    await db
      .update(practiceSessions)
      .set({ pendingTwoWayBy: null, updatedAt: now })
      .where(eq(practiceSessions.id, sessionId));
    await notify({
      userId: other,
      type: "two_way_declined",
      title: "Your ally kept this as a 30-minute Interview Me",
      body: "The original time is unchanged.",
      href: `/practice/sessions/${sessionId}`,
    });
    return;
  }
  const end = twoWayEndFromStart(session.startUtc);
  await assertSessionTimeFree(session.requesterId, session.receiverId, session.endUtc, end, session.id);
  await db
    .update(practiceSessions)
    .set({
      format: "reciprocal_swap",
      endUtc: end,
      pendingTwoWayBy: null,
      updatedAt: now,
    })
    .where(eq(practiceSessions.id, sessionId));
  await scheduleSessionReminders(sessionId, session.startUtc, end);
  if (session.meetProvisionState !== "ready") {
    await enqueueJob("provision_meet", now, `meet:${sessionId}:twoway`, { sessionId });
    await processJobs();
  }
  for (const userId of [session.requesterId, session.receiverId]) {
    await notify({
      userId,
      type: "two_way_confirmed",
      title: "This is now a 60-minute two-way session",
      body: "First 30 minutes: they interview you. Second 30 minutes: you interview them. Same meeting link.",
      href: `/practice/sessions/${sessionId}`,
    });
  }
}

export async function getInteraction(otherId: string) {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const now = await getNow();
  const [other] = await db.select().from(profiles).where(eq(profiles.userId, otherId));
  if (!other) throw new Error("We couldn’t find that person.");
  const pairFilter = or(
    and(eq(practiceRequests.requesterId, current.id), eq(practiceRequests.receiverId, otherId)),
    and(eq(practiceRequests.requesterId, otherId), eq(practiceRequests.receiverId, current.id))
  )!;
  const sessionFilter = or(
    and(eq(practiceSessions.requesterId, current.id), eq(practiceSessions.receiverId, otherId)),
    and(eq(practiceSessions.requesterId, otherId), eq(practiceSessions.receiverId, current.id))
  )!;
  const [requests, sessions] = await Promise.all([
    db.select().from(practiceRequests).where(pairFilter),
    db.select().from(practiceSessions).where(sessionFilter),
  ]);
  const requestIds = requests.map((row) => row.id);
  const events = requestIds.length
    ? await db.select().from(requestEvents).where(inArray(requestEvents.requestId, requestIds))
    : [];
  const relatedFeedback = await db
    .select()
    .from(feedback)
    .where(
      or(
        and(eq(feedback.fromUserId, current.id), eq(feedback.toUserId, otherId)),
        and(eq(feedback.fromUserId, otherId), eq(feedback.toUserId, current.id))
      )!
    );
  const relatedQuotes = await db
    .select()
    .from(testimonials)
    .where(
      or(
        and(eq(testimonials.fromUserId, current.id), eq(testimonials.toUserId, otherId)),
        and(eq(testimonials.fromUserId, otherId), eq(testimonials.toUserId, current.id))
      )!
    );
  let thread = null as Awaited<ReturnType<typeof listMessages>> | null;
  try {
    const conversation = await getOrCreateConversation(otherId);
    thread = await listMessages(conversation.id);
  } catch {
    thread = null;
  }
  const blocked = !(await pairAllowed(current.id, otherId));
  return {
    other,
    otherId,
    otherName: other.fullName,
    blocked,
    requests: requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    sessions: sessions.sort((a, b) => b.startUtc.getTime() - a.startUtc.getTime()),
    events: events.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    feedback: relatedFeedback,
    testimonials: relatedQuotes,
    thread,
    now,
  };
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
