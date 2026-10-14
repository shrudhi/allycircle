import { describe, expect, it } from "vitest";
import {
  assertParticipant,
  bookingLockIds,
  calendarCheckBlocksAvailability,
  generateBookableSlots,
  intersectBookableSlots,
  isBlockingRequestState,
  isBlockingSessionState,
  rankRecommendedSlots,
  recommendationCopy,
  uniqueDateKeys,
  validateAvailabilityWindows,
  type AvailabilityWindow,
} from "@/lib/domain/availability";

const evening: AvailabilityWindow[] = [
  { weekday: 1, startMinutes: 12 * 60, endMinutes: 15 * 60 },
  { weekday: 1, startMinutes: 19 * 60, endMinutes: 22 * 60, preferred: true },
  { weekday: 2, startMinutes: 18 * 60, endMinutes: 21 * 60 },
];

function iso(slots: { startUtc: Date }[]) {
  return slots.map((slot) => slot.startUtc.toISOString());
}

describe("availability windows", () => {
  it("rejects overlapping windows and inverted times", () => {
    expect(
      validateAvailabilityWindows([
        { weekday: 1, startMinutes: 12 * 60, endMinutes: 15 * 60 },
        { weekday: 1, startMinutes: 14 * 60, endMinutes: 16 * 60 },
      ])
    ).toContain("Time windows on the same day can’t overlap.");
    expect(validateAvailabilityWindows([{ weekday: 3, startMinutes: 18 * 60, endMinutes: 17 * 60 }])).toContain(
      "Each time window needs an end time after its start time."
    );
  });
});

