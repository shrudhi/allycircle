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
};

export type BusyRange = { start: Date; end: Date };

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
}) {
  const duration = sessionDurationMinutes(input.format);
  const minNotice = input.minNoticeHours ?? productConfig.minNoticeHours;
  const horizon = input.horizonDays ?? productConfig.bookingHorizonDays;
  const earliest = new Date(input.now.getTime() + minNotice * 60 * 60 * 1000);
  const latest = addDays(input.now, horizon);
  const slots: { startUtc: Date; endUtc: Date }[] = [];

  for (let cursor = new Date(input.now); cursor <= latest; cursor = addDays(cursor, 1)) {
    const weekday = weekdayInTimeZone(cursor, input.timezone);
    const date = isoDateInTimeZone(cursor, input.timezone);
    if (input.availableFrom && date < input.availableFrom) continue;
    if (input.availableUntil && date > input.availableUntil) continue;
    const [year, month, day] = date.split("-").map(Number);
    for (const window of input.windows.filter((item) => item.weekday === weekday)) {
      for (let startMin = window.startMinutes; startMin + duration <= window.endMinutes; startMin += 30) {
        const startUtc = zonedWallTimeToUtc({
          timeZone: input.timezone,
          year,
          month,
          day,
          hour: Math.floor(startMin / 60),
          minute: startMin % 60,
        });
        const endUtc = new Date(startUtc.getTime() + duration * 60 * 1000);
        if (startUtc < earliest || startUtc > latest) continue;
        const blocked = input.busy.some((range) =>
          rangesOverlap(startUtc, endUtc, range.start, range.end)
        );
        if (blocked) continue;
        slots.push({ startUtc, endUtc });
      }
    }
  }
  return slots;
}
