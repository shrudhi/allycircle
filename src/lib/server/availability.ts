import { eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { productConfig } from "@/lib/config/product";
import { markMeaningful } from "@/lib/analytics/track";
import {
  allDayWindows,
  generateBookableSlots,
  intersectBookableSlots,
  isBlockingRequestState,
  isBlockingSessionState,
  rankRecommendedSlots,
  recommendationCopy,
  uniqueDateKeys,
  validateAvailabilityWindows,
  type AvailabilityPrefs,
  type AvailabilityWindow,
  type BookableSlot,
  type DateException,
  type PeriodKind,
} from "@/lib/domain/availability";
import type { RequestFormat } from "@/lib/domain/types";
import { requireMarketplaceUser, getSessionUser } from "@/lib/auth/session";
import { getDb, getNow } from "@/lib/db";
import {
  availabilityExceptions,
  availabilityPrefs,
  availabilityWindows,
  practiceRequests,
  practiceSessions,
  profiles,
} from "@/lib/db/schema";
import { calendarBusyState } from "@/lib/server/safety";
import { sessionDurationMinutes } from "@/lib/domain/scheduling";

export type CalendarStatus = "verified" | "internal_only" | "check_failed";

export type SlotListing = {
  slots: BookableSlot[];
  recommended: BookableSlot[];
  rest: BookableSlot[];
  dates: string[];
  calendarStatus: CalendarStatus;
  calendarError?: string;
  durationMinutes: number;
};

const defaultPrefs = {
  durationMinutes: productConfig.interviewMeMinutes,
  slotIntervalMinutes: 30,
  minNoticeHours: productConfig.minNoticeHours,
  bufferBeforeMinutes: productConfig.bufferMinutes,
  bufferAfterMinutes: productConfig.bufferMinutes,
  maxPerDay: 4,
  periodKind: "ongoing" as PeriodKind,
};

export async function loadAvailabilitySettings(userId: string) {
  const db = await getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!profile) throw new Error("We couldn’t find that profile.");
  const [prefsRow] = await db.select().from(availabilityPrefs).where(eq(availabilityPrefs.userId, userId)).limit(1);
  const windows = await db.select().from(availabilityWindows).where(eq(availabilityWindows.userId, userId));
  const exceptions = await db
    .select()
    .from(availabilityExceptions)
    .where(eq(availabilityExceptions.userId, userId));
  return {
    timezone: profile.timezone,
    availableFrom: profile.availableFrom,
    availableUntil: profile.availableUntil,
    prefs: {
      ...defaultPrefs,
      durationMinutes: prefsRow?.durationMinutes ?? defaultPrefs.durationMinutes,
      slotIntervalMinutes: prefsRow?.slotIntervalMinutes ?? defaultPrefs.slotIntervalMinutes,
      minNoticeHours: prefsRow?.minNoticeHours ?? defaultPrefs.minNoticeHours,
      bufferBeforeMinutes: prefsRow?.bufferBeforeMinutes ?? defaultPrefs.bufferBeforeMinutes,
      bufferAfterMinutes: prefsRow?.bufferAfterMinutes ?? defaultPrefs.bufferAfterMinutes,
      maxPerDay: prefsRow?.maxPerDay ?? defaultPrefs.maxPerDay,
      periodKind: (prefsRow?.periodKind as PeriodKind) || defaultPrefs.periodKind,
    },
    windows: windows.map((row) => ({
      weekday: row.weekday,
      startMinutes: row.startMinutes,
      endMinutes: row.endMinutes,
      preferred: row.preferred,
    })),
    exceptions: exceptions.map((row) => ({
      date: row.onDate,
      kind: row.kind as DateException["kind"],
      startMinutes: row.startMinutes,
      endMinutes: row.endMinutes,
      preferred: row.preferred,
    })),
  };
}

export async function internalBusyRanges(userId: string, excludeSessionId?: string) {
  const db = await getDb();
  const sessions = await db
    .select()
    .from(practiceSessions)
    .where(or(eq(practiceSessions.requesterId, userId), eq(practiceSessions.receiverId, userId))!);
  const requests = await db
    .select()
    .from(practiceRequests)
    .where(or(eq(practiceRequests.requesterId, userId), eq(practiceRequests.receiverId, userId))!);
  const sessionBusy = sessions
    .filter((row) => isBlockingSessionState(row.state))
    .filter((row) => row.id !== excludeSessionId)
    .map((row) => ({ start: row.startUtc, end: row.endUtc }));
  const requestBusy = requests
    .filter((row) => isBlockingRequestState(row.state) && row.proposedStartUtc && row.proposedEndUtc)
    .map((row) => ({ start: row.proposedStartUtc as Date, end: row.proposedEndUtc as Date }));
  return [...sessionBusy, ...requestBusy];
}

