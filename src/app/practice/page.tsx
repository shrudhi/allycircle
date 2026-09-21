import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { listMySessions } from "@/lib/server/sessions";
import { listRequests } from "@/lib/server/requests";
import { getAttentionCounts } from "@/lib/server/attention";
import { formatInTimeZone } from "@/lib/domain/timezone";
import { formatLabel, requestStateLabel, sessionStateLabel } from "@/lib/domain/copy";
import { cn } from "@/lib/utils";
import { productConfig } from "@/lib/config/product";

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; inbox?: string; filter?: string }>;
}) {
  const current = await getSessionUser();
  if (!current?.profile) redirect("/login");
  const { tab: rawTab, inbox: rawInbox, filter } = await searchParams;
  const tab = ["upcoming", "requests", "history"].includes(rawTab || "") ? rawTab : "upcoming";
  const inbox = rawInbox === "sent" ? "sent" : "received";
  const [sessions, requests, attention] = await Promise.all([listMySessions(), listRequests(), getAttentionCounts()]);
  const upcoming = sessions.filter((row) => row.state === "scheduled" || row.state === "awaiting_attendance");
  const history = sessions.filter((row) => ["completed", "did_not_happen", "cancelled"].includes(row.state));
  const received = requests.filter((row) => row.direction === "received");
  const sent = requests.filter((row) => row.direction === "sent");
  const filteredUpcoming = upcoming.filter((row) => {
    if (filter === "interviewing_me") return row.format === "interview_me" && row.candidateId === current.id;
    if (filter === "two_way") return row.format === "reciprocal_swap";
    return true;
  });

  const tabs = [
    { id: "upcoming", label: "Upcoming", href: "/practice?tab=upcoming" },
    { id: "requests", label: "Requests", href: "/practice?tab=requests", count: attention.receivedAction + attention.sentAction },
    { id: "history", label: "History", href: "/practice?tab=history" },
  ];

  return (
    <AppShell name={current.profile.fullName}>
      <h1 className="text-3xl font-semibold">Practice</h1>
      <p className="mt-2 text-sm text-[#a0a0a0]">Requests, sessions, and history in one place.</p>
      <div className="mt-6 flex gap-1 rounded-xl border border-[#2d2d2d] bg-[#161616] p-1">
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-center text-sm",
              tab === item.id ? "bg-[#1e1e1e] text-[#d4af37]" : "text-[#a0a0a0]"
            )}
          >
            {item.label}
            {item.count ? <span className="ml-1 text-xs">{item.count}</span> : null}
          </Link>
        ))}
      </div>

      {tab === "upcoming" ? (
        <div className="mt-6 space-y-3">
          <div className="flex gap-3 text-sm">
            <Link href="/practice?tab=upcoming" className={!filter ? "text-[#d4af37]" : "text-[#a0a0a0]"}>All</Link>
            <Link href="/practice?tab=upcoming&filter=interviewing_me" className={filter === "interviewing_me" ? "text-[#d4af37]" : "text-[#a0a0a0]"}>
              Interviewing me
            </Link>
            <Link href="/practice?tab=upcoming&filter=two_way" className={filter === "two_way" ? "text-[#d4af37]" : "text-[#a0a0a0]"}>
              Two-way
            </Link>
          </div>
          {filteredUpcoming.length === 0 ? (
            <p className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-6 text-sm text-[#a0a0a0]">
              No confirmed sessions yet. Find someone and send a time.
            </p>
          ) : null}
          {filteredUpcoming.map((session) => {
            const duration = Math.round((session.endUtc.getTime() - session.startUtc.getTime()) / 60000);
            const unread = attention.unreadByOther.has(session.otherId);
            const actionRequired = Boolean(
              session.pendingRescheduleStartUtc && session.pendingRescheduleBy !== current.id
            ) || session.state === "awaiting_attendance" || (session.pendingTwoWayBy && session.pendingTwoWayBy !== current.id);
            return (
              <Link key={session.id} href={`/practice/with/${session.otherId}`} className="gold-outline block rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-4">
                <p className="font-medium">{session.otherName}</p>
                <p className="text-sm text-[#a0a0a0]">
                  {formatInTimeZone(session.startUtc, current.profile.timezone)} · {duration} min · {formatLabel(session.format)}
                </p>
                <p className="mt-1 text-sm text-[#a0a0a0]">
                  {session.format === "reciprocal_swap"
                    ? `They interview you ${productConfig.interviewMeMinutes} min, then you interview them ${productConfig.interviewMeMinutes} min`
                    : "They interview you"}
                </p>
                {unread ? <p className="mt-2 text-xs text-[#d4af37]">New message</p> : null}
                {actionRequired ? <p className="mt-1 text-xs text-[#d4af37]">Action required</p> : null}
                {session.joinOpen ? <p className="mt-1 text-sm text-[#d4af37]">Join is available</p> : null}
              </Link>
            );
          })}
        </div>
      ) : null}

      {tab === "requests" ? (
        <div className="mt-6 space-y-3">
          <div className="flex gap-3 text-sm">
            <Link href="/practice?tab=requests&inbox=received" className={inbox === "received" ? "text-[#d4af37]" : "text-[#a0a0a0]"}>
              Received{attention.receivedAction ? ` · ${attention.receivedAction}` : ""}
            </Link>
            <Link href="/practice?tab=requests&inbox=sent" className={inbox === "sent" ? "text-[#d4af37]" : "text-[#a0a0a0]"}>
              Sent{attention.sentAction ? ` · ${attention.sentAction}` : ""}
            </Link>
          </div>
          {(inbox === "received" ? received : sent).length === 0 ? (
            <p className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-6 text-sm text-[#a0a0a0]">
              {inbox === "received" ? "No incoming requests." : "You haven’t sent a request yet."}
            </p>
          ) : null}
          {(inbox === "received" ? received : sent).map((request) => {
            const unread = attention.unreadByOther.has(request.requesterId === current.id ? request.receiverId : request.requesterId);
            const otherId = request.requesterId === current.id ? request.receiverId : request.requesterId;
            const action =
              (inbox === "received" && ["pending", "alternate_time_proposed", "time_unavailable"].includes(request.state)) ||
              (inbox === "sent" && ["alternate_time_proposed", "time_unavailable"].includes(request.state)) ||
              (request.pendingTwoWayBy && request.pendingTwoWayBy !== current.id);
            return (
              <Link key={request.id} href={`/practice/with/${otherId}`} className="block rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-4">
                <p className="font-medium">{request.otherName}</p>
                <p className="text-sm text-[#a0a0a0]">
                  {request.proposedStartUtc ? formatInTimeZone(request.proposedStartUtc, current.profile.timezone) : "Time not set"} · {formatLabel(request.format)} · {requestStateLabel(request.state)}
                </p>
                {request.message ? <p className="mt-2 line-clamp-2 text-sm text-[#a0a0a0]">{request.message}</p> : null}
                {request.openToTwoWay ? <p className="mt-2 text-xs text-[#d4af37]">Open to two-way</p> : null}
                {unread ? <p className="mt-2 text-xs text-[#d4af37]">New message</p> : null}
                {action ? <p className="mt-1 text-xs text-[#d4af37]">Action required</p> : null}
              </Link>
            );
          })}
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="mt-6 space-y-3">
          {history.length === 0 ? (
            <p className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-6 text-sm text-[#a0a0a0]">
              Completed sessions will show up here.
            </p>
          ) : null}
          {history.map((session) => (
            <Link key={session.id} href={`/practice/with/${session.otherId}`} className="block rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-4">
              <p className="font-medium">{session.otherName}</p>
              <p className="text-sm text-[#a0a0a0]">
                {formatInTimeZone(session.startUtc, current.profile.timezone)} · {formatLabel(session.format)} · {sessionStateLabel(session.state)}
              </p>
            </Link>
          ))}
        </div>
      ) : null}
    </AppShell>
  );
}
