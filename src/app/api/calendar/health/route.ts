import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { calendarConnections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isGoogleCalendarConfigured } from "@/lib/integrations/google-calendar";
import { calendarBusyState } from "@/lib/server/safety";

export async function GET() {
  const current = await getSessionUser();
  if (!current?.profile) return Response.json({ error: "Sign in to check calendar health." }, { status: 401 });
  const db = await getDb();
  const [connection] = await db
    .select({
      status: calendarConnections.status,
      provider: calendarConnections.provider,
      organizerEligible: calendarConnections.organizerEligible,
    })
    .from(calendarConnections)
    .where(eq(calendarConnections.userId, current.id))
    .limit(1);
  const state = await calendarBusyState(current.id);
  return Response.json({
    liveConfigured: isGoogleCalendarConfigured(),
    connected: state.connected,
    checked: state.checked,
    provider: state.provider,
    status: connection?.status || "disconnected",
    organizerEligible: Boolean(connection?.organizerEligible),
    error: state.error,
  });
}
