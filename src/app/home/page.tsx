import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { getHomeData } from "@/lib/server/allies";
import { getAttentionCounts } from "@/lib/server/attention";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatInTimeZone } from "@/lib/domain/timezone";
import { formatLabel, requestStateLabel } from "@/lib/domain/copy";

function greetingHour() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const current = await getSessionUser();
  if (!current) redirect("/login");
  if (!current.emailVerified) redirect("/verify-email");
  const data = await getHomeData();
  if (data.needsOnboarding) redirect("/onboarding");
  const attention = await getAttentionCounts();
  const timezone = current.profile?.timezone || "UTC";
  const { filter } = await searchParams;
  const upcoming = data.upcomingSessions.filter((session) => {
    if (filter === "interviewing") {
      return session.interviewerId === current.id || session.format === "reciprocal_swap";
    }
    if (filter === "interviewing_me") {
      return session.candidateId === current.id || (session.format === "interview_me" && session.interviewerId !== current.id);
    }
    if (filter === "two_way") return session.format === "reciprocal_swap";
    return true;
  });

  return (
    <AppShell name={data.name}>
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-8 md:flex-row md:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[#d4af37]">Home</p>
          <h1 className="mt-3 font-serif text-4xl md:text-5xl">
            {greetingHour()}, {data.name.split(" ")[0]}.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-[#b3b3b3]">
            A private floor for operators who still take the interview room seriously.
          </p>
        </div>
        <a href="/allies" className={cn(buttonVariants(), "gold-outline h-11 px-6")}>
          Find People
        </a>
      </div>

      {data.takingABreak ? (
        <p className="mt-6 rounded-lg border border-white/10 bg-black/40 p-3 text-sm text-[#b3b3b3]">
          You’re taking a break from new requests. Confirmed sessions stay on the calendar.
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        {attention.unreadMessages > 0 ? (
          <a href="/messages" className="rounded-full border border-[#d4af37]/40 px-3 py-1 text-[#d4af37]">
            Messages · {attention.unreadMessages}
          </a>
        ) : null}
        {attention.practiceAction > 0 ? (
          <a href="/practice?tab=requests" className="rounded-full border border-[#d4af37]/40 px-3 py-1 text-[#d4af37]">
            Sessions · {attention.practiceAction}
          </a>
        ) : null}
      </div>

      <section className="mt-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <h2 className="font-serif text-2xl">Upcoming sessions</h2>
          <a href="/practice?tab=upcoming" className="text-sm text-[#d4af37]">
            Open calendar
          </a>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {[
            { id: "", label: "All" },
            { id: "interviewing_me", label: "Interviewing me" },
            { id: "interviewing", label: "I’m interviewing" },
            { id: "two_way", label: "Two-way" },
          ].map((item) => (
            <a
              key={item.id || "all"}
              href={item.id ? `/home?filter=${item.id}` : "/home"}
              className={cn(
                "rounded-full border px-3 py-1",
                (filter || "") === item.id ? "border-[#d4af37] text-[#d4af37]" : "border-white/15 text-[#8a8a8a]"
              )}
            >
              {item.label}
            </a>
          ))}
        </div>
        {upcoming.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-white/10 bg-[#141414] p-6 text-sm text-[#b3b3b3]">
            {data.isNew
              ? "No sessions on the books yet. Find someone in your field and book a slot."
              : "Nothing in this view. Confirmed interviews will appear here."}
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {upcoming.map((session) => (
              <a
                key={session.id}
                href={`/practice/sessions/${session.id}`}
                className="rounded-2xl border border-white/10 bg-[#141414] p-5"
              >
                <p className="font-serif text-xl">{session.otherName}</p>
                <p className="mt-2 text-sm text-[#b3b3b3]">
                  {formatInTimeZone(session.startUtc, timezone)} · {formatLabel(session.format, "detail")}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#8a8a8a]">
                  {session.format === "reciprocal_swap"
                    ? "Two-way"
                    : session.interviewerId === current.id
                      ? "You are interviewing"
                      : "They interview you"}
                </p>
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="font-serif text-2xl">Pending requests</h2>
          <a href="/practice?tab=requests" className="text-sm text-[#d4af37]">
            Review
          </a>
        </div>
        {data.pendingRequests.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-white/10 bg-[#141414] p-6 text-sm text-[#b3b3b3]">
            No open requests. Incoming and sent asks will sit here until they are confirmed or closed.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {data.pendingRequests.map((request) => (
              <a
                key={request.id}
                href={`/practice/requests/${request.id}`}
                className="rounded-2xl border border-white/10 bg-[#141414] p-5"
              >
                <p className="font-serif text-xl">{request.otherName}</p>
                <p className="mt-2 text-sm text-[#b3b3b3]">
                  {request.direction === "received" ? "Incoming" : "Sent"} · {requestStateLabel(request.state)} ·{" "}
                  {formatLabel(request.format)}
                </p>
              </a>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
