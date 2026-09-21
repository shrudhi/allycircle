import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { analyticsEvents } from "@/lib/analytics/taxonomy";
import { notify, track } from "@/lib/analytics/track";
import { requireMarketplaceUser } from "@/lib/auth/session";
import { getDb, getNow } from "@/lib/db";
import { blocks, reports } from "@/lib/db/schema";
import type { ReportReason } from "@/lib/domain/types";

export async function blockUser(userId: string) {
  const current = await requireMarketplaceUser();
  if (current.id === userId) throw new Error("You can’t block yourself.");
  const db = await getDb();
  const now = await getNow();
  await db
    .insert(blocks)
    .values({ blockerId: current.id, blockedId: userId, createdAt: now })
    .onConflictDoNothing();
  await track(analyticsEvents.user_blocked, { userId: current.id });
}

export async function unblockUser(userId: string) {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  await db
    .delete(blocks)
    .where(and(eq(blocks.blockerId, current.id), eq(blocks.blockedId, userId)));
  await track(analyticsEvents.user_unblocked, { userId: current.id });
}

export async function reportUser(input: {
  userId: string;
  reason: ReportReason;
  description?: string;
}) {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const now = await getNow();
  await db.insert(reports).values({
    id: nanoid(),
    reporterId: current.id,
    reportedId: input.userId,
    reason: input.reason,
    description: input.description?.trim() || null,
    status: "open",
    createdAt: now,
  });
  await track(analyticsEvents.user_reported, {
    userId: current.id,
    properties: { reason: input.reason },
  });
  await notify({
    userId: current.id,
    type: "report_received",
    title: "We received your report",
    body: "Thank you for looking out for the circle. Our team can review this from the backend.",
    href: "/home",
  });
}
