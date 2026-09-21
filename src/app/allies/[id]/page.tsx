import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { getAllyProfile } from "@/lib/server/allies";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Initials } from "@/components/initials";
import { BookmarkButton } from "@/components/bookmark-button";
import { SafetyMenu } from "@/components/safety-menu";
import { experienceLabel } from "@/lib/domain/types";

export default async function AllyProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const current = await getSessionUser();
  if (!current) redirect("/login");
  const { id } = await params;
  const data = await getAllyProfile(id);
  const { ally } = data;

  return (
    <AppShell name={current.profile?.fullName}>
      <div className="flex flex-col justify-between gap-4 md:flex-row">
        <div className="flex items-start gap-4">
          <Initials name={ally.fullName} photoPath={ally.photoPath} size="lg" />
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#d4af37]">{data.fieldLabel}</p>
            <h1 className="mt-2 text-3xl font-semibold">{ally.fullName}</h1>
            {ally.currentTitle || ally.currentCompany ? (
              <p className="mt-2 text-[#a0a0a0]">{[ally.currentTitle, ally.currentCompany].filter(Boolean).join(" · ")}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {data.activity ? <span className="rounded-full border border-[#2d2d2d] px-2 py-0.5 text-[#d4af37]">{data.activity}</span> : null}
              {data.openToTwoWay ? <span className="rounded-full border border-[#d4af37]/40 px-2 py-0.5 text-[#d4af37]">Open to 2-way</span> : null}
              {data.helpedCopy ? <span className="rounded-full border border-[#2d2d2d] px-2 py-0.5">{data.helpedCopy}</span> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BookmarkButton allyId={id} saved={data.saved} />
          {ally.linkedinUrl ? (
            <a href={ally.linkedinUrl} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-[#a0a0a0]" aria-label="LinkedIn">
              <ExternalLink className="size-4" />
            </a>
          ) : null}
          <Link href={`/messages?to=${id}`} className={cn(buttonVariants({ variant: "outline" }))}>
            Message
          </Link>
          <Link href={`/allies/${id}/request`} className={cn(buttonVariants(), "gold-outline")}>
            Request practice
          </Link>
          <SafetyMenu userId={id} />
        </div>
      </div>
      {data.takingABreak ? (
        <p className="mt-4 text-sm text-[#a0a0a0]">This ally is taking a break from new requests.</p>
      ) : null}
      {data.superLikeCount ? (
        <p className="mt-4 text-sm text-[#d4af37]">
          Highlighted {data.superLikeCount === 1 ? "once" : `${data.superLikeCount} times`} by interviewers after a session
        </p>
      ) : null}
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <section className="md:col-span-2 space-y-6">
          {data.reasons.length ? (
            <div className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
              <h2 className="font-medium">Why this match</h2>
              <p className="mt-3 text-sm text-[#a0a0a0]">{data.reasons.map((reason) => reason.label).join(" · ")}</p>
            </div>
          ) : null}
          {ally.bio ? (
            <div className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
              <h2 className="font-medium">About</h2>
              <p className="mt-3 text-sm text-[#a0a0a0]">{ally.bio}</p>
            </div>
          ) : null}
          <div className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
            <h2 className="font-medium">Experience</h2>
            <p className="mt-3 text-sm text-[#a0a0a0]">{experienceLabel(ally.experienceYears)}</p>
          </div>
          {data.topics.length ? (
            <div className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
              <h2 className="font-medium">Interview topics</h2>
              <p className="mt-3 text-sm text-[#a0a0a0]">{data.topics.join(" · ")}</p>
            </div>
          ) : null}
          {data.employment.length ? (
            <div className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
              <h2 className="font-medium">Companies</h2>
              {data.employment.map((job) => (
                <p key={job.id} className="mt-2 text-sm text-[#a0a0a0]">
                  {[job.title, job.company, job.year].filter(Boolean).join(" · ")}
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
                  {item.course ? ` · ${item.course}` : ""}
                </p>
              ))}
            </div>
          ) : null}
          {data.testimonials.length ? (
            <div className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
              <h2 className="font-medium">Public testimonials</h2>
              {data.testimonials.map((item) => (
                <p key={item.id} className="mt-3 text-sm text-[#a0a0a0]">
                  “{item.body}”
                </p>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
