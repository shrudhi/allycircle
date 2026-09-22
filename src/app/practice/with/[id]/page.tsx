import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { getInteraction } from "@/lib/server/sessions";
import { testimonialVisibilityAction } from "@/app/actions/app";
import { ChatThread } from "@/components/chat-thread";
import { formatInTimeZone } from "@/lib/domain/timezone";
import { formatLabel, requestStateLabel, sessionStateLabel } from "@/lib/domain/copy";
import { SafetyMenu } from "@/components/safety-menu";
import { JoinButton } from "@/components/join-button";

export default async function InteractionPage({ params }: { params: Promise<{ id: string }> }) {
  const current = await getSessionUser();
  if (!current?.profile) redirect("/login");
  const { id } = await params;
  const data = await getInteraction(id);
  const latestSession = data.sessions[0];
  const latestRequest = data.requests[0];

  return (
    <AppShell name={current.profile.fullName}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#d4af37]">Practice</p>
          <h1 className="mt-2 font-serif text-3xl">{data.otherName}</h1>
          {data.blocked ? <p className="mt-2 text-sm text-[#e07070]">This relationship is blocked. Existing sessions stay.</p> : null}
        </div>
        <SafetyMenu userId={id} />
      </div>

      {latestSession ? (
        <section className="mt-6 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-4">
          <p className="text-sm text-[#b3b3b3]">
            {sessionStateLabel(latestSession.state)} · {formatInTimeZone(latestSession.startUtc, current.profile.timezone)} ·{" "}
            {formatLabel(latestSession.format, "detail")}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <a href={`/practice/sessions/${latestSession.id}`} className="text-sm text-[#d4af37]">
              Session details
            </a>
            {latestSession.state === "scheduled" ? <JoinButton sessionId={latestSession.id} pulse={false} /> : null}
            {latestSession.state === "completed" ? (
              <a href={`/practice/sessions/${latestSession.id}/feedback`} className="text-sm text-[#d4af37]">
                Feedback
              </a>
            ) : null}
          </div>
        </section>
      ) : latestRequest ? (
        <section className="mt-6 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-4">
          <p className="text-sm text-[#b3b3b3]">
            {requestStateLabel(latestRequest.state)}
            {latestRequest.proposedStartUtc
              ? ` · ${formatInTimeZone(latestRequest.proposedStartUtc, current.profile.timezone)}`
              : ""}
          </p>
          <a href={`/practice/requests/${latestRequest.id}`} className="mt-2 inline-block text-sm text-[#d4af37]">
            Open request
          </a>
        </section>
      ) : null}

      <div className="mt-6">
        {data.thread ? (
          <ChatThread
            currentUserId={current.id}
            otherName={data.otherName}
            timezone={current.profile.timezone}
            messages={data.thread.messages}
            canReply={data.thread.canReply}
            otherId={id}
            next={`/practice/with/${id}`}
          />
        ) : (
          <p className="text-sm text-[#a0a0a0]">No messages yet.</p>
        )}
      </div>

      {data.feedback.length || data.testimonials.length ? (
        <section className="mt-6 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
          <h2 className="font-medium">Feedback</h2>
          {data.feedback.map((item) => (
            <article key={item.id} className="mt-3 text-sm text-[#a0a0a0]">
              {item.fromUserId === current.id ? "You left a note" : "They left you a note"}
              {item.privateImprovement && item.toUserId === current.id ? <p className="mt-1 text-white">{item.privateImprovement}</p> : null}
            </article>
          ))}
          {data.testimonials.map((item) => (
            <form key={item.id} action={testimonialVisibilityAction} className="mt-4 text-sm">
              <input type="hidden" name="id" value={item.id} />
              <p className="text-[#a0a0a0]">“{item.body}”</p>
              {item.toUserId === current.id ? (
                <label className="mt-2 flex items-center gap-2">
                  <input type="checkbox" name="visible" defaultChecked={item.recipientVisible} />
                  Show publicly on my profile
                  <button type="submit" className="rounded-md border border-[#2d2d2d] px-2 py-1 text-xs">
                    Save
                  </button>
                </label>
              ) : null}
            </form>
          ))}
        </section>
      ) : null}
    </AppShell>
  );
}
