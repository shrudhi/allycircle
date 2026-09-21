"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

export type BookableSlotView = {
  startIso: string;
  dateKey: string;
  dateLabel: string;
  timeLabel: string;
};

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

export function RequestForm({
  action,
  allyId,
  canSwap,
  interviewSlots,
}: {
  action: (formData: FormData) => void | Promise<void>;
  allyId: string;
  canSwap: boolean;
  interviewSlots: BookableSlotView[];
}) {
  const byDate = useMemo(() => {
    const map = new Map<string, BookableSlotView[]>();
    for (const slot of interviewSlots) {
      const current = map.get(slot.dateKey) || [];
      current.push(slot);
      map.set(slot.dateKey, current);
    }
    return map;
  }, [interviewSlots]);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [dateKey, setDateKey] = useState("");
  const [startIso, setStartIso] = useState("");
  const times = dateKey ? byDate.get(dateKey) || [] : [];
  const title = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(cursor.year, cursor.month, 1)
  );
  const cells = monthCells(cursor.year, cursor.month);

  return (
    <form action={action} className="mt-8 space-y-8 rounded-2xl border border-white/10 bg-[#141414] p-6">
      <input type="hidden" name="allyId" value={allyId} />
      <input type="hidden" name="startIso" value={startIso} />
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[#d4af37]">Step 1</p>
        <h2 className="mt-2 font-serif text-2xl">Select a date</h2>
        <p className="mt-1 text-sm text-[#b3b3b3]">Gold dates follow their published hours. Grey dates are closed.</p>
        <div className="mt-4 flex items-center justify-between">
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
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-[#8a8a8a]">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            if (!cell.day) return <div key={cell.key} />;
            const open = byDate.has(cell.key);
            const selected = dateKey === cell.key;
            return (
              <button
                key={cell.key}
                type="button"
                disabled={!open}
                onClick={() => {
                  setDateKey(cell.key);
                  setStartIso("");
                }}
                className={`h-10 rounded-md text-sm ${
                  selected
                    ? "bg-[#d4af37] text-black"
                    : open
                      ? "border border-[#d4af37]/50 text-white hover:bg-white/5"
                      : "text-[#4a4a4a]"
                }`}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
      </div>
      {dateKey ? (
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#d4af37]">Step 2</p>
          <h2 className="mt-2 font-serif text-2xl">Available times</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {times.map((slot) => (
              <button
                key={slot.startIso}
                type="button"
                onClick={() => setStartIso(slot.startIso)}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  startIso === slot.startIso ? "border-[#d4af37] bg-[#d4af37] text-black" : "border-white/15"
                }`}
              >
                {slot.timeLabel}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#b3b3b3]">Choose an available date to see times.</p>
      )}
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[#d4af37]">Step 3</p>
        <h2 className="mt-2 font-serif text-2xl">Request details</h2>
        <p className="mt-2 text-sm text-[#b3b3b3]">They interview you for 30 minutes.</p>
        {canSwap ? (
          <label className="mt-3 flex items-start gap-2 text-sm">
            <input type="checkbox" name="openToTwoWay" className="mt-1" />
            <span>I’m open to interviewing you too. This stays one-way until you both agree.</span>
          </label>
        ) : null}
        <textarea
          name="message"
          className="mt-4 min-h-28 w-full rounded-lg border border-white/15 bg-black p-3 text-sm"
          placeholder="Interview stage, company, or topic (optional)"
        />
      </div>
      <Button type="submit" className="gold-outline h-11 px-6" disabled={!startIso}>
        Send request
      </Button>
    </form>
  );
}
