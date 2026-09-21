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
  const swapSlots = data.canSwap ? await listSlotsForAlly(id, "reciprocal_swap") : [];
  const zone = current.profile.timezone;

  return (
    <AppShell name={current.profile.fullName}>
      <h1 className="text-3xl font-semibold">Request practice with {data.ally.fullName}</h1>
      <p className="mt-2 text-sm text-[#a0a0a0]">
        Choose whether they interview you, or you take turns. Then pick a date they already opened — or send the request and let them suggest a time.
      </p>
      <RequestForm
        action={sendRequestAction}
        allyId={id}
        canSwap={data.canSwap}
        interviewSlots={slotPickerViews(interviewSlots, zone)}
        swapSlots={slotPickerViews(swapSlots, zone)}
      />
    </AppShell>
  );
}
