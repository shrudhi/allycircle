const pad = (value: number) => String(value).padStart(2, "0");

export function getTimeZones() {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [
      "UTC",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "Europe/London",
      "Europe/Paris",
      "Asia/Kolkata",
      "Asia/Singapore",
      "Australia/Sydney",
    ];
  }
}

export function guessTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function formatInTimeZone(date: Date, timeZone: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  }).format(date);
}

function tzParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

export function zonedWallTimeToUtc(input: {
  timeZone: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}) {
  const asUtc = Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute, 0);
  let utc = new Date(asUtc);
  for (let i = 0; i < 3; i += 1) {
    const parts = tzParts(utc, input.timeZone);
    const wanted = Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute, 0);
    const got = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
    utc = new Date(utc.getTime() + (wanted - got));
  }
  return utc;
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function weekdayInTimeZone(date: Date, timeZone: string) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

export function minutesLabel(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${pad(minute)} ${suffix}`;
}

export function isoDateInTimeZone(date: Date, timeZone: string) {
  const parts = tzParts(date, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}