describe("slot generation", () => {
  it("builds recurring slots for different windows on different days", () => {
    const now = new Date("2026-10-12T12:00:00Z");
    const slots = generateBookableSlots({
      windows: evening,
      timezone: "UTC",
      format: "interview_me",
      now,
      busy: [],
      minNoticeHours: 0,
      durationMinutes: 60,
      slotIntervalMinutes: 30,
    });
    const monday = iso(slots.filter((slot) => slot.dateKey === "2026-10-12"));
    const tuesday = iso(slots.filter((slot) => slot.dateKey === "2026-10-13"));
    expect(monday).toContain("2026-10-12T12:00:00.000Z");
    expect(monday).toContain("2026-10-12T19:00:00.000Z");
    expect(tuesday).toContain("2026-10-13T18:00:00.000Z");
    expect(tuesday).not.toContain("2026-10-13T12:00:00.000Z");
  });

  it("keeps multiple windows on one day and drops starts that cannot finish inside the window", () => {
    const now = new Date("2026-10-12T08:00:00Z");
    const slots = generateBookableSlots({
      windows: [
        { weekday: 1, startMinutes: 19 * 60, endMinutes: 22 * 60 },
      ],
      timezone: "UTC",
      format: "interview_me",
      now,
      busy: [],
      minNoticeHours: 0,
      durationMinutes: 60,
      slotIntervalMinutes: 30,
    });
    const starts = iso(slots.filter((slot) => slot.dateKey === "2026-10-12"));
    expect(starts).toEqual([
      "2026-10-12T19:00:00.000Z",
      "2026-10-12T19:30:00.000Z",
      "2026-10-12T20:00:00.000Z",
      "2026-10-12T20:30:00.000Z",
      "2026-10-12T21:00:00.000Z",
    ]);
  });

  it("applies a custom date override over weekly hours", () => {
    const now = new Date("2026-10-12T08:00:00Z");
    const slots = generateBookableSlots({
      windows: [{ weekday: 1, startMinutes: 19 * 60, endMinutes: 22 * 60 }],
      timezone: "UTC",
      format: "interview_me",
      now,
      busy: [],
      minNoticeHours: 0,
      durationMinutes: 60,
      exceptions: [{ date: "2026-10-12", kind: "custom", startMinutes: 20 * 60, endMinutes: 21 * 60 }],
    });
    expect(iso(slots.filter((slot) => slot.dateKey === "2026-10-12"))).toEqual(["2026-10-12T20:00:00.000Z"]);
  });

  it("disables a fully blocked date even if that weekday is usually open", () => {
    const now = new Date("2026-10-12T08:00:00Z");
    const slots = generateBookableSlots({
      windows: [{ weekday: 1, startMinutes: 19 * 60, endMinutes: 22 * 60 }],
      timezone: "UTC",
      format: "interview_me",
      now,
      busy: [],
      minNoticeHours: 0,
      exceptions: [{ date: "2026-10-12", kind: "blocked", startMinutes: null, endMinutes: null }],
    });
    expect(uniqueDateKeys(slots)).not.toContain("2026-10-12");
  });

  it("blocks only the overlapping part of a day", () => {
    const now = new Date("2026-10-12T08:00:00Z");
    const slots = generateBookableSlots({
      windows: [{ weekday: 1, startMinutes: 19 * 60, endMinutes: 22 * 60 }],
      timezone: "UTC",
      format: "interview_me",
      now,
      busy: [],
      minNoticeHours: 0,
      durationMinutes: 60,
      exceptions: [{ date: "2026-10-12", kind: "blocked", startMinutes: 19 * 60, endMinutes: 20 * 60 }],
    });
    const starts = iso(slots.filter((slot) => slot.dateKey === "2026-10-12"));
    expect(starts).not.toContain("2026-10-12T19:00:00.000Z");
    expect(starts).toContain("2026-10-12T20:00:00.000Z");
  });

  it("removes slots that overlap a calendar busy range", () => {
    const now = new Date("2026-10-12T08:00:00Z");
    const slots = generateBookableSlots({
      windows: [{ weekday: 1, startMinutes: 19 * 60, endMinutes: 22 * 60 }],
      timezone: "UTC",
      format: "interview_me",
      now,
      busy: [{ start: new Date("2026-10-12T19:15:00Z"), end: new Date("2026-10-12T19:45:00Z") }],
      minNoticeHours: 0,
      durationMinutes: 60,
    });
    const starts = iso(slots.filter((slot) => slot.dateKey === "2026-10-12"));
    expect(starts).not.toContain("2026-10-12T19:00:00.000Z");
    expect(starts).toContain("2026-10-12T20:00:00.000Z");
  });

  it("enforces minimum notice before a slot can be booked", () => {
    const now = new Date("2026-10-12T18:00:00Z");
    const slots = generateBookableSlots({
      windows: [{ weekday: 1, startMinutes: 19 * 60, endMinutes: 22 * 60 }],
      timezone: "UTC",
      format: "interview_me",
      now,
      busy: [],
      minNoticeHours: 24,
      durationMinutes: 30,
    });
    expect(iso(slots.filter((slot) => slot.dateKey === "2026-10-12"))).toEqual([]);
  });

  it("keeps buffers inside the availability window", () => {
    const now = new Date("2026-10-12T08:00:00Z");
    const slots = generateBookableSlots({
      windows: [{ weekday: 1, startMinutes: 19 * 60, endMinutes: 22 * 60 }],
      timezone: "UTC",
      format: "interview_me",
      now,
      busy: [],
      minNoticeHours: 0,
      durationMinutes: 60,
      slotIntervalMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 15,
    });
    const starts = iso(slots.filter((slot) => slot.dateKey === "2026-10-12"));
    expect(starts).toContain("2026-10-12T19:00:00.000Z");
    expect(starts).not.toContain("2026-10-12T21:00:00.000Z");
  });

  it("caps interviews per day using existing bookings, not calendar noise", () => {
    const now = new Date("2026-10-12T08:00:00Z");
    const slots = generateBookableSlots({
      windows: [{ weekday: 1, startMinutes: 12 * 60, endMinutes: 18 * 60 }],
      timezone: "UTC",
      format: "interview_me",
      now,
      busy: [{ start: new Date("2026-10-12T10:00:00Z"), end: new Date("2026-10-12T11:00:00Z") }],
      existingBookings: [
        { start: new Date("2026-10-12T12:00:00Z"), end: new Date("2026-10-12T12:30:00Z") },
        { start: new Date("2026-10-12T13:00:00Z"), end: new Date("2026-10-12T13:30:00Z") },
      ],
      minNoticeHours: 0,
      maxPerDay: 2,
    });
    expect(slots.filter((slot) => slot.dateKey === "2026-10-12")).toHaveLength(0);
  });

  it("changes generated starts when interview duration changes", () => {
    const now = new Date("2026-10-12T08:00:00Z");
    const hour = generateBookableSlots({
      windows: [{ weekday: 1, startMinutes: 19 * 60, endMinutes: 21 * 60 }],
      timezone: "UTC",
      format: "interview_me",
      now,
      busy: [],
      minNoticeHours: 0,
      durationMinutes: 60,
    });
    const ninety = generateBookableSlots({
      windows: [{ weekday: 1, startMinutes: 19 * 60, endMinutes: 21 * 60 }],
      timezone: "UTC",
      format: "interview_me",
      now,
      busy: [],
      minNoticeHours: 0,
      durationMinutes: 90,
    });
    expect(iso(hour.filter((slot) => slot.dateKey === "2026-10-12"))).toContain("2026-10-12T19:30:00.000Z");
    expect(iso(ninety.filter((slot) => slot.dateKey === "2026-10-12"))).toEqual([
      "2026-10-12T19:00:00.000Z",
      "2026-10-12T19:30:00.000Z",
    ]);
  });

  it("never lets a booking spill past the availability boundary", () => {
    const now = new Date("2026-10-12T08:00:00Z");
    const slots = generateBookableSlots({
      windows: [{ weekday: 1, startMinutes: 19 * 60, endMinutes: 22 * 60 }],
      timezone: "UTC",
      format: "interview_me",
      now,
      busy: [],
      minNoticeHours: 0,
      durationMinutes: 90,
      slotIntervalMinutes: 30,
    });
    const starts = iso(slots.filter((slot) => slot.dateKey === "2026-10-12"));
    expect(starts).toEqual([
      "2026-10-12T19:00:00.000Z",
      "2026-10-12T19:30:00.000Z",
      "2026-10-12T20:00:00.000Z",
      "2026-10-12T20:30:00.000Z",
    ]);
    expect(starts).not.toContain("2026-10-12T21:00:00.000Z");
  });
});

