import { eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { analyticsEvents } from "@/lib/analytics/taxonomy";
import { markMeaningful, notify, track } from "@/lib/analytics/track";
import { requireMarketplaceUser } from "@/lib/auth/session";
import { getDb, getNow } from "@/lib/db";
import {
  practiceRequests,
  practiceSessions,
  profiles,
  requestEvents,
  user,
} from "@/lib/db/schema";
import { generateBookableSlots } from "@/lib/domain/availability";
import { canInterview, canOfferReciprocalSwap } from "@/lib/domain/eligibility";
import {
  convertedOneWayTimes,
  rangesOverlap,
  sessionDurationMinutes,
} from "@/lib/domain/scheduling";
import { isRequestExpired, requestExpiryAt, type RequestFormat } from "@/lib/domain/types";
import { enqueueJob, processJobs, scheduleSessionReminders } from "@/lib/server/jobs";
import { activeSessionBusyRanges, calendarBusyRanges, pairAllowed } from "@/lib/server/safety";

async function eligibilityPair(requesterId: string, receiverId: string) {
  const db = await getDb();
  const [requester] = await db.select().from(profiles).where(eq(profiles.userId, requesterId));
  const [receiver] = await db.select().from(profiles).where(eq(profiles.userId, receiverId));
  if (!requester || !receiver) throw new Error("We couldn’t find that ally.");
  const allowed = await pairAllowed(requesterId, receiverId);
  const requesterPerson = {
    id: requesterId,
    fieldId: requester.fieldId,
    fieldCustom: requester.fieldCustom,
    experienceYears: requester.experienceYears,
    openToBeInterviewed: requester.openToBeInterviewed,
    openToInterviewOthers: requester.openToInterviewOthers,
  };
  const receiverPerson = {
    id: receiverId,
    fieldId: receiver.fieldId,
    fieldCustom: receiver.fieldCustom,
    experienceYears: receiver.experienceYears,
    openToBeInterviewed: receiver.openToBeInterviewed,
    openToInterviewOthers: receiver.openToInterviewOthers,
  };
  return { requester, receiver, requesterPerson, receiverPerson, allowed };
}

export async function listSlotsForAlly(
  allyId: string,
  format: RequestFormat,
  opts?: { excludeSessionId?: string }
) {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const now = await getNow();
  const [ally] = await db.select().from(profiles).where(eq(profiles.userId, allyId));
  if (!ally) throw new Error("We couldn’t find that ally.");
  const { availabilityWindows } = await import("@/lib/db/schema");
  const windows = await db
    .select()
    .from(availabilityWindows)
    .where(eq(availabilityWindows.userId, allyId));
  const busy = [
    ...(await activeSessionBusyRanges(allyId, opts?.excludeSessionId)),
    ...(await activeSessionBusyRanges(current.id, opts?.excludeSessionId)),
    ...(await calendarBusyRanges(allyId)),
  ];
  return generateBookableSlots({
    windows,
    timezone: ally.timezone,
    format,
    now,
    busy,
  }).slice(0, 24);
}

export async function createPracticeRequest(input: {
  allyId: string;
  format: RequestFormat;
  message?: string;
  startIso?: string;
}) {
  const current = await requireMarketplaceUser();
  const { receiver, requesterPerson, receiverPerson, allowed } = await eligibilityPair(
    current.id,
    input.allyId
  );
  if (!canInterview(receiverPerson, requesterPerson, allowed)) {
    throw new Error("This ally is taking a break from new requests.");
  }
  if (input.format === "reciprocal_swap" && !canOfferReciprocalSwap(requesterPerson, receiverPerson, allowed)) {
    throw new Error("A reciprocal swap isn’t available with this ally.");
  }
  const db = await getDb();
  const now = await getNow();
  let proposedStartUtc = input.startIso ? new Date(input.startIso) : null;
  let proposedEndUtc = proposedStartUtc
    ? new Date(proposedStartUtc.getTime() + sessionDurationMinutes(input.format) * 60 * 1000)
    : null;
  const id = nanoid();
  await db.insert(practiceRequests).values({
    id,
    requesterId: current.id,
    receiverId: input.allyId,
    format: input.format,
    state: "pending",
    message: input.message || null,
    proposedStartUtc,
    proposedEndUtc,
    expiresAt: requestExpiryAt({ createdAt: now, proposedStartUtc }),
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(requestEvents).values({
    id: nanoid(),
    requestId: id,
    actorId: current.id,
    toState: "pending",
    createdAt: now,
  });
  const [receiverUser] = await db.select().from(user).where(eq(user.id, input.allyId));
  await notify({
    userId: input.allyId,
    type: "new_request",
    title: `${current.profile.fullName} sent a practice request`,
    body:
      input.format === "reciprocal_swap"
        ? "They’d like a 60-minute reciprocal swap."
        : "They’d like you to interview them for 30 minutes.",
    href: `/practice/requests/${id}`,
    email: receiverUser
      ? { to: receiverUser.email, subject: "You have a new AllyCircle practice request" }
      : undefined,
  });
  await markMeaningful(current.id);
  await track(analyticsEvents.request_created, {
    userId: current.id,
    properties: { format: input.format, hasTime: Boolean(proposedStartUtc) },
  });
  return { id };
}

async function loadRequestForParticipant(requestId: string, userId: string) {
  const db = await getDb();
  const [request] = await db
    .select()
    .from(practiceRequests)
    .where(eq(practiceRequests.id, requestId));
  if (!request) throw new Error("We couldn’t find that request.");
  if (request.requesterId !== userId && request.receiverId !== userId) {
    throw new Error("You don’t have access to that request.");
  }
  return request;
}

export async function respondToRequest(input: {
  requestId: string;
  action: "accept" | "convert" | "decline" | "cancel" | "propose";
  startIso?: string;
}) {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const now = await getNow();
  const request = await loadRequestForParticipant(input.requestId, current.id);

  if (["accepted", "converted_to_one_way", "declined", "cancelled", "expired"].includes(request.state)) {
    return { ok: false as const, message: "This request was already updated. Here’s the latest status.", state: request.state };
  }
  if (isRequestExpired({ createdAt: request.createdAt, proposedStartUtc: request.proposedStartUtc, now })) {
    await db.update(practiceRequests).set({ state: "expired", updatedAt: now }).where(eq(practiceRequests.id, request.id));
    await track(analyticsEvents.request_expired, { userId: current.id });
    return { ok: false as const, message: "This request has expired. You can send a new one anytime.", state: "expired" };
  }

  if (input.action === "cancel") {
    if (request.requesterId !== current.id) throw new Error("Only the sender can withdraw this request.");
    await db.update(practiceRequests).set({ state: "cancelled", updatedAt: now }).where(eq(practiceRequests.id, request.id));
    await notify({
      userId: request.receiverId,
      type: "request_cancelled",
      title: "A practice request was withdrawn",
      body: "No action needed — you can keep practicing with other allies.",
      href: "/practice/requests",
    });
    await track(analyticsEvents.request_cancelled, { userId: current.id });
    return { ok: true as const, state: "cancelled" };
  }

  if (input.action === "decline") {
    if (request.receiverId !== current.id) throw new Error("Only the recipient can decline this request.");
    await db.update(practiceRequests).set({ state: "declined", updatedAt: now }).where(eq(practiceRequests.id, request.id));
    await notify({
      userId: request.requesterId,
      type: "request_declined",
      title: "This ally can’t take the request right now",
      body: "You can message them or find another ally when you’re ready.",
      href: "/allies",
    });
    await track(analyticsEvents.request_declined, { userId: current.id });
    return { ok: true as const, state: "declined" };
  }

  if (input.action === "propose") {
    if (!input.startIso) throw new Error("Choose a time to propose.");
    const format = request.format as RequestFormat;
    const start = new Date(input.startIso);
    const end = new Date(start.getTime() + sessionDurationMinutes(format) * 60 * 1000);
    await db
      .update(practiceRequests)
      .set({
        state: "alternate_time_proposed",
        proposedStartUtc: start,
        proposedEndUtc: end,
        updatedAt: now,
      })
      .where(eq(practiceRequests.id, request.id));
    const other = current.id === request.requesterId ? request.receiverId : request.requesterId;
    await notify({
      userId: other,
      type: "time_proposed",
      title: "A new time was suggested",
      body: "Take a look and confirm if this works, or suggest another time.",
      href: `/practice/requests/${request.id}`,
    });
    await track(analyticsEvents.request_time_proposed, { userId: current.id });
    return { ok: true as const, state: "alternate_time_proposed" };
  }

  if (input.action === "accept" || input.action === "convert") {
    if (request.receiverId !== current.id && request.state !== "alternate_time_proposed") {
      if (request.requesterId !== current.id) throw new Error("You can’t confirm this request.");
    }
    let format = request.format as RequestFormat;
    let start = request.proposedStartUtc;
    if (!start) throw new Error("A time still needs to be agreed before this can be confirmed.");
    let end = request.proposedEndUtc || new Date(start.getTime() + sessionDurationMinutes(format) * 60 * 1000);
    let state: "accepted" | "converted_to_one_way" = "accepted";
    if (input.action === "convert") {
      if (request.format !== "reciprocal_swap") throw new Error("There’s no swap to convert.");
      const times = convertedOneWayTimes(start);
      start = times.startUtc;
      end = times.endUtc;
      format = "interview_me";
      state = "converted_to_one_way";
    }

    const busy = [
      ...(await activeSessionBusyRanges(request.requesterId)),
      ...(await activeSessionBusyRanges(request.receiverId)),
      ...(await calendarBusyRanges(request.requesterId)),
      ...(await calendarBusyRanges(request.receiverId)),
    ];
    const conflict = busy.some((range) => rangesOverlap(start, end, range.start, range.end));
    if (conflict) {
      await db
        .update(practiceRequests)
        .set({ state: "time_unavailable", updatedAt: now })
        .where(eq(practiceRequests.id, request.id));
      await notify({
        userId: request.requesterId,
        type: "time_unavailable",
        title: "That time was just booked",
        body: "Here are the next options — pick another time that still works.",
        href: `/practice/requests/${request.id}`,
      });
      await notify({
        userId: request.receiverId,
        type: "time_unavailable",
        title: "That time is no longer free",
        body: "Please suggest another time so you can still practice together.",
        href: `/practice/requests/${request.id}`,
      });
      await track(analyticsEvents.booking_time_unavailable, { userId: current.id });
      return {
        ok: false as const,
        message: "That time was just booked. Here are the next options.",
        state: "time_unavailable",
      };
    }

    try {
      const sessionId = nanoid();
      await db.transaction(async (tx) => {
        const existing = await tx.select().from(practiceSessions);
        const overlap = existing
          .filter((row) => row.state === "scheduled" || row.state === "awaiting_attendance")
          .filter(
            (row) =>
              row.requesterId === request.requesterId ||
              row.receiverId === request.requesterId ||
              row.requesterId === request.receiverId ||
              row.receiverId === request.receiverId
          )
          .some((row) => rangesOverlap(start!, end, row.startUtc, row.endUtc));
        if (overlap) {
          throw new Error("TIME_UNAVAILABLE");
        }
        await tx.insert(practiceSessions).values({
          id: sessionId,
          requestId: request.id,
          requesterId: request.requesterId,
          receiverId: request.receiverId,
          interviewerId: request.receiverId,
          candidateId: request.requesterId,
          format,
          startUtc: start!,
          endUtc: end,
          state: "scheduled",
          meetProvisionState: "pending",
          createdAt: now,
          updatedAt: now,
        });
        await tx
          .update(practiceRequests)
          .set({
            state,
            format,
            proposedStartUtc: start,
            proposedEndUtc: end,
            updatedAt: now,
          })
          .where(eq(practiceRequests.id, request.id));
      });
      await enqueueJob("provision_meet", now, `meet:${sessionId}`, { sessionId });
      await scheduleSessionReminders(sessionId, start, end);
      const copy =
        state === "converted_to_one_way"
          ? "The 30-minute one-way session is confirmed for the first half of the original time."
          : "Your practice session is confirmed.";
      await notify({
        userId: request.requesterId,
        type: "session_confirmed",
        title: "You’re on the calendar",
        body: copy,
        href: `/practice/sessions/${sessionId}`,
      });
      await notify({
        userId: request.receiverId,
        type: "session_confirmed",
        title: "You’re on the calendar",
        body: copy,
        href: `/practice/sessions/${sessionId}`,
      });
      await markMeaningful(current.id);
      await track(analyticsEvents.request_accepted, { userId: current.id, properties: { converted: state === "converted_to_one_way" } });
      await track(analyticsEvents.session_confirmed, { userId: current.id });
      await processJobs();
      return { ok: true as const, state, sessionId };
    } catch (error) {
      if (error instanceof Error && error.message === "TIME_UNAVAILABLE") {
        await db
          .update(practiceRequests)
          .set({ state: "time_unavailable", updatedAt: now })
          .where(eq(practiceRequests.id, request.id));
        return {
          ok: false as const,
          message: "That time was just booked. Here are the next options.",
          state: "time_unavailable",
        };
      }
      throw error;
    }
  }

  throw new Error("That action isn’t available.");
}

export async function getRequestDetail(requestId: string) {
  const current = await requireMarketplaceUser();
  const request = await loadRequestForParticipant(requestId, current.id);
  const db = await getDb();
  const otherId = request.requesterId === current.id ? request.receiverId : request.requesterId;
  const [other] = await db.select().from(profiles).where(eq(profiles.userId, otherId));
  return {
    request,
    otherName: other?.fullName || "Ally",
    otherId,
    isReceiver: request.receiverId === current.id,
  };
}

export async function listRequests() {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const now = await getNow();
  const rows = await db
    .select()
    .from(practiceRequests)
    .where(or(eq(practiceRequests.requesterId, current.id), eq(practiceRequests.receiverId, current.id))!);
  for (const row of rows) {
    if (
      ["pending", "alternate_time_proposed"].includes(row.state) &&
      isRequestExpired({ createdAt: row.createdAt, proposedStartUtc: row.proposedStartUtc, now })
    ) {
      await db.update(practiceRequests).set({ state: "expired", updatedAt: now }).where(eq(practiceRequests.id, row.id));
      row.state = "expired";
    }
  }
  const profilesRows = await db.select().from(profiles);
  return rows
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((row) => {
      const otherId = row.requesterId === current.id ? row.receiverId : row.requesterId;
      const other = profilesRows.find((profile) => profile.userId === otherId);
      return {
        ...row,
        direction: row.requesterId === current.id ? "sent" : "received",
        otherName: other?.fullName || "Ally",
      };
    });
}
