"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { track } from "@/lib/analytics/track";
import { analyticsEvents } from "@/lib/analytics/taxonomy";
import { getDb, getNow } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function signOutAction() {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  await auth.api.signOut({ headers: await headers() });
  if (session?.user) {
    await track(analyticsEvents.auth_logged_out, { userId: session.user.id });
  }
  redirect("/");
}

export async function recordTermsAcceptance(userId: string) {
  const db = await getDb();
  const now = await getNow();
  await db
    .update(profiles)
    .set({ termsAcceptedAt: now, updatedAt: now })
    .where(eq(profiles.userId, userId));
}
