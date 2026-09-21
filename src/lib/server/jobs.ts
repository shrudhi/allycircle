import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { analyticsEvents } from "@/lib/analytics/taxonomy";
import { notify, track } from "@/lib/analytics/track";
import { productConfig } from "@/lib/config/product";
import { getDb, getNow } from "@/lib/db";
import { calendarConnections, jobs, practiceSessions, user } from "@/lib/db/schema";

export async function enqueueJob(
  type: string,
  runAt: Date,
  idempotencyKey: string,
  payload: Record<string, unknown>
) {
  const db = await getDb();
  const now = await getNow();
  await db
    .insert(jobs)
    .values({
      id: nanoid(),
      type,
      runAt,
      status: "queued",
      idempotencyKey,
      payloadJson: payload,
      createdAt: now,
    })
    .onConflictDoNothing();
}

export async function scheduleSessionReminders(sessionId: string, startUtc: Date, endUtc: Date) {
  const now = await getNow();
  const db = await getDb();
  const queued = await db.select().from(jobs);
  for (const job of queued) {
    if (job.status === "queued" && job.type === "reminder" && job.payloadJson.sessionId === sessionId) {
      await db.update(jobs).set({ status: "cancelled" }).where(eq(jobs.id, job.id));
    }
  }
  const stamp = startUtc.toISOString();
  await enqueueJob("reminder", new Date(startUtc.getTime() - 24 * 60 * 60 * 1000), `remind-24h:${sessionId}:${stamp}`, {
    sessionId,
    kind: "24h",
    startUtc: stamp,
  });
  await enqueueJob("reminder", new Date(startUtc.getTime() - 60 * 60 * 1000), `remind-1h:${sessionId}:${stamp}`, {
    sessionId,
    kind: "1h",
    startUtc: stamp,
  });
  await enqueueJob(
    "reminder",
    new Date(startUtc.getTime() - productConfig.joinWindowBeforeMinutes * 60 * 1000),
    `remind-15m:${sessionId}:${stamp}`,
    { sessionId, kind: "15m", startUtc: stamp }
  );
  await enqueueJob("reminder", new Date(endUtc.getTime() + 15 * 60 * 1000), `feedback:${sessionId}:${stamp}`, {
    sessionId,
    kind: "feedback",
    startUtc: stamp,
  });
  void now;
}

export async function processJobs() {
  const db = await getDb();
  const now = await getNow();
  const queued = await db.select().from(jobs);
  const due = queued.filter((job) => job.status === "queued" && job.runAt.getTime() <= now.getTime());
  for (const job of due) {
    await db
      .update(jobs)
      .set({ status: "running", attempts: job.attempts + 1 })
      .where(eq(jobs.id, job.id));
    try {
      if (job.type === "provision_meet") {
        await provisionMeet(String(job.payloadJson.sessionId));
      }
      if (job.type === "reminder") {
        await sendReminder(
          String(job.payloadJson.sessionId),
          String(job.payloadJson.kind),
          job.payloadJson.startUtc ? String(job.payloadJson.startUtc) : undefined
        );
      }
      await db.update(jobs).set({ status: "done" }).where(eq(jobs.id, job.id));
    } catch (error) {
      await db
        .update(jobs)
        .set({
          status: job.attempts + 1 >= 5 ? "failed" : "queued",
          lastError: error instanceof Error ? error.message : "unknown",
          runAt: new Date(now.getTime() + 60 * 1000),
        })
        .where(eq(jobs.id, job.id));
    }
  }
}

async function provisionMeet(sessionId: string) {
  const db = await getDb();
  const now = await getNow();
  const [session] = await db.select().from(practiceSessions).where(eq(practiceSessions.id, sessionId));
  if (!session || session.state === "cancelled") return;
  await track(analyticsEvents.meet_provision_started, { properties: { sessionId } });
  const connections = await db.select().from(calendarConnections);
  const requesterCal = connections.find((row) => row.userId === session.requesterId && row.status === "connected");
  const receiverCal = connections.find((row) => row.userId === session.receiverId && row.status === "connected");
  const organizer = requesterCal?.organizerEligible
    ? requesterCal
    : receiverCal?.organizerEligible
      ? receiverCal
      : requesterCal || receiverCal;
  if (!organizer) {
    await db
      .update(practiceSessions)
      .set({ meetProvisionState: "not_applicable", updatedAt: now })
      .where(eq(practiceSessions.id, sessionId));
    await notify({
      userId: session.requesterId,
      type: "connect_calendar",
      title: "Connect Google Calendar to prepare your session room",
      body: "Your session is confirmed. Either of you can connect Calendar so we can create the Google Meet.",
      href: "/settings#calendar",
    });
    await notify({
      userId: session.receiverId,
      type: "connect_calendar",
      title: "Connect Google Calendar to prepare your session room",
      body: "Your session is confirmed. Either of you can connect Calendar so we can create the Google Meet.",
      href: "/settings#calendar",
    });
    return;
  }
  const meetUrl = `https://meet.google.com/ally-${nanoid(8).toLowerCase()}`;
  await db
    .update(practiceSessions)
    .set({
      meetUrl,
      meetProvisionState: "ready",
      calendarEventId: `evt_${nanoid()}`,
      calendarOrganizerUserId: organizer.userId,
      updatedAt: now,
    })
    .where(eq(practiceSessions.id, sessionId));
  await track(analyticsEvents.meet_provision_succeeded, { properties: { sessionId } });
  const people = await db.select().from(user);
  for (const participantId of [session.requesterId, session.receiverId]) {
    const account = people.find((row) => row.id === participantId);
    await notify({
      userId: participantId,
      type: "meet_ready",
      title: "Your session room is ready",
      body: "Google Calendar will include the Meet invite. You can also join from AllyCircle when the session window opens.",
      href: `/practice/sessions/${sessionId}`,
      email: account
        ? { to: account.email, subject: "Your AllyCircle practice session is confirmed" }
        : undefined,
    });
  }
}

async function sendReminder(sessionId: string, kind: string, expectedStart?: string) {
  const db = await getDb();
  const [session] = await db.select().from(practiceSessions).where(eq(practiceSessions.id, sessionId));
  if (!session || session.state === "cancelled") return;
  if (expectedStart && session.startUtc.toISOString() !== expectedStart) return;
  const title =
    kind === "feedback"
      ? "How did practice go?"
      : kind === "15m"
        ? "Your session starts soon"
        : "Practice reminder";
  const body =
    kind === "feedback"
      ? "If you met, confirm the session happened and leave a short note for your ally."
      : kind === "15m"
        ? "Join Session is now available."
        : "Your AllyCircle session is coming up.";
  for (const userId of [session.requesterId, session.receiverId]) {
    await notify({
      userId,
      type: `reminder_${kind}`,
      title,
      body,
      href: kind === "feedback" ? `/practice/sessions/${sessionId}/feedback` : `/practice/sessions/${sessionId}`,
    });
  }
}
