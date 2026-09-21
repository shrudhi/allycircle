import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { analyticsEventsTable, emailOutbox, notifications, profiles } from "@/lib/db/schema";
import type { AnalyticsEventName } from "@/lib/analytics/taxonomy";
import { getDb, getNow } from "@/lib/db";

export async function track(
  name: AnalyticsEventName,
  input: { userId?: string | null; properties?: Record<string, unknown> } = {}
) {
  const db = await getDb();
  const now = await getNow();
  const safe = { ...(input.properties || {}) };
  for (const key of Object.keys(safe)) {
    if (/message|note|token|password|email|body|secret/i.test(key)) {
      delete safe[key];
    }
  }
  await db.insert(analyticsEventsTable).values({
    id: nanoid(),
    name,
    userId: input.userId || null,
    propertiesJson: safe,
    createdAt: now,
  });
}

export async function markMeaningful(userId: string) {
  const db = await getDb();
  const now = await getNow();
  await db
    .update(profiles)
    .set({ lastMeaningfulAt: now, lastVisitAt: now, updatedAt: now })
    .where(eq(profiles.userId, userId));
}

export async function notify(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  href?: string;
  email?: { to: string; subject: string };
}) {
  const db = await getDb();
  const now = await getNow();
  await db.insert(notifications).values({
    id: nanoid(),
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href,
    createdAt: now,
  });
  if (input.email) {
    await db.insert(emailOutbox).values({
      id: nanoid(),
      toEmail: input.email.to,
      subject: input.email.subject,
      body: input.body,
      href: input.href,
      createdAt: now,
    });
    if (process.env.RESEND_API_KEY) {
      // Real sending can be wired here without changing product state.
      console.info(`[email] ${input.email.to}: ${input.email.subject}`);
    } else {
      console.info(`[dev-email] to=${input.email.to} subject=${input.email.subject}`);
    }
  }
}
