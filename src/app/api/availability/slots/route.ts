import { getSessionUser } from "@/lib/auth/session";
import { listBookableSlots } from "@/lib/server/availability";
import type { RequestFormat } from "@/lib/domain/types";

export async function GET(request: Request) {
  const current = await getSessionUser();
  if (!current?.profile) return Response.json({ error: "Sign in to view bookable times." }, { status: 401 });
  const url = new URL(request.url);
  const allyId = url.searchParams.get("allyId") || "";
  const format = (url.searchParams.get("format") || "interview_me") as RequestFormat;
  if (!allyId) return Response.json({ error: "Choose an ally." }, { status: 400 });
  if (format !== "interview_me" && format !== "reciprocal_swap") {
    return Response.json({ error: "That session format isn’t available." }, { status: 400 });
  }
  const listing = await listBookableSlots({
    hostId: allyId,
    guestId: current.id,
    format,
  });
  return Response.json({
    dates: listing.dates,
    slots: listing.slots.map((slot) => ({
      startUtc: slot.startUtc.toISOString(),
      endUtc: slot.endUtc.toISOString(),
      dateKey: slot.dateKey,
      preferred: slot.preferred,
    })),
    recommended: listing.recommended.map((slot) => ({
      startUtc: slot.startUtc.toISOString(),
      endUtc: slot.endUtc.toISOString(),
      dateKey: slot.dateKey,
      preferred: slot.preferred,
      reasons: slot.reasons,
    })),
    calendarStatus: listing.calendarStatus,
    calendarError: listing.calendarError,
    durationMinutes: listing.durationMinutes,
  });
}
