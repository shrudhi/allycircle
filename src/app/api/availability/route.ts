import { getSessionUser } from "@/lib/auth/session";
import { getMyAvailabilityConfig, saveAvailabilitySchedule } from "@/lib/server/availability";
import type { PeriodKind } from "@/lib/domain/availability";

export async function GET() {
  const current = await getSessionUser();
  if (!current?.profile) return Response.json({ error: "Sign in to view your availability." }, { status: 401 });
  const config = await getMyAvailabilityConfig();
  return Response.json({
    timezone: config.timezone,
    windows: config.windows,
    exceptions: config.exceptions,
    prefs: config.prefs,
    availableFrom: config.availableFrom,
    availableUntil: config.availableUntil,
    calendar: config.calendar,
    previewDates: config.previewDates,
  });
}

export async function PUT(request: Request) {
  const current = await getSessionUser();
  if (!current?.profile) return Response.json({ error: "Sign in to update your availability." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    userId?: string;
    windows?: { weekday: number; startMinutes: number; endMinutes: number; preferred?: boolean }[];
    exceptions?: {
      date: string;
      kind: "blocked" | "custom";
      startMinutes: number | null;
      endMinutes: number | null;
      preferred?: boolean;
    }[];
    prefs?: {
      durationMinutes?: number;
      slotIntervalMinutes?: number;
      minNoticeHours?: number;
      bufferBeforeMinutes?: number;
      bufferAfterMinutes?: number;
      maxPerDay?: number;
      periodKind?: PeriodKind;
    };
    availableFrom?: string | null;
    availableUntil?: string | null;
    timezone?: string;
  } | null;
  if (!body) return Response.json({ error: "Send a JSON availability payload." }, { status: 400 });
  if (body.userId && body.userId !== current.id) {
    return Response.json({ error: "You can only change your own availability." }, { status: 403 });
  }
  try {
    await saveAvailabilitySchedule({
      windows: body.windows || [],
      exceptions: body.exceptions || [],
      prefs: body.prefs || {},
      availableFrom: body.availableFrom,
      availableUntil: body.availableUntil,
      timezone: body.timezone,
    });
    const config = await getMyAvailabilityConfig();
    return Response.json({ ok: true, previewDates: config.previewDates });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "We couldn’t save that schedule." },
      { status: 400 }
    );
  }
}
