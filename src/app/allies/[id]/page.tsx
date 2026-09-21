import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { getAllyProfile } from "@/lib/server/allies";
import { blockAction, reportAction, toggleSaveAction } from "@/app/actions/app";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { reportReasonLabels } from "@/lib/domain/types";

export default async function AllyProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const current = await getSessionUser();
  if (!current) redirect("/login");
  const { id } = await params;
  const data = await getAllyProfile(id);
  const { ally } = data;

  return (
    <AppShell name={current.profile?.fullName}>
      <div className="flex flex-col justify-between gap-4 md:flex-row">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#d4af37]">{data.fieldLabel}</p>
          <h1 className="mt-2 text-3xl font-semibold">{ally.fullName}</h1>
          <p className="mt-2 text-[#a0a0a0]">{[ally.currentTitle, ally.currentCompany].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={toggleSaveAction.bind(null, id)}>
            <button className={cn(buttonVariants({ variant: "outline" }))}>{data.saved ? "Saved" : "Save"}</button>
          </form>
          <Link href={`/messages?to=${id}`} className={cn(buttonVariants({ variant: "outline" }))}>
            Message
          </Link>
          <Link href={`/allies/${id}/request`} className={cn(buttonVariants(), "gold-outline")}>
            Request practice
          </Link>
        </div>
      </div>
      {data.takingABreak ? (
        <p className="mt-4 text-sm text-[#a0a0a0]">This ally is taking a break from new requests.</p>
      ) : null}
      {data.helpedCopy ? <p className="mt-4 text-sm text-[#d4af37]">{data.helpedCopy}</p> : null}
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <section className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
            <h2 className="font-medium">Why this is a great match</h2>
            <ul className="mt-3 space-y-1 text-sm text-[#a0a0a0]">
              {data.reasons.map((reason) => (
                <li key={reason.code}>{reason.label}</li>
              ))}
            </ul>
          </div>
          {ally.bio ? (
            <div className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
              <h2 className="font-medium">About</h2>
              <p className="mt-3 text-sm text-[#a0a0a0]">{ally.bio}</p>
            </div>
          ) : null}
          {data.topics.length ? (
            <div className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
              <h2 className="font-medium">Can interview on</h2>
              <p className="mt-3 text-sm text-[#a0a0a0]">{data.topics.join(" · ")}</p>
            </div>
          ) : null}
          {data.employment.length ? (
            <div className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
              <h2 className="font-medium">Employment</h2>
              {data.employment.map((job) => (
                <p key={job.id} className="mt-2 text-sm text-[#a0a0a0]">
                  {job.title} {job.company}
                </p>
              ))}
            </div>
          ) : null}
          {data.education.length ? (
            <div className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
              <h2 className="font-medium">Education</h2>
              {data.education.map((item) => (
                <p key={item.id} className="mt-2 text-sm text-[#a0a0a0]">
                  {item.school}
                  {item.degree ? ` · ${item.degree}` : ""}
                </p>
              ))}
            </div>
          ) : null}
          {data.testimonials.length ? (
            <div className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
              <h2 className="font-medium">From other allies</h2>
              {data.testimonials.map((item) => (
                <p key={item.id} className="mt-3 text-sm text-[#a0a0a0]">
                  “{item.body}”
                </p>
              ))}
            </div>
          ) : null}
        </section>
        <aside className="space-y-4">
          {ally.linkedinUrl ? (
            <a href={ally.linkedinUrl} className="block text-sm text-[#d4af37]" target="_blank" rel="noreferrer">
              View LinkedIn
            </a>
          ) : null}
          <form action={blockAction} className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-4 text-sm">
            <input type="hidden" name="userId" value={id} />
            <p className="mb-2 text-[#a0a0a0]">Need space from this person?</p>
            <button className="text-[#e07070]">Block</button>
          </form>
          <form action={reportAction} className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-4 space-y-2 text-sm">
            <input type="hidden" name="userId" value={id} />
            <p>Report</p>
            <select name="reason" className="h-8 w-full rounded-lg border border-[#2d2d2d] bg-[#111] px-2">
              {Object.entries(reportReasonLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <textarea name="description" className="min-h-20 w-full rounded-lg border border-[#2d2d2d] bg-[#111] p-2" placeholder="Optional details" />
            <button className="text-[#d4af37]">Submit report</button>
          </form>
        </aside>
      </div>
    </AppShell>
  );
}
