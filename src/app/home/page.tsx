import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { getHomeData } from "@/lib/server/allies";
import { getAttentionCounts } from "@/lib/server/attention";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatInTimeZone } from "@/lib/domain/timezone";
import { formatLabel } from "@/lib/domain/copy";

export default async function HomePage() {
  const current = await getSessionUser();
  if (!current) redirect("/login");
  if (!current.emailVerified) redirect("/verify-email");
  const data = await getHomeData();
  if (data.needsOnboarding) redirect("/onboarding");
  const attention = await getAttentionCounts();
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
          <Link href="/allies" className={cn(buttonVariants(), "mt-6 h-11 px-5 gold-outline")}>
            Find People
          </Link>
        </section>
      ) : (
        <p className="mt-2 max-w-2xl text-[#a0a0a0]">Find someone in your field, agree a time, and run the session.</p>
      )}
      {data.takingABreak ? (
        <p className="mt-4 rounded-lg border border-[#2d2d2d] bg-[#1e1e1e] p-3 text-sm text-[#a0a0a0]">
          You’re taking a break from new requests. Existing sessions stay on your calendar.
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        {attention.unreadMessages > 0 ? (
          <Link href="/messages" className="rounded-full border border-[#d4af37]/40 px-3 py-1 text-[#d4af37]">
            Messages · {attention.unreadMessages}
          </Link>
        ) : null}
        {attention.practiceAction > 0 ? (
          <Link href="/practice?tab=requests" className="rounded-full border border-[#d4af37]/40 px-3 py-1 text-[#d4af37]">
            Practice · {attention.practiceAction}
          </Link>
        ) : null}
        {attention.unreadNotifications > 0 ? (
          <Link href="/notifications" className="rounded-full border border-[#2d2d2d] px-3 py-1 text-[#a0a0a0]">
            Notifications · {attention.unreadNotifications}
          </Link>
        ) : null}
      </div>

      {data.nextSession ? (
        <section className="mt-8 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
          <p className="text-sm text-[#a0a0a0]">Upcoming session</p>
          <p className="mt-2 text-lg font-medium">{data.nextSession.otherName}</p>
          <p className="mt-1 text-sm text-[#a0a0a0]">
            {formatInTimeZone(data.nextSession.startUtc, timezone)} · {formatLabel(data.nextSession.format, "detail")}
          </p>
          <Link href={`/practice/sessions/${data.nextSession.id}`} className="mt-3 inline-block text-sm text-[#d4af37]">
            Open session
          </Link>
        </section>
      ) : null}
    </AppShell>
  );
}
