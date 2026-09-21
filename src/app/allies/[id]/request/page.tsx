import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { getAllyProfile } from "@/lib/server/allies";
import { listSlotsForAlly } from "@/lib/server/requests";
import { sendRequestAction } from "@/app/actions/app";
import { Button } from "@/components/ui/button";
import { formatInTimeZone } from "@/lib/domain/timezone";

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const current = await getSessionUser();
  if (!current?.profile) redirect("/login");
  const { id } = await params;
  const data = await getAllyProfile(id);
  const interviewSlots = await listSlotsForAlly(id, "interview_me");
  const swapSlots = data.canSwap ? await listSlotsForAlly(id, "reciprocal_swap") : [];

  return (
    <AppShell name={current.profile.fullName}>
      <h1 className="text-3xl font-semibold">Request practice with {data.ally.fullName}</h1>
      <p className="mt-2 text-sm text-[#a0a0a0]">
        Interview Me is 30 minutes. A reciprocal swap is 60 minutes and only appears when you can interview each other.
      </p>
      <form action={sendRequestAction} className="mt-8 space-y-5 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-6">
        <input type="hidden" name="allyId" value={id} />
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="format" value="interview_me" defaultChecked />
            Interview Me (30 minutes)
          </label>
          {data.canSwap ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="format" value="reciprocal_swap" />
              Reciprocal Swap (60 minutes)
            </label>
          ) : (
            <p className="text-sm text-[#a0a0a0]">A reciprocal swap isn’t available with this ally yet.</p>
          )}
        </div>
        <div>
          <p className="text-sm font-medium">Pick a time if they published availability</p>
          <select name="startIso" className="mt-2 h-9 w-full rounded-lg border border-[#2d2d2d] bg-[#111] px-2 text-sm">
            <option value="">Send the request first — they can propose a time</option>
            {interviewSlots.map((slot) => (
              <option key={slot.startUtc.toISOString()} value={slot.startUtc.toISOString()}>
                {formatInTimeZone(slot.startUtc, current.profile.timezone)}
              </option>
            ))}
            {swapSlots.map((slot) => (
              <option key={`swap-${slot.startUtc.toISOString()}`} value={slot.startUtc.toISOString()}>
                Swap · {formatInTimeZone(slot.startUtc, current.profile.timezone)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm">Anything you’d like them to know?</label>
          <textarea name="message" className="mt-2 min-h-28 w-full rounded-lg border border-[#2d2d2d] bg-[#111] p-3 text-sm" placeholder="Interview stage, company, question type, or topic" />
        </div>
        <Button type="submit" className="gold-outline">
          Send request
        </Button>
      </form>
    </AppShell>
  );
}
