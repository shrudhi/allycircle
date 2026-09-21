import { google } from "googleapis";
import { eq } from "drizzle-orm";
import { encryptSecret, decryptSecret } from "@/lib/crypto/secrets";
import { getDb, getNow } from "@/lib/db";
import { calendarConnections, profiles, user } from "@/lib/db/schema";
import { appUrl } from "@/lib/integrations/app-url";
import { productConfig } from "@/lib/config/product";

const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function isGoogleLoginConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function isGoogleCalendarConfigured() {
  return Boolean(googleCalendarClientId() && googleCalendarClientSecret());
}

function googleCalendarClientId() {
  return process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "";
}

function googleCalendarClientSecret() {
  return process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "";
}

function oauthClient() {
  return new google.auth.OAuth2(
    googleCalendarClientId(),
    googleCalendarClientSecret(),
    `${appUrl()}/api/calendar/google/callback`
  );
}

export function googleCalendarAuthUrl(userId: string) {
  const client = oauthClient();
  const state = encryptSecret(JSON.stringify({ userId, exp: Date.now() + 15 * 60 * 1000 }));
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: CALENDAR_SCOPES,
    state,
  });
}

export function parseGoogleCalendarState(state: string) {
  const parsed = JSON.parse(decryptSecret(state)) as { userId: string; exp: number };
  if (!parsed.userId || parsed.exp < Date.now()) throw new Error("This Calendar link expired. Try connecting again.");
  return parsed.userId;
}

export async function completeGoogleCalendarOAuth(userId: string, code: string) {
  const db = await getDb();
  const now = await getNow();
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token && !tokens.access_token) {
    throw new Error("Google did not return Calendar tokens. Remove AllyCircle from your Google account connections and try again.");
  }
  const [existing] = await db
    .select()
    .from(calendarConnections)
    .where(eq(calendarConnections.userId, userId))
    .limit(1);
  const refresh = tokens.refresh_token
    ? encryptSecret(tokens.refresh_token)
    : existing?.encryptedRefreshToken || null;
  const organizerEligible = Boolean(refresh || tokens.access_token);
  await db
    .insert(calendarConnections)
    .values({
      userId,
      provider: "google",
      status: "connected",
      scopes: CALENDAR_SCOPES.join(" "),
      encryptedRefreshToken: refresh,
      encryptedAccessToken: tokens.access_token ? encryptSecret(tokens.access_token) : null,
      accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      organizerEligible,
      mockBusyJson: null,
      revokedAt: null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: calendarConnections.userId,
      set: {
        status: "connected",
        scopes: CALENDAR_SCOPES.join(" "),
        encryptedRefreshToken: refresh,
        encryptedAccessToken: tokens.access_token ? encryptSecret(tokens.access_token) : null,
        accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        organizerEligible,
        mockBusyJson: null,
        revokedAt: null,
        updatedAt: now,
      },
    });
}

async function authorizedClient(userId: string) {
  const db = await getDb();
  const [connection] = await db
    .select()
    .from(calendarConnections)
    .where(eq(calendarConnections.userId, userId))
    .limit(1);
  if (!connection || connection.status !== "connected") return null;
  if (!connection.encryptedRefreshToken && !connection.encryptedAccessToken) return null;
  const client = oauthClient();
  client.setCredentials({
    refresh_token: connection.encryptedRefreshToken ? decryptSecret(connection.encryptedRefreshToken) : undefined,
    access_token: connection.encryptedAccessToken ? decryptSecret(connection.encryptedAccessToken) : undefined,
    expiry_date: connection.accessTokenExpiresAt?.getTime(),
  });
  client.on("tokens", async (tokens) => {
    const now = await getNow();
    await db
      .update(calendarConnections)
      .set({
        encryptedAccessToken: tokens.access_token ? encryptSecret(tokens.access_token) : connection.encryptedAccessToken,
        encryptedRefreshToken: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : connection.encryptedRefreshToken,
        accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : connection.accessTokenExpiresAt,
        updatedAt: now,
      })
      .where(eq(calendarConnections.userId, userId));
  });
  return { client, connection };
}

export async function googleFreeBusyRanges(userId: string) {
  const auth = await authorizedClient(userId);
  if (!auth) return [];
  const calendar = google.calendar({ version: "v3", auth: auth.client });
  const now = await getNow();
  const timeMax = new Date(now.getTime() + (productConfig.bookingHorizonDays + 2) * 24 * 60 * 60 * 1000);
  const result = await calendar.freebusy.query({
    requestBody: {
      timeMin: now.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: "primary" }],
    },
  });
  const busy = result.data.calendars?.primary?.busy || [];
  return busy
    .filter((item) => item.start && item.end)
    .map((item) => ({ start: new Date(item.start!), end: new Date(item.end!) }));
}

export async function createGoogleMeetEvent(input: {
  organizerUserId: string;
  attendeeEmails: string[];
  title: string;
  description: string;
  startUtc: Date;
  endUtc: Date;
}) {
  const auth = await authorizedClient(input.organizerUserId);
  if (!auth) return null;
  const db = await getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, input.organizerUserId)).limit(1);
  const [organizer] = await db.select().from(user).where(eq(user.id, input.organizerUserId)).limit(1);
  const calendar = google.calendar({ version: "v3", auth: auth.client });
  const created = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary: input.title,
      description: input.description,
      start: {
        dateTime: input.startUtc.toISOString(),
        timeZone: profile?.timezone || "UTC",
      },
      end: {
        dateTime: input.endUtc.toISOString(),
        timeZone: profile?.timezone || "UTC",
      },
      attendees: [
        ...new Set([organizer?.email, ...input.attendeeEmails].filter(Boolean) as string[]),
      ].map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `ally-${input.startUtc.getTime()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });
  const meetUrl =
    created.data.hangoutLink ||
    created.data.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")?.uri ||
    created.data.htmlLink ||
    null;
  return {
    eventId: created.data.id || "",
    meetUrl,
  };
}

export async function revokeGoogleCalendar(userId: string) {
  const auth = await authorizedClient(userId);
  if (!auth) return;
  const token =
    auth.client.credentials.refresh_token || auth.client.credentials.access_token;
  if (token) {
    try {
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `token=${encodeURIComponent(String(token))}`,
      });
    } catch {
      // Already revoked in Google account settings.
    }
  }
}
