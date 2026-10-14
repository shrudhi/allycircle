import { productConfig } from "@/lib/config/product";
import { rangesOverlap, sessionDurationMinutes } from "@/lib/domain/scheduling";
import {
  addDays,
  isoDateInTimeZone,
  weekdayInTimeZone,
  zonedWallTimeToUtc,
} from "@/lib/domain/timezone";
import type { RequestFormat } from "@/lib/domain/types";

export type AvailabilityWindow = {
  weekday: number;
  startMinutes: number;
  endMinutes: number;
  preferred?: boolean;
};

export type DateException = {
  date: string;
  kind: "blocked" | "custom";
  startMinutes: number | null;
  endMinutes: number | null;
  preferred?: boolean;
};

export type BusyRange = { start: Date; end: Date };

export type PeriodKind = "this_week" | "next_7" | "this_month" | "next_30" | "custom" | "ongoing";

export type AvailabilityPrefs = {
  durationMinutes?: number;
  slotIntervalMinutes?: number;
  minNoticeHours?: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  maxPerDay?: number;
  periodKind?: PeriodKind;
  availableFrom?: string | null;
  availableUntil?: string | null;
};

export type BookableSlot = {
  startUtc: Date;
  endUtc: Date;
  dateKey: string;
  preferred: boolean;
  reasons: string[];
};

export const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
] as const;

export const PERIOD_OPTIONS: { value: PeriodKind; label: string; hint: string }[] = [
  { value: "this_week", label: "This week", hint: "From today through Sunday" },
  { value: "next_7", label: "Next 7 days", hint: "A rolling week from today" },
  { value: "this_month", label: "This month", hint: "Through the last day of this month" },
  { value: "next_30", label: "Next 30 days", hint: "A rolling month from today" },
  { value: "custom", label: "Custom date range", hint: "Choose a start and end date" },
  { value: "ongoing", label: "Ongoing recurring", hint: "Repeat weekly until you change it" },
];

export function allDayWindows(): AvailabilityWindow[] {
  return [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    startMinutes: 0,
    endMinutes: 24 * 60,
  }));
}

export function bookingLockIds(a: string, b: string) {
  return a < b ? [a, b] : [b, a];
}

export function assertParticipant(userId: string, a: string, b: string) {
  if (userId !== a && userId !== b) {
    throw new Error("You don’t have access to that schedule.");
  }
}

export function isBlockingSessionState(state: string) {
  return state === "scheduled" || state === "awaiting_attendance";
}

export function isBlockingRequestState(state: string) {
  return state === "pending" || state === "alternate_time_proposed";
}

export function uniqueDateKeys(slots: BookableSlot[]) {
  return [...new Set(slots.map((slot) => slot.dateKey))];
}

export function calendarCheckBlocksAvailability(connected: boolean, checked: boolean) {
  return connected && !checked;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function minutesFromTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return (hour || 0) * 60 + (minute || 0);
}

