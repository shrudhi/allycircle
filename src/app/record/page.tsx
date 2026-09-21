import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { getRecordData } from "@/lib/server/allies";
import { testimonialVisibilityAction } from "@/app/actions/app";
import { Button } from "@/components/ui/button";
import { formatLabel, requestStateLabel } from "@/lib/domain/copy";
import { helpedPeersCopy } from "@/lib/domain/scheduling";

export default async function RecordPage() {
  const current = await getSessionUser();
  if (!current?.profile) redirect("/login");
  const data = await getRecordData();

  return (
    <AppShell name={current.profile.fullName}>
      <p className="text-xs uppercase tracking-[0.16em] text-[#d4af37]">Your record</p>
      <h1 className="mt-2 text-3xl font-semibold">How you’ve shown up for others</h1>
      <p className="mt-2 max-w-2xl text-sm text-[#a0a0a0]">
        Interviews you’ve given, asks still waiting, notes people left for you, and whether a testimonial is public on your profile.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
          <p className="text-sm text-[#a0a0a0]">Interviews conducted</p>
          <p className="mt-2 text-3xl font-semibold">{data.interviewsGiven}</p>
          <p className="mt-2 text-sm text-[#d4af37]">{helpedPeersCopy(data.interviewsGiven) || "Conduct your first mock to start this."}</p>
        </div>
        <div className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
          <p className="text-sm text-[#a0a0a0]">Waiting on a reply</p>
          <p className="mt-2 text-3xl font-semibold">{data.pending.length}</p>
        </div>
        <div className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
          <p className="text-sm text-[#a0a0a0]">Profile highlights</p>
          <p className="mt-2 text-3xl font-semibold">{data.superLikeCount}</p>
          <p className="mt-2 text-sm text-[#a0a0a0]">Times an interviewer highlighted you after a session.</p>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Pending requests</h2>
        <div className="mt-3 space-y-3">
          {data.pending.length === 0 ? <p className="text-sm text-[#a0a0a0]">Nothing waiting right now.</p> : null}
          {data.pending.map((request) => (
            <Link key={request.id} href={`/practice/requests/${request.id}`} className="block rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-4">
              <p className="font-medium">{request.otherName}</p>
              <p className="text-sm text-[#a0a0a0]">
                {request.direction === "sent" ? "You sent this" : "Needs your reply"} · {requestStateLabel(request.state)} ·{" "}
                {formatLabel(request.format)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Notes people left for you</h2>
        <p className="mt-1 text-sm text-[#a0a0a0]">Private improvement notes stay between you two. Tags are just a quick snapshot.</p>
        <div className="mt-3 space-y-3">
          {data.feedback.length === 0 ? <p className="text-sm text-[#a0a0a0]">No notes yet — they’ll appear after a completed session.</p> : null}
          {data.feedback.map((item) => (
            <article key={item.id} className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-4 text-sm">
              <p className="font-medium">{item.fromName}</p>
              {item.practiceAgain ? <p className="mt-1 text-[#a0a0a0]">Would practice again: {item.practiceAgain}</p> : null}
              {(item.tagsJson || []).length ? <p className="mt-1 text-[#a0a0a0]">{(item.tagsJson || []).join(" · ")}</p> : null}
              {item.privateImprovement ? <p className="mt-2">{item.privateImprovement}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Testimonials</h2>
        <p className="mt-1 text-sm text-[#a0a0a0]">You decide whether each one appears on your public profile.</p>
        {data.testimonials.length === 0 ? <p className="mt-3 text-sm text-[#a0a0a0]">None yet.</p> : null}
        {data.testimonials.map((item) => (
          <form key={item.id} action={testimonialVisibilityAction} className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-4 text-sm sm:flex-row sm:items-start sm:justify-between">
            <input type="hidden" name="id" value={item.id} />
            <p className="text-[#a0a0a0]">“{item.body}”</p>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="visible" defaultChecked={item.recipientVisible} />
              Show publicly on my profile
            </label>
            <Button variant="outline" size="sm">Save</Button>
          </form>
        ))}
      </section>
    </AppShell>
  );
}