describe("matching and recommendations", () => {
  it("returns only mutually free slots", () => {
    const now = new Date("2026-10-12T08:00:00Z");
    const host = generateBookableSlots({
      windows: [
        { weekday: 1, startMinutes: 14 * 60, endMinutes: 15 * 60 },
        { weekday: 1, startMinutes: 19 * 60, endMinutes: 20 * 60, preferred: true },
        { weekday: 1, startMinutes: 21 * 60, endMinutes: 22 * 60, preferred: true },
      ],
      timezone: "UTC",
      format: "interview_me",
      now,
      busy: [],
      minNoticeHours: 0,
      durationMinutes: 60,
    });
    const guest = generateBookableSlots({
      windows: [
        { weekday: 1, startMinutes: 19 * 60, endMinutes: 20 * 60, preferred: true },
        { weekday: 1, startMinutes: 21 * 60, endMinutes: 22 * 60 },
      ],
      timezone: "UTC",
      format: "interview_me",
      now,
      busy: [],
      minNoticeHours: 0,
      durationMinutes: 60,
    });
    const mutual = intersectBookableSlots(host, guest).filter((slot) => slot.dateKey === "2026-10-12");
    expect(iso(mutual)).toEqual(["2026-10-12T19:00:00.000Z", "2026-10-12T21:00:00.000Z"]);
    const ranked = rankRecommendedSlots(mutual, 5);
    expect(ranked.recommended[0].startUtc.toISOString()).toBe("2026-10-12T19:00:00.000Z");
    expect(recommendationCopy(ranked.recommended[0])).toMatch(/preferred hours/i);
  });

  it("aligns participants in different timezones on the same UTC instant", () => {
    const now = new Date("2026-10-12T08:00:00Z");
    const host = generateBookableSlots({
      windows: [{ weekday: 1, startMinutes: 12 * 60, endMinutes: 13 * 60 }],
      timezone: "America/New_York",
      format: "interview_me",
      now,
      busy: [],
      minNoticeHours: 0,
      durationMinutes: 60,
    });
    const guest = generateBookableSlots({
      windows: [{ weekday: 1, startMinutes: 21 * 60 + 30, endMinutes: 22 * 60 + 30 }],
      timezone: "Asia/Kolkata",
      format: "interview_me",
      now,
      busy: [],
      minNoticeHours: 0,
      durationMinutes: 60,
    });
    const mutual = intersectBookableSlots(host, guest);
    expect(mutual.length).toBeGreaterThan(0);
    expect(mutual[0].startUtc.toISOString()).toBe(guest.find((slot) => slot.startUtc.getTime() === mutual[0].startUtc.getTime())?.startUtc.toISOString());
  });

  it("still generates evening slots across US daylight saving transitions", () => {
    const spring = generateBookableSlots({
      windows: [{ weekday: 0, startMinutes: 19 * 60, endMinutes: 22 * 60 }],
      timezone: "America/New_York",
      format: "interview_me",
      now: new Date("2026-03-07T12:00:00Z"),
      busy: [],
      minNoticeHours: 0,
      durationMinutes: 60,
    });
    const fall = generateBookableSlots({
      windows: [{ weekday: 0, startMinutes: 19 * 60, endMinutes: 22 * 60 }],
      timezone: "America/New_York",
      format: "interview_me",
      now: new Date("2026-10-31T12:00:00Z"),
      busy: [],
      minNoticeHours: 0,
      durationMinutes: 60,
    });
    expect(spring.some((slot) => slot.dateKey === "2026-03-08")).toBe(true);
    expect(fall.some((slot) => slot.dateKey === "2026-11-01")).toBe(true);
    const springTimes = spring.filter((slot) => slot.dateKey === "2026-03-08").map((slot) => slot.startUtc.getTime());
    expect(springTimes).toEqual([...springTimes].sort((a, b) => a - b));
  });
});