async function slotsForUser(input: {
  userId: string;
  format: RequestFormat;
  now: Date;
  extraBusy?: { start: Date; end: Date }[];
  excludeSessionId?: string;
  openIfNoWindows?: boolean;
  durationMinutes?: number;
  freshCalendar?: boolean;
}) {
  const settings = await loadAvailabilitySettings(input.userId);
  const calendar = await calendarBusyState(input.userId, input.now, { fresh: input.freshCalendar });
  const internal = await internalBusyRanges(input.userId, input.excludeSessionId);
  const busy = [...internal, ...calendar.busy, ...(input.extraBusy || [])];
  const duration =
    input.durationMinutes ||
    (input.format === "reciprocal_swap" ? sessionDurationMinutes(input.format) : settings.prefs.durationMinutes);
  const windows: AvailabilityWindow[] =
    settings.windows.length || !input.openIfNoWindows ? settings.windows : allDayWindows();
  const slots = generateBookableSlots({
    windows,
    timezone: settings.timezone,
    format: input.format,
    now: input.now,
    busy,
    existingBookings: internal,
    minNoticeHours: settings.prefs.minNoticeHours,
    durationMinutes: duration,
    slotIntervalMinutes: settings.prefs.slotIntervalMinutes,
    bufferBeforeMinutes: settings.prefs.bufferBeforeMinutes,
    bufferAfterMinutes: settings.prefs.bufferAfterMinutes,
    maxPerDay: settings.prefs.maxPerDay,
    periodKind: settings.prefs.periodKind,
    availableFrom: settings.availableFrom,
    availableUntil: settings.availableUntil,
    exceptions: settings.exceptions,
  });
  return { slots, calendar, settings, duration };
}

function failedListing(error: string, durationMinutes: number): SlotListing {
  return {
    slots: [],
    recommended: [],
    rest: [],
    dates: [],
    calendarStatus: "check_failed",
    calendarError: error,
    durationMinutes,
  };
}

export async function listBookableSlots(input: {
  hostId: string;
  guestId: string;
  format: RequestFormat;
  excludeSessionId?: string;
  freshCalendar?: boolean;
}): Promise<SlotListing> {
  const now = await getNow();
  const host = await slotsForUser({
    userId: input.hostId,
    format: input.format,
    now,
    excludeSessionId: input.excludeSessionId,
    freshCalendar: input.freshCalendar,
  });
  const duration = host.duration;
  if (host.calendar.connected && !host.calendar.checked) {
    return failedListing(host.calendar.error || "We couldn’t check Google Calendar. Try again in a moment.", duration);
  }
  const guest = await slotsForUser({
    userId: input.guestId,
    format: input.format,
    now,
    excludeSessionId: input.excludeSessionId,
    openIfNoWindows: true,
    durationMinutes: duration,
    freshCalendar: input.freshCalendar,
  });
  if (guest.calendar.connected && !guest.calendar.checked) {
    return failedListing(
      guest.calendar.error || "We couldn’t check a connected calendar. Try again in a moment.",
      duration
    );
  }
  const slots = intersectBookableSlots(host.slots, guest.slots);
  const ranked = rankRecommendedSlots(slots);
  const calendarStatus: CalendarStatus =
    host.calendar.connected || guest.calendar.connected ? "verified" : "internal_only";
  return {
    slots,
    recommended: ranked.recommended,
    rest: ranked.rest,
    dates: uniqueDateKeys(slots),
    calendarStatus,
    durationMinutes: duration,
  };
}

export async function assertSlotStillBookable(input: {
  hostId: string;
  guestId: string;
  format: RequestFormat;
  startIso: string;
  excludeSessionId?: string;
}) {
  const listing = await listBookableSlots({ ...input, freshCalendar: true });
  if (listing.calendarStatus === "check_failed") {
    throw new Error(listing.calendarError || "We couldn’t verify calendar availability.");
  }
  const match = listing.slots.find((slot) => slot.startUtc.toISOString() === input.startIso);
  if (!match) {
    throw new Error("That time is no longer free. Pick another slot.");
  }
  return match;
}

