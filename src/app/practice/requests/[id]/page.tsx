import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { getRequestDetail, listSlotsForAlly } from "@/lib/server/requests";
import { respondAction } from "@/app/actions/app";
import { Button } from "@/components/ui/button";
import { formatInTimeZone } from "@/lib/domain/timezone";

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const current = await getSessionUser();
  if (!current?.profile) redirect("/login");
  const { id } = await params;
  const data = await getRequestDetail(id);
  const slots = await listSlotsForAlly(data.otherId, data.request.format as "interview_me" | "reciprocal_swap");

  return (
    <AppShell name={current.profile.fullName}>
      <p className="text-xs uppercase tracking-[0.16em] text-[#d4af37]">Request</p>
      <h1 className="mt-2 text-3xl font-semibold">{data.otherName}</h1>
      <p className="mt-2 text-[#a0a0a0]">
        {data.request.format === "reciprocal_swap" ? "Reciprocal swap (60m)" : "Interview Me (30m)"} · {data.request.state.replaceAll("_", " ")}
      </p>
      {data.request.proposedStartUtc ? (
        <p className="mt-4">Proposed: {formatInTimeZone(data.request.proposedStartUtc, current.profile.timezone)}</p>
      ) : (
        <p className="mt-4 text-[#a0a0a0]">No time selected yet. Suggest a time that works.</p>
      )}
      {data.request.message ? <p className="mt-4 text-sm text-[#a0a0a0]">{data.request.message}</p> : null}
      <div className="mt-8 flex flex-wrap gap-3">
        {data.isReceiver && ["pending", "alternate_time_proposed"].includes(data.request.state) && data.request.proposedStartUtc ? (
          <form action={respondAction}>
            <input type="hidden" name="requestId" value={id} />
            <input type="hidden" name="action" value="accept" />
            <Button className="gold-outline">Accept</Button>
          </form>
        ) : null}
        {data.isReceiver && data.request.format === "reciprocal_swap" && data.request.proposedStartUtc ? (
          <form action={respondAction}>
            <input type="hidden" name="requestId" value={id} />
            <input type="hidden" name="action" value="convert" />
            <Button variant="outline">Interview requester only (30m)</Button>
          </form>
        ) : null}
        {data.isReceiver && ["pending", "alternate_time_proposed"].includes(data.request.state) ? (
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
      <Link href={`/messages?to=${data.otherId}`} className="mt-6 inline-block text-sm text-[#d4af37]">
        Message
      </Link>
    </AppShell>
  );
}
