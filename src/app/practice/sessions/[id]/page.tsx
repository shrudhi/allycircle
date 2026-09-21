import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { getSessionDetail } from "@/lib/server/sessions";
import { listSlotsForAlly } from "@/lib/server/requests";
import {
  attendanceAction,
  cancelSessionAction,
  proposeRescheduleAction,
  respondRescheduleAction,
  superLikeAction,
} from "@/app/actions/app";
import { JoinButton } from "@/components/join-button";
import { Button } from "@/components/ui/button";
import { formatInTimeZone } from "@/lib/domain/timezone";
import { formatLabel } from "@/lib/domain/copy";
import type { RequestFormat } from "@/lib/domain/types";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const current = await getSessionUser();
  if (!current?.profile) redirect("/login");
  const { id } = await params;
  const data = await getSessionDetail(id);
  const { session } = data;
  const slots =
    data.canProposeReschedule
      ? await listSlotsForAlly(data.otherId, session.format as RequestFormat, { excludeSessionId: id })
      : [];

  return (
    <AppShell name={current.profile.fullName}>
      <p className="text-xs uppercase tracking-[0.16em] text-[#d4af37]">Session</p>
      <h1 className="mt-2 text-3xl font-semibold">{data.otherName}</h1>
      <p className="mt-2 text-[#a0a0a0]">
        {formatLabel(session.format, "detail")} · {formatInTimeZone(session.startUtc, current.profile.timezone)}
      </p>
      <p className="mt-4 text-sm">
        Room status:{" "}
        {session.meetProvisionState === "ready"
          ? "Ready"
          : session.meetProvisionState === "not_applicable"
            ? "Connect Google Calendar to prepare your session room"
            : "Your session is confirmed. We’re preparing the room."}
      </p>
      {session.pendingRescheduleStartUtc ? (
        <div className="mt-6 rounded-2xl border border-[#d4af37]/40 bg-[#1e1e1e] p-5">
          <p className="font-medium">Proposed new time</p>
          <p className="mt-2 text-sm text-[#a0a0a0]">
            {formatInTimeZone(session.pendingRescheduleStartUtc, current.profile.timezone)}. The original time stays until
            this is accepted.
          </p>
          {data.canRespondToReschedule ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <form action={respondRescheduleAction}>
                <input type="hidden" name="sessionId" value={id} />
                <input type="hidden" name="action" value="accept" />
                <Button className="gold-outline">Accept new time</Button>
              </form>
              <form action={respondRescheduleAction}>
                <input type="hidden" name="sessionId" value={id} />
                <input type="hidden" name="action" value="decline" />
                <Button variant="ghost">Keep original time</Button>
              </form>
            </div>
          ) : data.iProposedReschedule ? (
            <p className="mt-3 text-sm text-[#a0a0a0]">Waiting for {data.otherName} to confirm.</p>
          ) : null}
        </div>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        {data.joinOpen && session.state !== "cancelled" ? <JoinButton sessionId={id} pulse /> : null}
        <Link href={`/messages?to=${data.otherId}`} className="text-sm text-[#d4af37]">
          Message
        </Link>
        {["completed", "did_not_happen", "cancelled"].includes(session.state) ? (
          <Link href={`/allies/${data.otherId}/request`} className="text-sm text-[#d4af37]">
            Practice again
          </Link>
        ) : null}
        {session.state === "scheduled" ? (
          <form action={cancelSessionAction}>
            <input type="hidden" name="sessionId" value={id} />
            <Button variant="ghost">Cancel session</Button>
          </form>
        ) : null}
      </div>
      {data.canProposeReschedule ? (
        <form action={proposeRescheduleAction} className="mt-8 space-y-3 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
          <input type="hidden" name="sessionId" value={id} />
          <p className="font-medium">Reschedule this session</p>
          <p className="text-sm text-[#a0a0a0]">
            The same session stays on the calendar until your ally accepts a new time.
          </p>
          {slots.length ? (
            <>
              <select name="startIso" className="h-9 w-full rounded-lg border border-[#2d2d2d] bg-[#111] px-2 text-sm" required>
                {slots.map((slot) => (
                  <option key={slot.startUtc.toISOString()} value={slot.startUtc.toISOString()}>
                    {formatInTimeZone(slot.startUtc, current.profile.timezone)}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="outline">
                Suggest new time
              </Button>
            </>
          ) : (
            <p className="text-sm text-[#a0a0a0]">
              No open slots on their published availability. Message them, or wait until they add more windows.
            </p>
          )}
        </form>
      ) : null}
      {data.isPast ||
      session.state === "awaiting_attendance" ||
      session.state === "completed" ||
      session.state === "did_not_happen" ? (
        <form action={attendanceAction} className="mt-8 space-y-3 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
          <input type="hidden" name="sessionId" value={id} />
          <p className="font-medium">Did this session happen?</p>
          <p className="text-sm text-[#a0a0a0]">We only mark it complete after both of you confirm that you actually met.</p>
          <div className="flex gap-3">
            <Button name="happened" value="yes" variant="outline">
              Yes, we met
            </Button>
            <Button name="happened" value="no" variant="ghost">
              No, it didn’t happen
            </Button>
          </div>
          {data.myAttendance ? <p className="text-sm text-[#a0a0a0]">You said: {data.myAttendance}</p> : null}
        </form>
      ) : null}
      {session.state === "completed" ? (
        <div className="mt-6 space-y-3">
          <Link href={`/practice/sessions/${id}/feedback`} className="inline-block text-sm text-[#d4af37]">
            Leave a note for {data.otherName}
          </Link>
          {data.canSuperLike ? (
            <form action={superLikeAction}>
              <input type="hidden" name="sessionId" value={id} />
              <Button className="gold-outline">Highlight their profile</Button>
            </form>
          ) : null}
          {data.alreadySuperLiked ? (
            <p className="text-sm text-[#a0a0a0]">You highlighted this profile after the session.</p>
          ) : null}
        </div>
      ) : null}
    </AppShell>
  );
}
