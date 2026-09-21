import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { getSessionDetail } from "@/lib/server/sessions";
import { feedbackAction } from "@/app/actions/app";
import { Button } from "@/components/ui/button";
import { positiveFeedbackTags } from "@/lib/domain/types";

export default async function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const current = await getSessionUser();
  if (!current?.profile) redirect("/login");
  const { id } = await params;
  const data = await getSessionDetail(id);

  return (
    <AppShell name={current.profile.fullName}>
      <h1 className="text-3xl font-semibold">How was practice with {data.otherName}?</h1>
      <p className="mt-2 text-sm text-[#a0a0a0]">
        This is collaborative, not a score. “Would you practice again?” stays private. Testimonials only appear if the other person chooses to show them.
      </p>
      <form action={feedbackAction} className="mt-8 space-y-5 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-6">
        <input type="hidden" name="sessionId" value={id} />
        <input type="hidden" name="toUserId" value={data.otherId} />
        <div>
          <p className="text-sm font-medium">Would you practice with this ally again?</p>
          <div className="mt-2 flex gap-3 text-sm">
            <label className="flex gap-2"><input type="radio" name="practiceAgain" value="yes" /> Yes</label>
            <label className="flex gap-2"><input type="radio" name="practiceAgain" value="maybe" /> Maybe</label>
            <label className="flex gap-2"><input type="radio" name="practiceAgain" value="no" /> No</label>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">Optional positive tags</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {positiveFeedbackTags.map((tag) => (
              <label key={tag} className="rounded-full border border-[#2d2d2d] px-3 py-1 text-xs">
                <input type="checkbox" name="tags" value={tag} className="mr-2" />
                {tag}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">Private improvement note</p>
          <textarea name="privateImprovement" className="mt-2 min-h-24 w-full rounded-lg border border-[#2d2d2d] bg-[#111] p-3 text-sm" placeholder="Only they will see this." />
        </div>
        <div>
          <p className="text-sm font-medium">Optional testimonial</p>
          <textarea name="testimonial" className="mt-2 min-h-24 w-full rounded-lg border border-[#2d2d2d] bg-[#111] p-3 text-sm" placeholder="They decide whether this appears on their profile." />
        </div>
        <Button className="gold-outline">Send feedback</Button>
      </form>
    </AppShell>
  );
}
