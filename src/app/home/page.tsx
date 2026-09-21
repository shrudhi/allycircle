import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { getHomeData } from "@/lib/server/allies";
import { listRequests } from "@/lib/server/requests";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatInTimeZone } from "@/lib/domain/timezone";

export default async function HomePage() {
  const current = await getSessionUser();
  if (!current) redirect("/login");
  if (!current.emailVerified) redirect("/verify-email");
  const data = await getHomeData();
  if (data.needsOnboarding) redirect("/onboarding");
  const requests = await listRequests();
  const needsAction = requests.filter(
    (row) => row.direction === "received" && ["pending", "alternate_time_proposed"].includes(row.state)
  )[0];
  const timezone = current.profile?.timezone || "UTC";

  return (
    <AppShell name={data.name}>
      <p className="text-xs uppercase tracking-[0.16em] text-[#d4af37]">Home</p>
      <h1 className="mt-2 text-3xl font-semibold">Welcome back, {data.name.split(" ")[0]}.</h1>
      {data.isNew ? (
        <section className="mt-8 rounded-3xl border border-[#d4af37]/40 bg-[#1e1e1e] p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.16em] text-[#d4af37]">Your next step</p>
          <h2 className="mt-3 max-w-2xl text-2xl font-semibold md:text-3xl">
            Find someone who can interview you in {data.fieldLabel}
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-[#a0a0a0] md:text-base">
            Pick a person, send a time that works, and get a real mock interview on the calendar. You don’t need a polished
            resume — just 30 minutes and a topic you want to practice.
          </p>
          <Link href="/allies" className={cn(buttonVariants(), "mt-6 h-11 px-5 gold-outline")}>
            Find an Ally
          </Link>
        </section>
      ) : (
        <p className="mt-2 max-w-2xl text-[#a0a0a0]">
          Find someone in your field, agree a time, and run the session. We’ll keep the admin quiet so you can focus on the practice.
        </p>
      )}
      {data.takingABreak ? (
        <p className="mt-4 rounded-lg border border-[#2d2d2d] bg-[#1e1e1e] p-3 text-sm text-[#a0a0a0]">
          You’re taking a break from new requests. Existing sessions stay on your calendar.
        </p>
      ) : null}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
          <p className="text-sm text-[#a0a0a0]">Next session</p>
          {data.nextSession ? (
            <>
              <p className="mt-2 font-medium">{formatInTimeZone(data.nextSession.startUtc, timezone)}</p>
              <Link href={`/practice/sessions/${data.nextSession.id}`} className="mt-3 inline-block text-sm text-[#d4af37]">
                View details
              </Link>
            </>
          ) : (
            <p className="mt-2 text-sm">Nothing confirmed yet. Find an ally when you’re ready.</p>
          )}
        </div>
        <div className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
          <p className="text-sm text-[#a0a0a0]">Needs a reply</p>
          {needsAction ? (
            <>
              <p className="mt-2 font-medium">{needsAction.otherName}</p>
              <Link href={`/practice/requests/${needsAction.id}`} className="mt-3 inline-block text-sm text-[#d4af37]">
                Review request
              </Link>
            </>
          ) : (
            <p className="mt-2 text-sm">You’re all caught up.</p>
          )}
        </div>
        <div className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
          <p className="text-sm text-[#a0a0a0]">Your record</p>
          <p className="mt-2 text-sm">See interviews you’ve given, pending asks, and notes people left for you.</p>
          <Link href="/record" className="mt-3 inline-block text-sm text-[#d4af37]">
            Open your record
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
