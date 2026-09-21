import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { notify, track } from "@/lib/analytics/track";
import { analyticsEvents } from "@/lib/analytics/taxonomy";
import { emailVerificationRequired } from "@/lib/auth/email-policy";
import { eq } from "drizzle-orm";
import { isGoogleLoginConfigured } from "@/lib/integrations/google-calendar";
import { appUrl } from "@/lib/integrations/app-url";

let authInstance: ReturnType<typeof createAuth> | undefined;

function origin() {
  return appUrl();
}

function createAuth(db: Awaited<ReturnType<typeof getDb>>) {
  const googleConfigured = isGoogleLoginConfigured();
  return betterAuth({
    secret: process.env.AUTH_SECRET || "allycircle-dev-secret-change-me",
    baseURL: origin(),
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: emailVerificationRequired(),
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
        databaseHooks: {
          user: {
            create: {
              after: async (created) => {
                try {
                  if (!emailVerificationRequired()) {
                    await db
                      .update(schema.user)
                      .set({ emailVerified: true, updatedAt: new Date() })
                      .where(eq(schema.user.id, created.id));
                  }
                  await track(analyticsEvents.auth_signed_up, { userId: created.id });
                } catch (error) {
                  console.error("[auth] post-signup hook failed", error);
                }
              },
            },
          },
        },
        plugins: [nextCookies()],
    trustedOrigins: Array.from(
      new Set(
        [
          origin(),
          "http://localhost:43131",
          "http://127.0.0.1:43131",
          "http://0.0.0.0:43131",
          "http://172.30.0.2:43131",
          ...(process.env.AUTH_TRUSTED_ORIGINS || "").split(",").map((item) => item.trim()).filter(Boolean),
        ]
      )
    ),
  });
}

export async function getAuth() {
  if (authInstance) return authInstance;
  const db = await getDb();
  if (!authInstance) authInstance = createAuth(db);
  return authInstance;
}

export { isGoogleLoginConfigured };
