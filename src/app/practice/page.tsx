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
  searchParams: Promise<{ tab?: string; inbox?: string; filter?: string; status?: string }>;
}) {
  const current = await getSessionUser();
  if (!current?.profile) redirect("/login");
  const { tab: rawTab, inbox: rawInbox, filter, status } = await searchParams;
  const tab = ["upcoming", "requests", "history"].includes(rawTab || "") ? rawTab : "upcoming";
  const inbox = rawInbox === "sent" ? "sent" : "received";
  const [sessions, requests, attention] = await Promise.all([listMySessions(), listRequests(), getAttentionCounts()]);
  const upcoming = sessions.filter((row) => row.state === "scheduled" || row.state === "awaiting_attendance");
  const closedRequests = requests.filter((row) =>
    ["declined", "cancelled", "expired", "time_unavailable"].includes(row.state)
  );
  const historySessions = sessions.filter((row) => ["completed", "did_not_happen", "cancelled"].includes(row.state));
  const received = requests.filter((row) => row.direction === "received" && ["pending", "alternate_time_proposed", "time_unavailable", "accepted", "converted_to_one_way"].includes(row.state));
  const sent = requests.filter((row) => row.direction === "sent" && ["pending", "alternate_time_proposed", "time_unavailable", "accepted", "converted_to_one_way"].includes(row.state));
  const filteredUpcoming = upcoming.filter((row) => {
    if (filter === "interviewing") {
      return row.interviewerId === current.id || row.format === "reciprocal_swap";
    }
    if (filter === "interviewing_me") {
      return row.candidateId === current.id || (row.format === "interview_me" && row.interviewerId !== current.id);
    }
    if (filter === "two_way") return row.format === "reciprocal_swap";
    return true;
  });
  const historyItems = [
    ...historySessions.map((row) => ({
      id: row.id,
      href: `/practice/with/${row.otherId}`,
      name: row.otherName,
      when: formatInTimeZone(row.startUtc, current.profile.timezone),
      status: sessionStateLabel(row.state),
      statusKey: row.state,
      detail: formatLabel(row.format),
    })),
    ...closedRequests.map((row) => ({
      id: `req-${row.id}`,
      href: `/practice/with/${row.requesterId === current.id ? row.receiverId : row.requesterId}`,
      name: row.otherName,
      when: row.proposedStartUtc ? formatInTimeZone(row.proposedStartUtc, current.profile.timezone) : "No time set",
      status: requestStateLabel(row.state),
      statusKey: row.state,
      detail: formatLabel(row.format),
    })),
  ].filter((item) => !status || item.statusKey === status);

  const tabs = [
    { id: "upcoming", label: "Upcoming", href: "/practice?tab=upcoming" },
    { id: "requests", label: "Requests", href: "/practice?tab=requests", count: attention.receivedAction + attention.sentAction },
    { id: "history", label: "History", href: "/practice?tab=history" },
  ];

  return (
    <AppShell name={current.profile.fullName}>
      <p className="text-xs uppercase tracking-[0.22em] text-[#d4af37]">Sessions</p>
      <h1 className="mt-3 font-serif text-4xl">The calendar</h1>
      <p className="mt-2 text-sm text-[#b3b3b3]">Confirmed interviews, outstanding requests, and the record of what already happened.</p>
      <div className="mt-8 grid grid-cols-3 gap-2 border-b border-white/10">
        {tabs.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className={cn(
              "border-b-2 px-3 py-3 text-center text-sm",
              tab === item.id ? "border-[#d4af37] text-white" : "border-transparent text-[#8a8a8a]"
            )}
          >
            {item.label}
            {item.count ? <span className="ml-2 rounded-full bg-[#d4af37] px-2 text-[10px] text-black">{item.count}</span> : null}
          </a>
        ))}
      </div>

      {tab === "upcoming" ? (
        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap gap-2 text-sm">
            {[
              { id: "", label: "All" },
              { id: "interviewing_me", label: "Interviewing me" },
              { id: "interviewing", label: "I’m interviewing" },
              { id: "two_way", label: "Two-way" },
            ].map((item) => (
              <a
                key={item.id || "all"}
                href={item.id ? `/practice?tab=upcoming&filter=${item.id}` : "/practice?tab=upcoming"}
                className={cn(
                  "rounded-full border px-3 py-1",
                  (filter || "") === item.id ? "border-[#d4af37] text-[#d4af37]" : "border-white/15 text-[#8a8a8a]"
                )}
              >
                {item.label}
              </a>
            ))}
          </div>
          {filteredUpcoming.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-[#141414] p-6 text-sm text-[#b3b3b3]">No confirmed sessions in this view.</p>
          ) : null}
          {filteredUpcoming.map((session) => {
            const duration = Math.round((session.endUtc.getTime() - session.startUtc.getTime()) / 60000);
            const unread = attention.unreadByOther.has(session.otherId);
            return (
              <a key={session.id} href={`/practice/with/${session.otherId}`} className="block rounded-2xl border border-white/10 bg-[#141414] p-5">
                <p className="font-serif text-xl">{session.otherName}</p>
                <p className="mt-2 text-sm text-[#b3b3b3]">
                  {formatInTimeZone(session.startUtc, current.profile.timezone)} · {duration} min · {formatLabel(session.format)}
                </p>
                <p className="mt-1 text-sm text-[#8a8a8a]">
                  {session.format === "reciprocal_swap"
                    ? `They interview you ${productConfig.interviewMeMinutes} min, then you interview them`
                    : session.interviewerId === current.id
                      ? "You are interviewing them"
                      : "They interview you"}
                </p>
                {unread ? <p className="mt-2 text-xs text-[#d4af37]">New message</p> : null}
              </a>
            );
          })}
        </div>
      ) : null}

      {tab === "requests" ? (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-black p-1">
            <a
              href="/practice?tab=requests&inbox=received"
              className={cn("rounded-lg py-3 text-center text-sm", inbox === "received" ? "bg-[#d4af37] text-black" : "text-[#b3b3b3]")}
            >
              Received{attention.receivedAction ? ` · ${attention.receivedAction}` : ""}
            </a>
            <a
              href="/practice?tab=requests&inbox=sent"
              className={cn("rounded-lg py-3 text-center text-sm", inbox === "sent" ? "bg-[#d4af37] text-black" : "text-[#b3b3b3]")}
            >
              Sent{attention.sentAction ? ` · ${attention.sentAction}` : ""}
            </a>
          </div>
          {(inbox === "received" ? received : sent).length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-[#141414] p-6 text-sm text-[#b3b3b3]">
              {inbox === "received" ? "No incoming requests." : "You haven’t sent a request yet."}
            </p>
          ) : null}
          {(inbox === "received" ? received : sent).map((request) => {
            const otherId = request.requesterId === current.id ? request.receiverId : request.requesterId;
            return (
              <a key={request.id} href={`/practice/with/${otherId}`} className="block rounded-2xl border border-white/10 bg-[#141414] p-5">
                <p className="font-serif text-xl">{request.otherName}</p>
                <p className="mt-2 text-sm text-[#b3b3b3]">
                  {request.proposedStartUtc ? formatInTimeZone(request.proposedStartUtc, current.profile.timezone) : "Time not set"} · {formatLabel(request.format)} · {requestStateLabel(request.state)}
                </p>
                {request.message ? <p className="mt-2 line-clamp-2 text-sm text-[#8a8a8a]">{request.message}</p> : null}
              </a>
            );
          })}
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap gap-2 text-sm">
            {[
              { id: "", label: "All" },
              { id: "completed", label: "Completed" },
              { id: "declined", label: "Declined" },
              { id: "did_not_happen", label: "Time over" },
              { id: "expired", label: "Expired" },
              { id: "cancelled", label: "Cancelled" },
              { id: "time_unavailable", label: "Time taken" },
            ].map((item) => (
              <a
                key={item.id || "all"}
                href={item.id ? `/practice?tab=history&status=${item.id}` : "/practice?tab=history"}
                className={cn(
                  "rounded-full border px-3 py-1",
                  (status || "") === item.id ? "border-[#d4af37] text-[#d4af37]" : "border-white/15 text-[#8a8a8a]"
                )}
              >
                {item.label}
              </a>
            ))}
          </div>
          {historyItems.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-[#141414] p-6 text-sm text-[#b3b3b3]">
              Completed, declined, expired, time-over, and cancelled work will appear here.
            </p>
          ) : null}
          {historyItems.map((item) => (
            <a key={item.id} href={item.href} className="block rounded-2xl border border-white/10 bg-[#141414] p-5">
              <p className="font-serif text-xl">{item.name}</p>
              <p className="mt-2 text-sm text-[#b3b3b3]">
                {item.when} · {item.detail} · {item.status}
              </p>
            </a>
          ))}
        </div>
      ) : null}
    </AppShell>
  );
}
