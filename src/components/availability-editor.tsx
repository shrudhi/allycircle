"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const weekdays = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

export function AvailabilityEditor({
  action,
  removeAction,
  windows,
}: {
  action: (formData: FormData) => void | Promise<void>;
  removeAction: (formData: FormData) => void | Promise<void>;
  windows: { id: string; weekday: number; startMinutes: number; endMinutes: number }[];
}) {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function hourLabel(minutes: number) {
    const hour = Math.floor(minutes / 60);
    const min = String(minutes % 60).padStart(2, "0");
    const suffix = hour >= 12 ? "PM" : "AM";
    const display = hour % 12 === 0 ? 12 : hour % 12;
    return `${display}:${min} ${suffix}`;
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-[#a0a0a0]">
        Set the days and hours you’re usually free, like working hours in Teams. People will only see times at least 24 hours
        from now, for the next two weeks.
      </p>
      <form action={action} className="space-y-4">
        <div>
          <Label>Days you’re free</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {weekdays.map((day) => (
              <label key={day.value} className="flex items-center gap-2 rounded-full border border-[#2d2d2d] px-3 py-1 text-sm">
                <input type="checkbox" name="weekdays" value={day.value} defaultChecked={day.value >= 1 && day.value <= 5} />
                {day.label}
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startTime">From</Label>
            <Input id="startTime" name="startTime" type="time" defaultValue="18:00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime">To</Label>
            <Input id="endTime" name="endTime" type="time" defaultValue="21:00" />
          </div>
        </div>
        <Button type="submit" variant="outline">
          Save these hours
        </Button>
      </form>
      <div className="space-y-2">
        <p className="text-sm font-medium">Your weekly hours</p>
        {windows.length === 0 ? <p className="text-sm text-[#a0a0a0]">None yet — allies will ask you to suggest a time.</p> : null}
        {windows.map((window) => (
          <form key={window.id} action={removeAction} className="flex items-center justify-between gap-3 rounded-xl border border-[#2d2d2d] px-3 py-2 text-sm">
            <input type="hidden" name="windowId" value={window.id} />
            <p>
              {labels[window.weekday]} {hourLabel(window.startMinutes)}–{hourLabel(window.endMinutes)}
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
