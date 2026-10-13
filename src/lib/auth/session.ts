import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { emailVerificationRequired } from "@/lib/auth/email-policy";
import { getDb } from "@/lib/db";
import { profiles, user } from "@/lib/db/schema";

export const getSessionUser = cache(async function getSessionUser() {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const db = await getDb();
  const [account] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);
  if (!account || account.deletedAt) return null;
  if (!account.emailVerified && !emailVerificationRequired()) {
    try {
      await db.update(user).set({ emailVerified: true, updatedAt: new Date() }).where(eq(user.id, account.id));
      account.emailVerified = true;
    } catch (error) {
      console.error("[auth] could not mark email verified", error);
    }
  }
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, account.id)).limit(1);
  return { ...account, profile };
});

export async function requireSessionUser() {
  const current = await getSessionUser();
  if (!current) redirect("/login");
  return current;
}

export async function requireMarketplaceUser() {
  const current = await requireSessionUser();
  if (!current.emailVerified) redirect("/verify-email");
  if (!current.profile?.onboardingComplete) redirect("/onboarding");
  return { ...current, profile: current.profile };
}