describe("booking state and privacy", () => {
  it("releases canceled bookings and keeps pending ones blocked", () => {
    expect(isBlockingSessionState("scheduled")).toBe(true);
    expect(isBlockingSessionState("cancelled")).toBe(false);
    expect(isBlockingRequestState("pending")).toBe(true);
    expect(isBlockingRequestState("cancelled")).toBe(false);
    const now = new Date("2026-10-12T08:00:00Z");
    const open = generateBookableSlots({
      windows: [{ weekday: 1, startMinutes: 19 * 60, endMinutes: 20 * 60 }],
      timezone: "UTC",
      format: "interview_me",
      now,
      busy: [],
      minNoticeHours: 0,
      durationMinutes: 60,
    });
    expect(iso(open)).toContain("2026-10-12T19:00:00.000Z");
  });

  it("can regenerate a slot after the previous booking is excluded for reschedule", () => {
    const now = new Date("2026-10-12T08:00:00Z");
    const withoutCurrent = generateBookableSlots({
      windows: [{ weekday: 1, startMinutes: 19 * 60, endMinutes: 22 * 60 }],
      timezone: "UTC",
      format: "interview_me",
      now,
      busy: [{ start: new Date("2026-10-12T20:00:00Z"), end: new Date("2026-10-12T21:00:00Z") }],
      minNoticeHours: 0,
      durationMinutes: 60,
    });
    expect(iso(withoutCurrent)).toContain("2026-10-12T19:00:00.000Z");
    expect(iso(withoutCurrent)).not.toContain("2026-10-12T20:00:00.000Z");
  });

  it("orders booking locks to avoid deadlocks and treats calendar failures as unknown, not free", () => {
    expect(bookingLockIds("b", "a")).toEqual(["a", "b"]);
    expect(calendarCheckBlocksAvailability(true, false)).toBe(true);
    expect(calendarCheckBlocksAvailability(true, true)).toBe(false);
    expect(calendarCheckBlocksAvailability(false, true)).toBe(false);
  });

  it("does not expose another user's settings through participant checks", () => {
    expect(() => assertParticipant("viewer", "host", "guest")).toThrow("You don’t have access");
    expect(() => assertParticipant("host", "host", "guest")).not.toThrow();
  });
});