export async function saveAvailabilitySchedule(input: {
  windows: AvailabilityWindow[];
  exceptions: DateException[];
  prefs: AvailabilityPrefs;
  availableFrom?: string | null;
  availableUntil?: string | null;
  timezone?: string;
}) {
  const current = await requireMarketplaceUser();
  const errors = validateAvailabilityWindows(input.windows);
  if (errors.length) throw new Error(errors[0]);
  const duration = input.prefs.durationMinutes || 30;
  if (![30, 45, 60, 90].includes(duration)) throw new Error("Choose 30, 45, 60, or 90 minutes.");
  const db = await getDb();
  const now = await getNow();
  const prefsValues = {
    durationMinutes: duration,
    slotIntervalMinutes: input.prefs.slotIntervalMinutes || 30,
    minNoticeHours: input.prefs.minNoticeHours ?? productConfig.minNoticeHours,
    bufferBeforeMinutes: input.prefs.bufferBeforeMinutes ?? 0,
    bufferAfterMinutes: input.prefs.bufferAfterMinutes ?? 0,
    maxPerDay: input.prefs.maxPerDay ?? 4,
    periodKind: input.prefs.periodKind || "ongoing",
    updatedAt: now,
  };
  await db.transaction(async (tx) => {
    await tx.delete(availabilityWindows).where(eq(availabilityWindows.userId, current.id));
    if (input.windows.length) {
      await tx.insert(availabilityWindows).values(
        input.windows.map((window) => ({
          id: nanoid(),
          userId: current.id,
          weekday: window.weekday,
          startMinutes: window.startMinutes,
          endMinutes: window.endMinutes,
          preferred: Boolean(window.preferred),
        }))
      );
    }
    await tx.delete(availabilityExceptions).where(eq(availabilityExceptions.userId, current.id));
    const exceptions = input.exceptions.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date));
    if (exceptions.length) {
      await tx.insert(availabilityExceptions).values(
        exceptions.map((item) => ({
          id: nanoid(),
          userId: current.id,
          onDate: item.date,
          kind: item.kind,
          startMinutes: item.startMinutes,
          endMinutes: item.endMinutes,
          preferred: Boolean(item.preferred),
        }))
      );
    }
    await tx
      .insert(availabilityPrefs)
      .values({ userId: current.id, ...prefsValues })
      .onConflictDoUpdate({
        target: availabilityPrefs.userId,
        set: prefsValues,
      });
    await tx
      .update(profiles)
      .set({
        availableFrom: input.availableFrom || null,
        availableUntil: input.availableUntil || null,
        timezone: input.timezone || current.profile.timezone,
        updatedAt: now,
      })
      .where(eq(profiles.userId, current.id));
  });
  await markMeaningful(current.id);
}

export async function getMyAvailabilityConfig() {
  const current = await requireMarketplaceUser();
  const settings = await loadAvailabilitySettings(current.id);
  const now = await getNow();
  const calendar = await calendarBusyState(current.id, now);
  const internal = await internalBusyRanges(current.id);
  const preview = generateBookableSlots({
    windows: settings.windows,
    timezone: settings.timezone,
    format: "interview_me",
    now,
    existingBookings: internal,
    busy: internal,
    minNoticeHours: settings.prefs.minNoticeHours,
    durationMinutes: settings.prefs.durationMinutes,
    slotIntervalMinutes: settings.prefs.slotIntervalMinutes,
    bufferBeforeMinutes: settings.prefs.bufferBeforeMinutes,
    bufferAfterMinutes: settings.prefs.bufferAfterMinutes,
    maxPerDay: settings.prefs.maxPerDay,
    periodKind: settings.prefs.periodKind,
    availableFrom: settings.availableFrom,
    availableUntil: settings.availableUntil,
    exceptions: settings.exceptions,
  });
  return {
    ...settings,
    calendar: {
      connected: calendar.connected,
      checked: calendar.checked,
      provider: calendar.provider,
    },
    previewDates: uniqueDateKeys(preview),
  };
}

export function explainSlot(slot: BookableSlot) {
  return recommendationCopy(slot);
}

export async function requireAvailabilityOwner() {
  const current = await getSessionUser();
  if (!current) return null;
  return current;
}
