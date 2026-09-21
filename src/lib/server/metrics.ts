import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { analyticsEventsTable } from "@/lib/db/schema";
import { funnelSteps } from "@/lib/analytics/taxonomy";

const eventMap: Record<(typeof funnelSteps)[number], string> = {
  signed_up: "auth_signed_up",
  onboarded: "onboarding_completed",
  searched_allies: "ally_search_viewed",
  viewed_profile: "ally_profile_viewed",
  created_request: "request_created",
  session_confirmed: "session_confirmed",
  session_completed: "session_completed",
  feedback_submitted: "feedback_submitted",
};

export async function metricsSnapshot() {
  const db = await getDb();
  const rows = await db.select().from(analyticsEventsTable);
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.name] = (counts[row.name] || 0) + 1;
  }
  const funnel = funnelSteps.map((step) => ({
    step,
    count: counts[eventMap[step]] || 0,
  }));
  return {
    funnel,
    counts,
    totals: {
      events: rows.length,
      searchEmpty: counts.ally_search_empty || 0,
      bookingConflicts: counts.booking_time_unavailable || 0,
      meetFailures: counts.meet_provision_failed || 0,
      reports: counts.user_reported || 0,
      blocks: counts.user_blocked || 0,
    },
  };
}

export { sql };
