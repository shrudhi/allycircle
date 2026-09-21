import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { listMySessions } from "@/lib/server/sessions";
import { listRequests } from "@/lib/server/requests";
import { formatInTimeZone } from "@/lib/domain/timezone";
import { formatLabel, requestStateLabel, sessionStateLabel } from "@/lib/domain/copy";
import { cn } from "@/lib/utils";

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const current = await getSessionUser();
  if (!current?.profile) redirect("/login");
  const { tab: rawTab } = await searchParams;
  const tab = ["upcoming", "requests", "history"].includes(rawTab || "") ? rawTab : "upcoming";
  const [sessions, requests] = await Promise.all([listMySessions(), listRequests()]);
  const upcoming = sessions.filter((row) => row.state === "scheduled" || row.state === "awaiting_attendance");
  const history = sessions.filter((row) => ["completed", "did_not_happen", "cancelled"].includes(row.state));
  const tabs = [
    { id: "upcoming", label: "Upcoming", count: upcoming.length },
    { id: "requests", label: "Requests", count: requests.length },
    { id: "history", label: "History", count: history.length },
  ];

  return (
    <AppShell name={current.profile.fullName}>
      <h1 className="text-3xl font-semibold">My Practice</h1>
      <p className="mt-2 text-sm text-[#a0a0a0]">Sessions, asks, and what you’ve already done — in one place.</p>
      <div className="mt-6 flex gap-1 rounded-xl border border-[#2d2d2d] bg-[#161616] p-1">
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={`/practice?tab=${item.id}`}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-center text-sm",
              tab === item.id ? "bg-[#1e1e1e] text-[#d4af37]" : "text-[#a0a0a0]"
            )}
          >
            {item.label}
            <span className="ml-1 text-xs opacity-70">{item.count}</span>
          </Link>
        ))}
      </div>

      {tab === "upcoming" ? (
        <div className="mt-6 space-y-3">
          {upcoming.length === 0 ? (
            <p className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-6 text-sm text-[#a0a0a0]">
              No confirmed sessions yet. Find an ally and send a time.
            </p>
          ) : null}
          {upcoming.map((session) => (
            <Link key={session.id} href={`/practice/sessions/${session.id}`} className="gold-outline block rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-4">
              <p className="font-medium">{session.otherName}</p>
              <p className="text-sm text-[#a0a0a0]">
                {formatInTimeZone(session.startUtc, current.profile.timezone)} · {formatLabel(session.format)}
              </p>
              {session.pendingRescheduleStartUtc ? (
                <p className="mt-2 text-sm text-[#d4af37]">A new time is waiting for confirmation</p>
              ) : null}
              {session.joinOpen ? <p className="mt-2 text-sm text-[#d4af37]">Join Session is available</p> : null}
            </Link>
          ))}
        </div>
      ) : null}

      {tab === "requests" ? (
        <div className="mt-6 space-y-3">
          {requests.length === 0 ? (
            <p className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-6 text-sm text-[#a0a0a0]">
              No practice requests yet. When you send or receive one, it shows up here.
            </p>
          ) : null}
          {requests.map((request) => (
            <Link key={request.id} href={`/practice/requests/${request.id}`} className="block rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-4">
              <p className="font-medium">{request.otherName}</p>
              <p className="text-sm text-[#a0a0a0]">
                {request.direction === "sent" ? "You sent this" : "They sent this"} · {requestStateLabel(request.state)} ·{" "}
                {formatLabel(request.format)}
              </p>
            </Link>
          ))}
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="mt-6 space-y-3">
          {history.length === 0 ? (
            <p className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-6 text-sm text-[#a0a0a0]">
              Completed sessions will show up here so you can practice again.
            </p>
          ) : null}
          {history.map((session) => (
            <div key={session.id} className="flex flex-col gap-3 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-4 sm:flex-row sm:items-center sm:justify-between">
              <Link href={`/practice/sessions/${session.id}`} className="min-w-0">
                <p className="font-medium">{session.otherName}</p>
                <p className="text-sm text-[#a0a0a0]">
                  {formatInTimeZone(session.startUtc, current.profile.timezone)} · {sessionStateLabel(session.state)}
                </p>
              </Link>
              <Link href={`/allies/${session.otherId}/request`} className="text-sm text-[#d4af37]">
                Practice again
              </Link>
            </div>
          ))}
        </div>
      ) : null}
    </AppShell>
  );
}
