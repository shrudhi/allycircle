import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { getAllyProfile } from "@/lib/server/allies";
import { listSlotsForAlly } from "@/lib/server/requests";
import { sendRequestAction } from "@/app/actions/app";
import { RequestForm } from "@/components/request-form";
import { slotPickerViews } from "@/lib/domain/timezone";

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const current = await getSessionUser();
  if (!current?.profile) redirect("/login");
  const { id } = await params;
  const data = await getAllyProfile(id);
  const interviewSlots = await listSlotsForAlly(id, "interview_me");
  const zone = current.profile.timezone;

  return (
    <AppShell name={current.profile.fullName}>
      <p className="text-xs uppercase tracking-[0.22em] text-[#d4af37]">Book a slot</p>
      <h1 className="mt-3 font-serif text-4xl">Request a session with {data.ally.fullName}</h1>
      <p className="mt-2 text-sm text-[#a0a0a0]">
        They interview you for 30 minutes. Pick a date and time from their availability. Two-way is optional and only starts if you both agree.
      </p>
      <RequestForm
        action={sendRequestAction}
        allyId={id}
        canSwap={data.canSwap}
        interviewSlots={slotPickerViews(interviewSlots, zone)}
      />
    </AppShell>
  );
}
