import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { findAllies } from "@/lib/server/allies";
import { toggleSaveAction } from "@/app/actions/app";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Initials } from "@/components/initials";
import { SearchSelect } from "@/components/search-select";

export default async function AlliesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string; field?: string; cursor?: string; company?: string; topic?: string; minExp?: string }>;
}) {
  const current = await getSessionUser();
  if (!current) redirect("/login");
  if (!current.profile?.onboardingComplete) redirect("/onboarding");
  const params = await searchParams;
  const tab = (params.tab as "for-you" | "connected" | "saved") || "for-you";
  const result = await findAllies({
    query: params.q,
    tab,
    fieldId: params.field,
    company: params.company,
    topic: params.topic,
    minExperience: params.minExp ? Number(params.minExp) : undefined,
    cursor: params.cursor,
  });

  return (
    <AppShell name={current.profile.fullName}>
      <p className="text-xs uppercase tracking-[0.16em] text-[#d4af37]">Find an Ally</p>
      <h1 className="mt-2 text-3xl font-semibold">People who can interview you in {result.viewerField}</h1>
      <form className="mt-6 flex flex-col gap-3 md:flex-row md:items-end">
        <input type="hidden" name="tab" value={tab} />
        <input name="q" defaultValue={params.q} placeholder="Search by name, title, company, or topic" className="h-10 flex-1 rounded-lg border border-[#2d2d2d] bg-[#1e1e1e] px-3 text-sm" />
        <div className="md:w-56">
          <SearchSelect
            name="field"
            defaultValue={params.field || ""}
            placeholder="All fields"
            options={[{ value: "", label: "All fields" }, ...result.fields.map((field) => ({ value: field.id, label: field.label }))]}
          />
        </div>
        <button className={cn(buttonVariants(), "gold-outline")}>Search</button>
      </form>
      <div className="mt-6 flex gap-4 text-sm">
        {[
          ["for-you", "For you"],
          ["connected", "Past connections"],
          ["saved", "Saved"],
        ].map(([value, label]) => (
          <Link key={value} href={`/allies?tab=${value}`} className={tab === value ? "text-[#d4af37]" : "text-[#a0a0a0]"}>
            {label}
          </Link>
        ))}
      </div>
      {result.cards.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-8 text-[#a0a0a0]">
          {tab === "connected"
            ? "You haven’t practiced with anyone yet. Find someone in For you and send a request — they’ll show up here after you connect."
            : "Nobody matches those filters yet. Try clearing a filter — we still show qualified interviewers even if topics don’t overlap."}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {result.cards.map((card) => (
            <article key={card.id} className="gold-outline rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Initials name={card.name} photoPath={card.photoPath} />
                  <div>
                    <h2 className="text-lg font-medium">{card.name}</h2>
                    <p className="text-sm text-[#a0a0a0]">
                      {[card.title, card.company].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
                <form action={toggleSaveAction.bind(null, card.id)}>
                  <button className="text-xs text-[#d4af37]">{card.saved ? "Saved" : "Save"}</button>
                </form>
              </div>
              <p className="mt-3 text-sm">{card.experienceYears >= 10 ? "10+" : card.experienceYears} years in this kind of work</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#a0a0a0]">
                <span className="rounded-full border border-[#2d2d2d] px-2 py-0.5 text-[#d4af37]">{card.interviewPace}</span>
                {card.helpedCopy ? <span>{card.helpedCopy}</span> : null}
                {card.isTestUser ? <span>Test profile</span> : null}
              </div>
              {card.topics.length ? (
                <p className="mt-3 text-xs text-[#a0a0a0]">Can interview on {card.topics.join(" · ")}</p>
              ) : null}
              <p className="mt-4 text-sm font-medium">Why this is a good match</p>
              <ul className="mt-2 space-y-1 text-sm text-[#a0a0a0]">
                {card.reasons.map((reason) => (
                  <li key={reason.code}>{reason.label}</li>
                ))}
              </ul>
              <div className="mt-4 flex gap-3">
                <Link href={`/allies/${card.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
                  View profile
                </Link>
                <Link href={`/allies/${card.id}/request`} className={cn(buttonVariants(), "gold-outline")}>
                  Request practice
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
      {result.nextCursor ? (
        <Link
          href={`/allies?tab=${tab}&cursor=${result.nextCursor}&q=${params.q || ""}&field=${params.field || ""}`}
          className="mt-6 inline-block text-sm text-[#d4af37]"
        >
          Load more
        </Link>
      ) : null}
    </AppShell>
  );
}
