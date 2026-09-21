import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { profiles, user } from "@/lib/db/schema";

export async function getSessionUser() {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const db = await getDb();
  const [account] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);
  if (!account || account.deletedAt) return null;
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, account.id)).limit(1);
  return { ...account, profile };
}

export async function requireSessionUser() {
  const current = await getSessionUser();
  if (!current) throw new Error("Please log in again to continue.");
  return current;
}

export async function requireMarketplaceUser() {
  const current = await requireSessionUser();
  if (!current.emailVerified) {
    throw new Error("Please confirm your email before using the practice network.");
  }
  if (!current.profile?.onboardingComplete) {
    throw new Error("Finish your profile setup to continue.");
  }
  return { ...current, profile: current.profile };
}
