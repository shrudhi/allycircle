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
            <h1 className="mt-2 font-serif text-4xl">{ally.fullName}</h1>
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
          <a href={`/messages?to=${id}`} className={cn(buttonVariants({ variant: "outline" }))}>
            Message
          </a>
          <a href={`/allies/${id}/request`} className={cn(buttonVariants(), "gold-outline")}>
            Request session
          </a>
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
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
        <section className="space-y-6">
          {data.reasons.length ? (
            <div className="rounded-2xl border border-white/10 bg-[#141414] p-5">
              <h2 className="font-serif text-xl">Why this match</h2>
              <p className="mt-3 text-sm text-[#b3b3b3]">{data.reasons.map((reason) => reason.label).join(" · ")}</p>
            </div>
          ) : null}
          {ally.bio ? (
            <div className="rounded-2xl border border-white/10 bg-[#141414] p-5">
              <h2 className="font-serif text-xl">About</h2>
              <p className="mt-3 text-sm text-[#b3b3b3]">{ally.bio}</p>
            </div>
          ) : null}
          {data.topics.length ? (
            <div className="rounded-2xl border border-white/10 bg-[#141414] p-5">
              <h2 className="font-serif text-xl">Interview topics</h2>
              <p className="mt-3 text-sm text-[#b3b3b3]">{data.topics.join(" · ")}</p>
            </div>
          ) : null}
          {data.employment.length ? (
            <div className="rounded-2xl border border-white/10 bg-[#141414] p-5">
              <h2 className="font-serif text-xl">Companies</h2>
              {data.employment.map((job) => (
                <p key={job.id} className="mt-2 text-sm text-[#b3b3b3]">
                  {[job.title, job.company, job.year].filter(Boolean).join(" · ")}
                </p>
              ))}
            </div>
          ) : null}
          {data.education.length ? (
            <div className="rounded-2xl border border-white/10 bg-[#141414] p-5">
              <h2 className="font-serif text-xl">Education</h2>
              {data.education.map((item) => (
                <p key={item.id} className="mt-2 text-sm text-[#b3b3b3]">
                  {item.school}
                  {item.degree ? ` · ${item.degree}` : ""}
                  {item.course ? ` · ${item.course}` : ""}
                </p>
              ))}
            </div>
          ) : null}
          {data.testimonials.length ? (
            <div className="rounded-2xl border border-white/10 bg-[#141414] p-5">
              <h2 className="font-serif text-xl">Public testimonials</h2>
              {data.testimonials.map((item) => (
                <p key={item.id} className="mt-3 text-sm text-[#b3b3b3]">
                  “{item.body}”
                </p>
              ))}
            </div>
          ) : null}
        </section>
        <aside className="h-fit rounded-2xl border border-white/10 bg-[#141414] p-5">
          <h2 className="font-serif text-xl">At a glance</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-[#8a8a8a]">Domain</dt>
              <dd className="mt-1">{data.fieldLabel}</dd>
            </div>
            {ally.currentCompany ? (
              <div>
                <dt className="text-[#8a8a8a]">Company</dt>
                <dd className="mt-1">{ally.currentCompany}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[#8a8a8a]">Relevant experience</dt>
              <dd className="mt-1">{experienceLabel(ally.experienceYears)}</dd>
            </div>
            {data.openToTwoWay ? (
              <div>
                <dt className="text-[#8a8a8a]">Open to two-way</dt>
                <dd className="mt-1">Yes</dd>
              </div>
            ) : null}
            {data.helpedCopy ? (
              <div>
                <dt className="text-[#8a8a8a]">Interviews conducted</dt>
                <dd className="mt-1">{data.helpedCopy}</dd>
              </div>
            ) : null}
          </dl>
        </aside>
      </div>
    </AppShell>
  );
}
