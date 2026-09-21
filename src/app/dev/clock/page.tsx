import { redirect } from "next/navigation";
import Link from "next/link";
import { getNow } from "@/lib/db";
import { getDb } from "@/lib/db";
import { timeOverrides } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { setClockAction } from "@/app/actions/app";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

function toLocalInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function ClockPage() {
  if (process.env.NODE_ENV === "production") redirect("/");
  const now = await getNow();
  const db = await getDb();
  const [override] = await db.select().from(timeOverrides).where(eq(timeOverrides.id, "global")).limit(1);

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Logo href="/home" />
      <h1 className="mt-8 text-3xl font-semibold">Preview clock</h1>
      <p className="mt-2 text-sm text-[#a0a0a0]">
        Join Session opens 15 minutes before the start time. Jump the server clock here so you can test that window
        without waiting. Reminders and request expiry also follow this clock.
      </p>
      <p className="mt-6 text-sm">
        Current app time: <span className="font-medium">{now.toISOString()}</span>
      </p>
      <p className="mt-2 text-sm text-[#a0a0a0]">
        {override?.nowIso ? "Override is on." : "Using the real clock."}
      </p>
      <form action={setClockAction} className="mt-6 space-y-3 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
        <input type="hidden" name="intent" value="set" />
        <label className="block text-sm">
          Jump to
          <input
            type="datetime-local"
            name="nowLocal"
            defaultValue={toLocalInputValue(now)}
            className="mt-2 h-10 w-full rounded-lg border border-[#2d2d2d] bg-[#111] px-3 text-sm"
            required
          />
        </label>
        <Button type="submit" className="gold-outline">
          Set preview clock
        </Button>
      </form>
      <form action={setClockAction} className="mt-3">
        <input type="hidden" name="intent" value="clear" />
        <Button type="submit" variant="outline">
          Use real time again
        </Button>
      </form>
      <p className="mt-8 text-sm">
        <Link href="/dev/inbox" className="text-[#d4af37]">
          Development inbox
        </Link>
      </p>
    </div>
  );
}
