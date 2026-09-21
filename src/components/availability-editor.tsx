"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const weekdays = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

function hourLabel(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const min = String(minutes % 60).padStart(2, "0");
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${min} ${suffix}`;
}

export function AvailabilityEditor({
  action,
  removeAction,
  periodAction,
  windows,
  availableFrom,
  availableUntil,
}: {
  action: (formData: FormData) => void | Promise<void>;
  removeAction: (formData: FormData) => void | Promise<void>;
  periodAction: (formData: FormData) => void | Promise<void>;
  windows: { id: string; weekday: number; startMinutes: number; endMinutes: number }[];
  availableFrom?: string | null;
  availableUntil?: string | null;
}) {
  const labels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const [slots, setSlots] = useState([{ start: "09:00", end: "10:00" }]);

  return (
    <div className="space-y-8">
      <form action={periodAction} className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-4">
        <p className="text-sm font-medium text-white">Recommendation window</p>
        <p className="text-sm text-[#b3b3b3]">
          Only recommend you to peers for dates inside this period. Leave blank to use the default booking horizon.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="availableFrom">Available from</Label>
            <Input id="availableFrom" name="availableFrom" type="date" defaultValue={availableFrom || ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="availableUntil">Available until</Label>
            <Input id="availableUntil" name="availableUntil" type="date" defaultValue={availableUntil || ""} />
          </div>
        </div>
        <Button type="submit" variant="outline">
          Save period
        </Button>
      </form>

      <form action={action} className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-4">
        <p className="text-sm font-medium text-white">Hours by day</p>
        <p className="text-sm text-[#b3b3b3]">
          Pick a weekday, then add as many interview slots as you want for that day. Repeat for other days.
        </p>
        <div className="space-y-2">
          <Label htmlFor="weekday">Day</Label>
          <select id="weekday" name="weekday" className="h-10 w-full rounded-lg border border-white/15 bg-[#0a0a0a] px-3 text-sm" defaultValue="2">
            {weekdays.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-3">
          {slots.map((slot, index) => (
            <div key={`${slot.start}-${index}`} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Slot {index + 1} starts</Label>
                <Input name="startTime" type="time" defaultValue={slot.start} />
              </div>
              <div className="space-y-2">
                <Label>Slot {index + 1} ends</Label>
                <Input name="endTime" type="time" defaultValue={slot.end} />
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="text-sm text-[#d4af37]"
          onClick={() => setSlots((current) => [...current, { start: "18:00", end: "19:00" }])}
        >
          Add another slot for this day
        </button>
        <div>
          <Button type="submit" className="gold-outline">
            Save slots for this day
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        <p className="text-sm font-medium text-white">Published weekly hours</p>
        {windows.length === 0 ? (
          <p className="text-sm text-[#b3b3b3]">None yet — peers will ask you to suggest a time.</p>
        ) : null}
        {windows.map((window) => (
          <form key={window.id} action={removeAction} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2 text-sm">
            <input type="hidden" name="windowId" value={window.id} />
            <p>
              {labels[window.weekday]} · {hourLabel(window.startMinutes)}–{hourLabel(window.endMinutes)}
            </p>
            <Button type="submit" variant="ghost" size="sm">
              Remove
            </Button>
          </form>
        ))}
      </div>
    </div>
  );
}
