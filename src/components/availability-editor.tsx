"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimezoneSelect } from "@/components/timezone-select";
import {
  PERIOD_OPTIONS,
  WEEKDAYS,
  generateBookableSlots,
  minutesFromTime,
  timeFromMinutes,
  uniqueDateKeys,
  validateAvailabilityWindows,
  type AvailabilityPrefs,
  type AvailabilityWindow,
  type DateException,
  type PeriodKind,
} from "@/lib/domain/availability";

type WindowDraft = { startMinutes: number; endMinutes: number; preferred: boolean };
type DayDraft = { enabled: boolean; windows: WindowDraft[] };

const weekdayValues = WEEKDAYS.map((day) => day.value);

function emptyDays(): Record<number, DayDraft> {
  return Object.fromEntries(weekdayValues.map((value) => [value, { enabled: false, windows: [] }]));
}

function daysFromWindows(windows: AvailabilityWindow[]) {
  const days = emptyDays();
  for (const window of windows) {
    days[window.weekday].enabled = true;
    days[window.weekday].windows.push({
      startMinutes: window.startMinutes,
      endMinutes: window.endMinutes,
      preferred: Boolean(window.preferred),
    });
  }
  return days;
}

function windowsFromDays(days: Record<number, DayDraft>): AvailabilityWindow[] {
  return weekdayValues.flatMap((weekday) =>
    days[weekday].enabled
      ? days[weekday].windows.map((window) => ({ weekday, ...window }))
      : []
  );
}

function monthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: { key: string; day: number | null }[] = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push({ key: `e-${i}`, day: null });
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ key, day });
  }
  return cells;
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="gold-outline" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function AvailabilityEditor({
  action,
  resetAction,
  timezone,
  windows,
  exceptions,
  prefs,
  availableFrom,
  availableUntil,
  previewDates,
  calendar,
  formError,
  saved,
}: {
  action: (formData: FormData) => void | Promise<void>;
  resetAction: (formData: FormData) => void | Promise<void>;
  timezone: string;
  windows: AvailabilityWindow[];
  exceptions: DateException[];
  prefs: AvailabilityPrefs & {
    durationMinutes: number;
    slotIntervalMinutes: number;
    minNoticeHours: number;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
    maxPerDay: number;
    periodKind: PeriodKind;
  };
  availableFrom?: string | null;
  availableUntil?: string | null;
  previewDates: string[];
  calendar: { connected: boolean; checked: boolean; provider: string | null };
  formError?: string | null;
  saved?: boolean;
}) {
  const [days, setDays] = useState(() => daysFromWindows(windows));
  const [periodKind, setPeriodKind] = useState<PeriodKind>(prefs.periodKind || "ongoing");
  const [from, setFrom] = useState(availableFrom || "");
  const [until, setUntil] = useState(availableUntil || "");
  const [durationMinutes, setDurationMinutes] = useState(prefs.durationMinutes);
  const [slotIntervalMinutes, setSlotIntervalMinutes] = useState(prefs.slotIntervalMinutes);
  const [minNoticeHours, setMinNoticeHours] = useState(prefs.minNoticeHours);
  const [bufferBeforeMinutes, setBufferBeforeMinutes] = useState(prefs.bufferBeforeMinutes);
  const [bufferAfterMinutes, setBufferAfterMinutes] = useState(prefs.bufferAfterMinutes);
  const [maxPerDay, setMaxPerDay] = useState(prefs.maxPerDay);
  const zone = timezone;
  const [dateExceptions, setDateExceptions] = useState<DateException[]>(exceptions);
  const [copySource, setCopySource] = useState<number | null>(null);
  const [copyTargets, setCopyTargets] = useState<number[]>([]);
  const [exceptionDate, setExceptionDate] = useState("");
  const [exceptionKind, setExceptionKind] = useState<"blocked" | "custom">("blocked");
  const [exceptionStart, setExceptionStart] = useState("18:00");
  const [exceptionEnd, setExceptionEnd] = useState("21:00");
  const [exceptionPartial, setExceptionPartial] = useState(false);
  const [hint, setHint] = useState("");
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const liveWindows = windowsFromDays(days);
  const liveErrors = validateAvailabilityWindows(liveWindows);
  let livePreview = previewDates;
  try {
    livePreview = uniqueDateKeys(
      generateBookableSlots({
        windows: liveWindows,
        timezone: zone || timezone,
        format: "interview_me",
        now: new Date(),
        busy: [],
        minNoticeHours,
        durationMinutes,
        slotIntervalMinutes,
        bufferBeforeMinutes,
        bufferAfterMinutes,
        maxPerDay,
        periodKind,
        availableFrom: periodKind === "custom" ? from : null,
        availableUntil: periodKind === "custom" ? until : null,
        exceptions: dateExceptions,
      })
    );
  } catch {
    livePreview = previewDates;
  }

  const payload = JSON.stringify({
    windows: liveWindows,
    exceptions: dateExceptions,
    prefs: {
      durationMinutes,
      slotIntervalMinutes,
      minNoticeHours,
      bufferBeforeMinutes,
      bufferAfterMinutes,
      maxPerDay,
      periodKind,
    },
    availableFrom: periodKind === "custom" ? from || null : null,
    availableUntil: periodKind === "custom" ? until || null : null,
    timezone: zone,
  });

  function setDay(weekday: number, patch: Partial<DayDraft>) {
    setDays((current) => ({ ...current, [weekday]: { ...current[weekday], ...patch } }));
  }

  function addWindow(weekday: number) {
    const current = days[weekday];
    const last = current.windows[current.windows.length - 1];
    const startMinutes = last ? Math.min(last.endMinutes, 21 * 60) : 18 * 60;
    const endMinutes = Math.min(startMinutes + 3 * 60, 24 * 60);
    setDay(weekday, {
      enabled: true,
      windows: [...current.windows, { startMinutes, endMinutes, preferred: false }],
    });
  }

  function updateWindow(weekday: number, index: number, patch: Partial<WindowDraft>) {
    setDays((current) => ({
      ...current,
      [weekday]: {
        ...current[weekday],
        windows: current[weekday].windows.map((window, i) => (i === index ? { ...window, ...patch } : window)),
      },
    }));
  }

  function removeWindow(weekday: number, index: number) {
    setDays((current) => {
      const windows = current[weekday].windows.filter((_, i) => i !== index);
      return {
        ...current,
        [weekday]: { enabled: windows.length > 0, windows },
      };
    });
  }

  function copyToDays() {
    if (copySource == null || !copyTargets.length) return;
    const source = days[copySource];
    setDays((current) => {
      const next = { ...current };
      for (const weekday of copyTargets) {
        next[weekday] = {
          enabled: source.enabled,
          windows: source.windows.map((window) => ({ ...window })),
        };
      }
      return next;
    });
    setCopySource(null);
    setCopyTargets([]);
  }

  function applyWeekdays(weekday: number) {
    const source = days[weekday];
    setDays((current) => {
      const next = { ...current };
      for (const day of [1, 2, 3, 4, 5]) {
        next[day] = { enabled: source.enabled, windows: source.windows.map((window) => ({ ...window })) };
      }
      return next;
    });
  }

  function addException() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(exceptionDate)) {
      setHint("Choose a date for the override.");
      return;
    }
    const startMinutes = exceptionPartial || exceptionKind === "custom" ? minutesFromTime(exceptionStart) : null;
    const endMinutes = exceptionPartial || exceptionKind === "custom" ? minutesFromTime(exceptionEnd) : null;
    if ((exceptionKind === "custom" || exceptionPartial) && (endMinutes || 0) <= (startMinutes || 0)) {
      setHint("Override hours need an end time after the start time.");
      return;
    }
    setDateExceptions((current) => [
      ...current.filter((item) => item.date !== exceptionDate || item.kind !== exceptionKind),
      {
        date: exceptionDate,
        kind: exceptionKind,
        startMinutes,
        endMinutes,
        preferred: false,
      },
    ]);
    setHint("");
  }

  const title = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(cursor.year, cursor.month, 1)
  );
  const cells = monthCells(cursor.year, cursor.month);

  return (
    <div className="space-y-8">
      {saved ? <p className="text-sm text-[#d4af37]">Availability saved. Bookable times now follow these hours.</p> : null}
      {formError ? <p className="text-sm text-[#e07070]">{formError}</p> : null}
      {hint ? <p className="text-sm text-[#e07070]">{hint}</p> : null}
      {liveErrors.map((error) => (
        <p key={error} className="text-sm text-[#e07070]">
          {error}
        </p>
      ))}

      <form
        action={action}
        onSubmit={(event) => {
          const timezoneField = (event.currentTarget.elements.namedItem("timezone") as HTMLInputElement | null)?.value;
          const payloadInput = event.currentTarget.elements.namedItem("payload") as HTMLInputElement | null;
          if (payloadInput) {
            const parsed = JSON.parse(payloadInput.value) as { timezone?: string };
            parsed.timezone = timezoneField || zone;
            payloadInput.value = JSON.stringify(parsed);
          }
          if (liveErrors.length) {
            event.preventDefault();
            setHint(liveErrors[0]);
            return;
          }
          if (periodKind === "custom" && from && until && from > until) {
            event.preventDefault();
            setHint("The end date needs to be on or after the start date.");
          }
        }}
        className="space-y-8"
      >
        <input type="hidden" name="payload" value={payload} />
      <div className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-4">
        <p className="text-sm font-medium text-white">Recommendation window</p>
        <p className="text-sm text-[#b3b3b3]">
          Only recommend you to peers for dates inside this period. Past dates are never bookable.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriodKind(option.value)}
              className={`rounded-lg border px-3 py-2 text-left text-sm ${
                periodKind === option.value ? "border-[#d4af37] bg-[#d4af37]/10 text-white" : "border-white/15 text-[#d0d0d0]"
              }`}
            >
              <span className="block font-medium">{option.label}</span>
              <span className="block text-xs text-[#8a8a8a]">{option.hint}</span>
            </button>
          ))}
        </div>
        {periodKind === "custom" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="availableFrom">Available from</Label>
              <Input id="availableFrom" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="availableUntil">Available until</Label>
              <Input id="availableUntil" type="date" value={until} onChange={(event) => setUntil(event.target.value)} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-4">
        <p className="text-sm font-medium text-white">Hours by day</p>
        <p className="text-sm text-[#b3b3b3]">
          Turn a weekday on, then add as many interview windows as you want. Copy hours to other days instead of
          repeating them by hand.
        </p>
        <div className="space-y-4">
          {WEEKDAYS.map((day) => {
            const draft = days[day.value];
            return (
              <div key={day.value} className={`rounded-lg border p-3 ${draft.enabled ? "border-white/15" : "border-white/5 opacity-80"}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={draft.enabled}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setDay(day.value, {
                            enabled: true,
                            windows: draft.windows.length ? draft.windows : [{ startMinutes: 18 * 60, endMinutes: 21 * 60, preferred: false }],
                          });
                        } else {
                          setDay(day.value, { enabled: false, windows: [] });
                        }
                      }}
                    />
                    {day.label}
                    {!draft.enabled ? <span className="font-normal text-[#8a8a8a]">Unavailable</span> : null}
                  </label>
                  {draft.enabled ? (
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button type="button" className="text-[#d4af37]" onClick={() => addWindow(day.value)}>
                        Add time window
                      </button>
                      <button type="button" className="text-[#d4af37]" onClick={() => applyWeekdays(day.value)}>
                        Apply to weekdays
                      </button>
                      <button
                        type="button"
                        className="text-[#d4af37]"
                        onClick={() => {
                          setCopySource(day.value);
                          setCopyTargets(weekdayValues.filter((value) => value !== day.value));
                        }}
                      >
                        Copy to other days
                      </button>
                    </div>
                  ) : null}
                </div>
                {draft.enabled ? (
                  <div className="mt-3 space-y-3">
                    {draft.windows.map((window, index) => (
                      <div key={`${day.value}-${index}`} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
                        <div className="space-y-1">
                          <Label>Starts</Label>
                          <Input
                            type="time"
                            value={timeFromMinutes(window.startMinutes)}
                            onChange={(event) =>
                              updateWindow(day.value, index, { startMinutes: minutesFromTime(event.target.value) })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Ends</Label>
                          <Input
                            type="time"
                            value={window.endMinutes >= 24 * 60 ? "23:59" : timeFromMinutes(window.endMinutes)}
                            onChange={(event) =>
                              updateWindow(day.value, index, { endMinutes: minutesFromTime(event.target.value) })
                            }
                          />
                        </div>
                        <label className="flex items-end gap-2 pb-2 text-xs text-[#b3b3b3]">
                          <input
                            type="checkbox"
                            checked={window.preferred}
                            onChange={(event) => updateWindow(day.value, index, { preferred: event.target.checked })}
                          />
                          Preferred
                        </label>
                        <button type="button" className="self-end pb-2 text-xs text-[#e07070]" onClick={() => removeWindow(day.value, index)}>
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        {copySource != null ? (
          <div className="rounded-lg border border-[#d4af37]/40 p-3 text-sm">
            <p className="mb-2">Copy {WEEKDAYS.find((day) => day.value === copySource)?.label} hours to:</p>
            <div className="flex flex-wrap gap-3">
              {WEEKDAYS.filter((day) => day.value !== copySource).map((day) => (
                <label key={day.value} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={copyTargets.includes(day.value)}
                    onChange={(event) =>
                      setCopyTargets((current) =>
                        event.target.checked ? [...current, day.value] : current.filter((value) => value !== day.value)
                      )
                    }
                  />
                  {day.label}
                </label>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Button type="button" size="sm" onClick={copyToDays}>
                Copy hours
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setCopySource(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-4">
        <p className="text-sm font-medium text-white">Specific-date overrides</p>
        <p className="text-sm text-[#b3b3b3]">
          Block a day, shorten it, or add extra hours. Overrides replace the usual weekly hours for that date.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={exceptionDate} onChange={(event) => setExceptionDate(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Override</Label>
            <select
              className="h-10 w-full rounded-lg border border-white/15 bg-[#0a0a0a] px-3 text-sm"
              value={exceptionKind}
              onChange={(event) => setExceptionKind(event.target.value as "blocked" | "custom")}
            >
              <option value="blocked">Mark unavailable</option>
              <option value="custom">Custom hours for this date</option>
            </select>
          </div>
        </div>
        {exceptionKind === "blocked" ? (
          <label className="flex items-center gap-2 text-sm text-[#b3b3b3]">
            <input type="checkbox" checked={exceptionPartial} onChange={(event) => setExceptionPartial(event.target.checked)} />
            Block only part of the day
          </label>
        ) : null}
        {exceptionKind === "custom" || exceptionPartial ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Starts</Label>
              <Input type="time" value={exceptionStart} onChange={(event) => setExceptionStart(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ends</Label>
              <Input type="time" value={exceptionEnd} onChange={(event) => setExceptionEnd(event.target.value)} />
            </div>
          </div>
        ) : null}
        <Button type="button" variant="outline" onClick={addException}>
          Add override
        </Button>
        {dateExceptions.length ? (
          <div className="space-y-2">
            {dateExceptions.map((item, index) => (
              <div key={`${item.date}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm">
                <p>
                  {item.date} · {item.kind === "blocked" && item.startMinutes == null ? "Unavailable" : item.kind === "blocked" ? `Blocked ${timeFromMinutes(item.startMinutes || 0)}–${timeFromMinutes(item.endMinutes || 0)}` : `${timeFromMinutes(item.startMinutes || 0)}–${timeFromMinutes(item.endMinutes || 0)}`}
                </p>
                <button
                  type="button"
                  className="text-xs text-[#d4af37]"
                  onClick={() => setDateExceptions((current) => current.filter((_, i) => i !== index))}
                >
                  Restore weekly hours
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#8a8a8a]">No date overrides yet.</p>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-4">
        <p className="text-sm font-medium text-white">Interview scheduling preferences</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Interview duration</Label>
            <select
              className="h-10 w-full rounded-lg border border-white/15 bg-[#0a0a0a] px-3 text-sm"
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(Number(event.target.value))}
            >
              {[30, 45, 60, 90].map((value) => (
                <option key={value} value={value}>
                  {value} minutes
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Slot start interval</Label>
            <select
              className="h-10 w-full rounded-lg border border-white/15 bg-[#0a0a0a] px-3 text-sm"
              value={slotIntervalMinutes}
              onChange={(event) => setSlotIntervalMinutes(Number(event.target.value))}
            >
              {[15, 30, 60].map((value) => (
                <option key={value} value={value}>
                  Every {value} minutes
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Minimum notice</Label>
            <select
              className="h-10 w-full rounded-lg border border-white/15 bg-[#0a0a0a] px-3 text-sm"
              value={minNoticeHours}
              onChange={(event) => setMinNoticeHours(Number(event.target.value))}
            >
              {[4, 12, 24, 48].map((value) => (
                <option key={value} value={value}>
                  {value} hours
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Maximum interviews per day</Label>
            <select
              className="h-10 w-full rounded-lg border border-white/15 bg-[#0a0a0a] px-3 text-sm"
              value={maxPerDay}
              onChange={(event) => setMaxPerDay(Number(event.target.value))}
            >
              {[1, 2, 3, 4, 6, 8].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Buffer before</Label>
            <select
              className="h-10 w-full rounded-lg border border-white/15 bg-[#0a0a0a] px-3 text-sm"
              value={bufferBeforeMinutes}
              onChange={(event) => setBufferBeforeMinutes(Number(event.target.value))}
            >
              {[0, 10, 15, 30].map((value) => (
                <option key={value} value={value}>
                  {value} minutes
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Buffer after</Label>
            <select
              className="h-10 w-full rounded-lg border border-white/15 bg-[#0a0a0a] px-3 text-sm"
              value={bufferAfterMinutes}
              onChange={(event) => setBufferAfterMinutes(Number(event.target.value))}
            >
              {[0, 10, 15, 30].map((value) => (
                <option key={value} value={value}>
                  {value} minutes
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Timezone</Label>
          <TimezoneSelect name="timezone" defaultValue={zone} />
        </div>
        <p className="text-xs text-[#8a8a8a]">
          {calendar.connected
            ? calendar.checked
              ? "Google Calendar is connected. Busy times are skipped automatically."
              : "Calendar is connected but we couldn’t read free/busy just now. Booking will wait until the check succeeds."
            : "No external calendar connected. Bookable times use your AllyCircle hours and existing interviews only."}
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-4">
        <p className="text-sm font-medium text-white">Calendar preview</p>
        <p className="text-sm text-[#b3b3b3]">
          Gold dates currently have at least one bookable interview slot from these hours. Grey dates are closed.
        </p>
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="text-sm text-[#d4af37]"
            onClick={() =>
              setCursor((current) => {
                const month = current.month === 0 ? 11 : current.month - 1;
                const year = current.month === 0 ? current.year - 1 : current.year;
                return { year, month };
              })
            }
          >
            Previous
          </button>
          <p className="font-serif text-lg">{title}</p>
          <button
            type="button"
            className="text-sm text-[#d4af37]"
            onClick={() =>
              setCursor((current) => {
                const month = current.month === 11 ? 0 : current.month + 1;
                const year = current.month === 11 ? current.year + 1 : current.year;
                return { year, month };
              })
            }
          >
            Next
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-[#8a8a8a]">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            if (!cell.day) return <div key={cell.key} />;
            const open = livePreview.includes(cell.key);
            return (
              <div
                key={cell.key}
                className={`flex h-10 items-center justify-center rounded-md text-sm ${
                  open ? "border border-[#d4af37]/50 text-white" : "text-[#4a4a4a]"
                }`}
              >
                {cell.day}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <SaveButton label="Save availability" />
      </div>
      </form>
      <form action={resetAction}>
        <Button type="submit" variant="ghost">
          Reset hours
        </Button>
      </form>
    </div>
  );
}
