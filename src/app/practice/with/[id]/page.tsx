import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { getInteraction } from "@/lib/server/sessions";
import { replyMessageAction, testimonialVisibilityAction } from "@/app/actions/app";
import { Button } from "@/components/ui/button";
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
          <h1 className="mt-2 text-3xl font-semibold">{data.otherName}</h1>
          {data.blocked ? <p className="mt-2 text-sm text-[#e07070]">This relationship is blocked. Existing sessions stay.</p> : null}
        </div>
        <SafetyMenu userId={id} />
      </div>

      {latestSession ? (
        <section className="mt-8 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
          <h2 className="font-medium">Session</h2>
          <p className="mt-2 text-sm text-[#a0a0a0]">
            {formatInTimeZone(latestSession.startUtc, current.profile.timezone)} · {formatLabel(latestSession.format, "detail")} · {sessionStateLabel(latestSession.state)}
          </p>
          {latestSession.format === "reciprocal_swap" ? (
            <p className="mt-2 text-sm text-[#a0a0a0]">They interview you first, then you interview them. Same meeting.</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={`/practice/sessions/${latestSession.id}`} className="text-sm text-[#d4af37]">
              Session details
            </Link>
            {latestSession.state === "scheduled" ? <JoinButton sessionId={latestSession.id} pulse={false} /> : null}
            {latestSession.state === "completed" ? (
              <Link href={`/practice/sessions/${latestSession.id}/feedback`} className="text-sm text-[#d4af37]">
                Feedback
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      {latestRequest ? (
        <section className="mt-6 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
          <h2 className="font-medium">Request history</h2>
          <div className="mt-3 space-y-2 text-sm text-[#a0a0a0]">
            {data.requests.map((request) => (
              <p key={request.id}>
                {requestStateLabel(request.state)} · {formatLabel(request.format)}
                {request.proposedStartUtc ? ` · ${formatInTimeZone(request.proposedStartUtc, current.profile.timezone)}` : ""}
                {request.openToTwoWay ? " · open to two-way" : ""}
              </p>
            ))}
            {data.events.map((event) => (
              <p key={event.id}>
                {requestStateLabel(event.toState)}
                {event.note ? ` · ${event.note.replaceAll("_", " ")}` : ""}
              </p>
            ))}
          </div>
          <Link href={`/practice/requests/${latestRequest.id}`} className="mt-3 inline-block text-sm text-[#d4af37]">
            Open request
          </Link>
        </section>
      ) : null}

      <section className="mt-6 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
        <h2 className="font-medium">Messages</h2>
        {data.thread ? (
          <>
            <div className="mt-4 max-h-[40vh] space-y-3 overflow-auto">
              {data.thread.messages.map((message) => (
                <div key={message.id} className={message.senderId === current.id ? "text-right" : "text-left"}>
                  <p className="inline-block rounded-xl border border-[#2d2d2d] px-3 py-2 text-sm">{message.body}</p>
                </div>
              ))}
            </div>
            {data.thread.canReply ? (
              <form action={replyMessageAction} className="mt-4 flex gap-2">
                <input type="hidden" name="otherId" value={id} />
                <input name="body" className="h-10 flex-1 rounded-lg border border-[#2d2d2d] bg-[#111] px-3 text-sm" required />
                <Button>Send</Button>
              </form>
            ) : (
              <p className="mt-4 text-sm text-[#a0a0a0]">New messages aren’t available.</p>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm text-[#a0a0a0]">No messages yet.</p>
        )}
      </section>

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
                  <Button variant="outline" size="sm">Save</Button>
                </label>
              ) : null}
            </form>
          ))}
        </section>
      ) : null}
    </AppShell>
  );
}
