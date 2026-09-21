"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatHint, formatLabel } from "@/lib/domain/copy";

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
  swapSlots,
}: {
  action: (formData: FormData) => void | Promise<void>;
  allyId: string;
  canSwap: boolean;
  interviewSlots: BookableSlotView[];
  swapSlots: BookableSlotView[];
}) {
  const [format, setFormat] = useState<"interview_me" | "reciprocal_swap">("interview_me");
  const slots = format === "reciprocal_swap" ? swapSlots : interviewSlots;
  const dates = useMemo(() => {
    const map = new Map<string, { label: string; times: BookableSlotView[] }>();
    for (const slot of slots) {
      const current = map.get(slot.dateKey) || { label: slot.dateLabel, times: [] };
      current.times.push(slot);
      map.set(slot.dateKey, current);
    }
    return [...map.entries()];
  }, [slots]);
  const [dateKey, setDateKey] = useState("");
  const [startIso, setStartIso] = useState("");

  useEffect(() => {
    setDateKey(dates[0]?.[0] || "");
    setStartIso("");
  }, [format, dates]);

  const selected = dates.find(([key]) => key === dateKey) || dates[0];

  return (
    <form action={action} className="mt-8 space-y-6 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-6">
      <input type="hidden" name="allyId" value={allyId} />
      <input type="hidden" name="format" value={format} />
      <input type="hidden" name="startIso" value={startIso} />
      <div className="space-y-3">
        <p className="text-sm font-medium">How do you want to practice?</p>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#2d2d2d] p-3 text-sm has-[:checked]:border-[#d4af37]/50">
          <input
            type="radio"
            name="formatChoice"
            checked={format === "interview_me"}
            onChange={() => setFormat("interview_me")}
          />
          <span>
            <span className="font-medium">{formatLabel("interview_me", "detail")}</span>
            <span className="mt-1 block text-[#a0a0a0]">{formatHint("interview_me")}</span>
          </span>
        </label>
        {canSwap ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#2d2d2d] p-3 text-sm has-[:checked]:border-[#d4af37]/50">
            <input
              type="radio"
              name="formatChoice"
              checked={format === "reciprocal_swap"}
              onChange={() => setFormat("reciprocal_swap")}
            />
            <span>
              <span className="font-medium">{formatLabel("reciprocal_swap", "detail")}</span>
              <span className="mt-1 block text-[#a0a0a0]">{formatHint("reciprocal_swap")}</span>
            </span>
          </label>
        ) : (
          <p className="text-sm text-[#a0a0a0]">Taking turns isn’t available with this person yet — they can still interview you.</p>
        )}
      </div>
      <div>
        <p className="text-sm font-medium">Pick a date, then a time they already opened</p>
        <p className="mt-1 text-xs text-[#a0a0a0]">
          These come from their weekly hours. You can also send the request without a time and let them suggest one.
        </p>
        {dates.length === 0 ? (
          <p className="mt-4 text-sm text-[#a0a0a0]">They haven’t published hours that fit this format yet. Send the request and they can propose a time.</p>
        ) : (
          <>
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
            <div className="mt-4 flex flex-wrap gap-2">
              {(selected?.[1].times || []).map((slot) => (
                <button
                  key={slot.startIso}
                  type="button"
                  onClick={() => setStartIso(startIso === slot.startIso ? "" : slot.startIso)}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    startIso === slot.startIso ? "border-[#d4af37] text-[#d4af37]" : "border-[#2d2d2d]"
                  }`}
                >
                  {slot.timeLabel}
                </button>
              ))}
            </div>
            {startIso ? (
              <p className="mt-3 text-xs text-[#a0a0a0]">Selected. You can still send without a time by clicking the time again.</p>
            ) : (
              <button type="button" className="mt-3 text-xs text-[#d4af37]" onClick={() => setStartIso("")}>
                Send without a time
              </button>
            )}
          </>
        )}
      </div>
      <div>
        <label className="text-sm">Anything they’d find useful to know?</label>
        <textarea
          name="message"
          className="mt-2 min-h-28 w-full rounded-lg border border-[#2d2d2d] bg-[#111] p-3 text-sm"
          placeholder="Interview stage, company, question type, or topic"
        />
      </div>
      <Button type="submit" className="gold-outline">
        Send request
      </Button>
    </form>
  );
}
