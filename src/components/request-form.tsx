"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

export type BookableSlotView = {
  startIso: string;
  dateKey: string;
  dateLabel: string;
  timeLabel: string;
};

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
  const dates = useMemo(() => {
    const map = new Map<string, { label: string; times: BookableSlotView[] }>();
    for (const slot of interviewSlots) {
      const current = map.get(slot.dateKey) || { label: slot.dateLabel, times: [] };
      current.times.push(slot);
      map.set(slot.dateKey, current);
    }
    return [...map.entries()];
  }, [interviewSlots]);
  const [dateKey, setDateKey] = useState(dates[0]?.[0] || "");
  const [startIso, setStartIso] = useState("");
  const selected = dates.find(([key]) => key === dateKey) || dates[0];

  useEffect(() => {
    setDateKey(dates[0]?.[0] || "");
    setStartIso("");
  }, [dates]);

  return (
    <form action={action} className="mt-8 space-y-6 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-6">
      <input type="hidden" name="allyId" value={allyId} />
      <input type="hidden" name="startIso" value={startIso} />
      <div>
        <p className="text-sm font-medium">1. Choose a date they already opened</p>
        {dates.length === 0 ? (
          <p className="mt-3 text-sm text-[#a0a0a0]">They haven’t published hours yet. Send the request and they can suggest a time.</p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {dates.map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setDateKey(key);
                  setStartIso("");
                }}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  selected?.[0] === key ? "border-[#d4af37] text-[#d4af37]" : "border-[#2d2d2d] text-[#a0a0a0]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {selected ? (
        <div>
          <p className="text-sm font-medium">2. Choose a time</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {selected[1].times.map((slot) => (
              <button
                key={slot.startIso}
                type="button"
                onClick={() => setStartIso(slot.startIso)}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  startIso === slot.startIso ? "border-[#d4af37] text-[#d4af37]" : "border-[#2d2d2d]"
                }`}
              >
                {slot.timeLabel}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div>
        <p className="text-sm font-medium">3. Request details</p>
        <p className="mt-1 text-sm text-[#a0a0a0]">They interview you for 30 minutes. That’s the default.</p>
        {canSwap ? (
          <label className="mt-3 flex items-start gap-2 text-sm">
            <input type="checkbox" name="openToTwoWay" className="mt-1" />
            <span>I’m open to interviewing you too. This stays one-way until you both agree to add 30 minutes.</span>
          </label>
        ) : null}
      </div>
      <div>
        <label className="text-sm">Optional message</label>
        <textarea
          name="message"
          className="mt-2 min-h-28 w-full rounded-lg border border-[#2d2d2d] bg-[#111] p-3 text-sm"
          placeholder="Interview stage, company, or topic"
        />
      </div>
      <Button type="submit" className="gold-outline">
        Send request
      </Button>
    </form>
  );
}
