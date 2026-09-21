import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { notify, track } from "@/lib/analytics/track";
import { analyticsEvents } from "@/lib/analytics/taxonomy";

let authInstance: ReturnType<typeof createAuth> | undefined;
let authReady: Promise<ReturnType<typeof createAuth>> | undefined;

function origin() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:43131";
}

function createAuth(db: Awaited<ReturnType<typeof getDb>>) {
  const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return betterAuth({
    secret: process.env.AUTH_SECRET || "allycircle-dev-secret-change-me",
    baseURL: origin(),
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: process.env.NODE_ENV === "production",
      sendResetPassword: async ({ user, url }) => {
        await notify({
          userId: user.id,
          type: "password_reset",
          title: "Reset your AllyCircle password",
          body: "Use this link to choose a new password. If you didn't ask for this, you can ignore the email.",
          href: url,
          email: { to: user.email, subject: "Reset your AllyCircle password" },
        });
        await track(analyticsEvents.auth_password_reset_requested, { userId: user.id });
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await notify({
          userId: user.id,
          type: "verify_email",
          title: "Confirm your email",
          body: "Confirm your email to start finding practice partners.",
          href: url,
          email: { to: user.email, subject: "Confirm your AllyCircle email" },
        });
      },
    },
    socialProviders: googleConfigured
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          },
        }
      : undefined,
    user: {
      deleteUser: { enabled: true },
    },
    plugins: [nextCookies()],
    trustedOrigins: [origin(), "http://localhost:43131", "http://127.0.0.1:43131"],
  });
}

export async function getAuth() {
  if (authInstance) return authInstance;
  if (!authReady) {
    authReady = getDb().then((db) => {
      authInstance = createAuth(db);
      return authInstance;
    });
  }
  return authReady;
}

export function isGoogleLoginConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
