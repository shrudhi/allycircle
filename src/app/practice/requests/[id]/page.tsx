import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { getRequestDetail, listSlotsForAlly } from "@/lib/server/requests";
import { respondAction } from "@/app/actions/app";
import { Button } from "@/components/ui/button";
import { formatInTimeZone } from "@/lib/domain/timezone";
import { formatLabel, requestStateLabel } from "@/lib/domain/copy";
import { SafetyMenu } from "@/components/safety-menu";

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const current = await getSessionUser();
  if (!current?.profile) redirect("/login");
  const { id } = await params;
  const data = await getRequestDetail(id);
  const slots = await listSlotsForAlly(data.otherId, "interview_me");
  const actionable = ["pending", "alternate_time_proposed"].includes(data.request.state);

  return (
    <AppShell name={current.profile.fullName}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#d4af37]">Request</p>
          <h1 className="mt-2 text-3xl font-semibold">{data.otherName}</h1>
          <p className="mt-2 text-[#a0a0a0]">
            {formatLabel(data.request.format, "detail")} · {requestStateLabel(data.request.state)}
          </p>
        </div>
        <SafetyMenu userId={data.otherId} />
      </div>
      {data.request.proposedStartUtc ? (
        <p className="mt-4">Proposed: {formatInTimeZone(data.request.proposedStartUtc, current.profile.timezone)}</p>
      ) : (
        <p className="mt-4 text-[#a0a0a0]">No time selected yet. Suggest a time that works.</p>
      )}
      {data.request.message ? <p className="mt-4 text-sm text-[#a0a0a0]">{data.request.message}</p> : null}
      {data.request.openToTwoWay ? <p className="mt-3 text-sm text-[#d4af37]">Requester is open to interviewing you too.</p> : null}
      {data.request.pendingTwoWayBy ? <p className="mt-3 text-sm text-[#d4af37]">A two-way segment has been proposed. It stays 30 minutes until both of you agree.</p> : null}

      {data.events.length ? (
        <div className="mt-6 space-y-2 text-sm text-[#a0a0a0]">
          {data.events.map((event) => (
            <p key={event.id}>
              {requestStateLabel(event.toState)}
              {event.note ? ` · ${event.note.replaceAll("_", " ")}` : ""}
            </p>
          ))}
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        {data.isReceiver && actionable && data.request.proposedStartUtc ? (
          <form action={respondAction}>
            <input type="hidden" name="requestId" value={id} />
            <input type="hidden" name="action" value="accept" />
            <Button className="gold-outline">Accept 30 min</Button>
          </form>
        ) : null}
        {data.isReceiver && actionable && data.request.proposedStartUtc && data.request.openToTwoWay ? (
          <form action={respondAction}>
            <input type="hidden" name="requestId" value={id} />
            <input type="hidden" name="action" value="accept" />
            <input type="hidden" name="acceptAsTwoWay" value="on" />
            <Button variant="outline">Accept as two-way (60 min)</Button>
          </form>
        ) : null}
        {data.isReceiver && actionable && !data.request.openToTwoWay && !data.request.pendingTwoWayBy ? (
          <form action={respondAction}>
            <input type="hidden" name="requestId" value={id} />
            <input type="hidden" name="action" value="propose_two_way" />
            <Button variant="outline">Propose two-way</Button>
          </form>
        ) : null}
        {!data.isReceiver && data.request.pendingTwoWayBy && data.request.pendingTwoWayBy !== current.id ? (
          <form action={respondAction}>
            <input type="hidden" name="requestId" value={id} />
            <input type="hidden" name="action" value="confirm_two_way" />
            <Button variant="outline">I’m open to two-way</Button>
          </form>
        ) : null}
        {data.isReceiver && data.request.format === "reciprocal_swap" && data.request.proposedStartUtc ? (
          <form action={respondAction}>
            <input type="hidden" name="requestId" value={id} />
            <input type="hidden" name="action" value="convert" />
            <Button variant="outline">Keep as Interview Me (30 min)</Button>
          </form>
        ) : null}
        {data.isReceiver && actionable ? (
          <form action={respondAction}>
            <input type="hidden" name="requestId" value={id} />
            <input type="hidden" name="action" value="decline" />
            <Button variant="ghost">Decline</Button>
          </form>
        ) : null}
        {!data.isReceiver && data.request.state === "pending" ? (
          <form action={respondAction}>
            <input type="hidden" name="requestId" value={id} />
            <input type="hidden" name="action" value="cancel" />
            <Button variant="ghost">Withdraw</Button>
          </form>
        ) : null}
      </div>
      {["pending", "alternate_time_proposed", "time_unavailable"].includes(data.request.state) ? (
        <form action={respondAction} className="mt-8 space-y-3 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
          <input type="hidden" name="requestId" value={id} />
          <input type="hidden" name="action" value="propose" />
          <p className="text-sm">Suggest another time</p>
          <select name="startIso" className="h-9 w-full rounded-lg border border-[#2d2d2d] bg-[#111] px-2 text-sm" required>
            {slots.map((slot) => (
              <option key={slot.startUtc.toISOString()} value={slot.startUtc.toISOString()}>
                {formatInTimeZone(slot.startUtc, current.profile.timezone)}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline">
            Send new time
          </Button>
        </form>
      ) : null}
      <Link href={`/practice/with/${data.otherId}`} className="mt-6 inline-block text-sm text-[#d4af37]">
        Open full conversation
      </Link>
    </AppShell>
  );
}