export function timeFromMinutes(total: number) {
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${pad(hour)}:${pad(minute)}`;
}

export function windowsOverlap(a: { startMinutes: number; endMinutes: number }, b: { startMinutes: number; endMinutes: number }) {
  return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
}

export function validateAvailabilityWindows(windows: AvailabilityWindow[]) {
  const errors: string[] = [];
  for (const window of windows) {
    if (window.endMinutes <= window.startMinutes) {
      errors.push("Each time window needs an end time after its start time.");
    }
    if (window.startMinutes < 0 || window.endMinutes > 24 * 60) {
      errors.push("Times must stay inside a single day.");
    }
  }
  for (let i = 0; i < windows.length; i += 1) {
    for (let j = i + 1; j < windows.length; j += 1) {
      if (windows[i].weekday === windows[j].weekday && windowsOverlap(windows[i], windows[j])) {
        errors.push("Time windows on the same day can’t overlap.");
      }
    }
  }
  return [...new Set(errors)];
}

export function resolveAvailabilityPeriod(
  input: { periodKind?: PeriodKind; availableFrom?: string | null; availableUntil?: string | null; now: Date; timeZone: string; horizonDays: number }
) {
  const kind = input.periodKind || "ongoing";
  const today = isoDateInTimeZone(input.now, input.timeZone);
  if (kind === "custom") {
    return { from: input.availableFrom || today, until: input.availableUntil || undefined };
  }
  if (kind === "ongoing") {
    return { from: today, until: undefined as string | undefined };
  }
  if (kind === "next_7") {
    return { from: today, until: isoDateInTimeZone(addDays(input.now, 6), input.timeZone) };
  }
  if (kind === "next_30") {
    return { from: today, until: isoDateInTimeZone(addDays(input.now, 29), input.timeZone) };
  }
  const parts = today.split("-").map(Number);
  if (kind === "this_month") {
    const last = new Date(Date.UTC(parts[0], parts[1], 0)).getUTCDate();
    return { from: today, until: `${parts[0]}-${pad(parts[1])}-${pad(last)}` };
  }
  const weekday = weekdayInTimeZone(input.now, input.timeZone);
  const daysToSunday = (7 - weekday) % 7;
  return { from: today, until: isoDateInTimeZone(addDays(input.now, daysToSunday), input.timeZone) };
}

function windowsForDate(input: {
  date: string;
  weekday: number;
  windows: AvailabilityWindow[];
  exceptions: DateException[];
}) {
  const dayExceptions = input.exceptions.filter((item) => item.date === input.date);
  if (dayExceptions.some((item) => item.kind === "blocked" && item.startMinutes == null && item.endMinutes == null)) {
    return { windows: [] as AvailabilityWindow[], blocked: true, blockedRanges: [] as { startMinutes: number; endMinutes: number }[] };
  }
  const custom = dayExceptions.filter((item) => item.kind === "custom" && item.startMinutes != null && item.endMinutes != null);
  const blockedRanges = dayExceptions
    .filter((item) => item.kind === "blocked" && item.startMinutes != null && item.endMinutes != null)
    .map((item) => ({ startMinutes: item.startMinutes as number, endMinutes: item.endMinutes as number }));
  if (custom.length) {
    return {
      windows: custom.map((item) => ({
        weekday: input.weekday,
        startMinutes: item.startMinutes as number,
        endMinutes: item.endMinutes as number,
        preferred: Boolean(item.preferred),
      })),
      blocked: false,
      blockedRanges,
    };
  }
  return {
    windows: input.windows.filter((item) => item.weekday === input.weekday),
    blocked: false,
    blockedRanges,
  };
}

export function generateBookableSlots(input: {
  windows: AvailabilityWindow[];
  timezone: string;
  format: RequestFormat;
  now: Date;
  busy: BusyRange[];
  minNoticeHours?: number;
  horizonDays?: number;
  availableFrom?: string | null;
  availableUntil?: string | null;
  periodKind?: PeriodKind;
  exceptions?: DateException[];
  durationMinutes?: number;
  slotIntervalMinutes?: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  maxPerDay?: number;
  existingBookings?: BusyRange[];
}) {
  const duration =
    input.durationMinutes ||
    sessionDurationMinutes(input.format);
  const interval = input.slotIntervalMinutes || 30;
  const minNotice = input.minNoticeHours ?? productConfig.minNoticeHours;
  const horizon = input.horizonDays ?? productConfig.bookingHorizonDays;
  const bufferBefore = input.bufferBeforeMinutes ?? productConfig.bufferMinutes;
  const bufferAfter = input.bufferAfterMinutes ?? productConfig.bufferMinutes;
  const maxPerDay = input.maxPerDay ?? 0;
  const period = resolveAvailabilityPeriod({
    periodKind: input.periodKind,
    availableFrom: input.availableFrom,
    availableUntil: input.availableUntil,
    now: input.now,
    timeZone: input.timezone,
    horizonDays: horizon,
  });
  const earliest = new Date(input.now.getTime() + minNotice * 60 * 60 * 1000);
  let spanDays = horizon;
  if (period.from && period.until) {
    const fromMs = Date.parse(`${period.from}T00:00:00Z`);
    const untilMs = Date.parse(`${period.until}T00:00:00Z`);
    if (Number.isFinite(fromMs) && Number.isFinite(untilMs) && untilMs >= fromMs) {
      spanDays = Math.min(62, Math.max(horizon, Math.round((untilMs - fromMs) / 86400000) + 2));
    }
  }
  const latest = addDays(input.now, spanDays);
  const slots: BookableSlot[] = [];
  const bookedByDate = new Map<string, number>();
  for (const range of input.existingBookings || []) {
    const key = isoDateInTimeZone(range.start, input.timezone);
    bookedByDate.set(key, (bookedByDate.get(key) || 0) + 1);
  }

  for (let cursor = new Date(input.now); cursor <= latest; cursor = addDays(cursor, 1)) {
    const weekday = weekdayInTimeZone(cursor, input.timezone);
    const date = isoDateInTimeZone(cursor, input.timezone);
    if (period.from && date < period.from) continue;
    if (period.until && date > period.until) continue;
    const day = windowsForDate({
      date,
      weekday,
      windows: input.windows,
      exceptions: input.exceptions || [],
    });
    if (day.blocked) continue;
    if (maxPerDay > 0 && (bookedByDate.get(date) || 0) >= maxPerDay) continue;
    const [year, month, dayNum] = date.split("-").map(Number);
    let createdToday = 0;
    for (const window of day.windows) {
      for (let startMin = window.startMinutes; startMin + duration <= window.endMinutes; startMin += interval) {
        const occupancyStart = startMin - bufferBefore;
        const occupancyEnd = startMin + duration + bufferAfter;
        if (occupancyStart < window.startMinutes || occupancyEnd > window.endMinutes) continue;
        if (day.blockedRanges.some((range) => occupancyStart < range.endMinutes && range.startMinutes < occupancyEnd)) {
          continue;
        }
        const startUtc = zonedWallTimeToUtc({
          timeZone: input.timezone,
          year,
          month,
          day: dayNum,
          hour: Math.floor(startMin / 60),
          minute: startMin % 60,
        });
        const endUtc = new Date(startUtc.getTime() + duration * 60 * 1000);
        if (startUtc < earliest || startUtc > latest) continue;
        const occupyStart = new Date(startUtc.getTime() - bufferBefore * 60 * 1000);
        const occupyEnd = new Date(endUtc.getTime() + bufferAfter * 60 * 1000);
        const blocked = input.busy.some((range) => rangesOverlap(occupyStart, occupyEnd, range.start, range.end));
        if (blocked) continue;
        if (maxPerDay > 0 && (bookedByDate.get(date) || 0) + createdToday >= maxPerDay) continue;
        const preferred = Boolean(window.preferred);
        const reasons: string[] = [];
        if (preferred) reasons.push("Inside preferred hours");
        const hour = Math.floor(startMin / 60);
        if (hour >= 18 && hour < 22) reasons.push("Evening-friendly");
        slots.push({ startUtc, endUtc, dateKey: date, preferred, reasons });
        createdToday += 1;
      }
    }
  }
  return slots;
}

export function intersectBookableSlots(host: BookableSlot[], guest: BookableSlot[]) {
  const guestByStart = new Map(guest.map((slot) => [slot.startUtc.toISOString(), slot]));
  const mutual: BookableSlot[] = [];
  for (const slot of host) {
    const other = guestByStart.get(slot.startUtc.toISOString());
    if (!other) continue;
    mutual.push({
      ...slot,
      preferred: slot.preferred && other.preferred,
      reasons: [
        ...new Set([
          ...(slot.preferred && other.preferred ? ["Preferred for both of you"] : slot.preferred || other.preferred ? ["Preferred for one of you"] : []),
          ...slot.reasons.filter((reason) => reason === "Evening-friendly" && other.reasons.includes("Evening-friendly")),
        ]),
      ],
    });
  }
  return mutual;
}

export function rankRecommendedSlots(slots: BookableSlot[], limit = 5) {
  const scored = slots.map((slot, index) => {
    let score = 0;
    if (slot.reasons.includes("Preferred for both of you") || (slot.preferred && slot.reasons.includes("Inside preferred hours"))) score += 40;
    else if (slot.reasons.includes("Preferred for one of you") || slot.preferred) score += 20;
    if (slot.reasons.includes("Evening-friendly")) score += 10;
    score += Math.max(0, 15 - index);
    return { slot, score, index };
  });
  scored.sort((a, b) => b.score - a.score || a.slot.startUtc.getTime() - b.slot.startUtc.getTime());
  const recommended = scored.slice(0, limit).map((item) => item.slot);
  const recommendedKeys = new Set(recommended.map((slot) => slot.startUtc.toISOString()));
  return {
    recommended,
    rest: slots.filter((slot) => !recommendedKeys.has(slot.startUtc.toISOString())),
  };
}

export function recommendationCopy(slot: BookableSlot) {
  if (slot.reasons.includes("Preferred for both of you")) {
    return "Recommended because this is within both participants’ preferred hours.";
  }
  if (slot.preferred || slot.reasons.includes("Inside preferred hours")) {
    return "Recommended because this sits in preferred hours.";
  }
  if (slot.reasons.includes("Evening-friendly")) {
    return "Recommended because this is within both participants’ preferred evening hours.";
  }
  return "Recommended as the earliest suitable time that works for both of you.";
}
