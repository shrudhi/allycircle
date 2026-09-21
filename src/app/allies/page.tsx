import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { findAllies } from "@/lib/server/allies";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Initials } from "@/components/initials";
import { BookmarkButton } from "@/components/bookmark-button";
import { AllyFilters } from "@/components/ally-filters";
import { experienceLabel } from "@/lib/domain/types";

export default async function AlliesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    tab?: string;
    field?: string;
    cursor?: string;
    company?: string;
    topic?: string;
    exp?: string;
    avail?: string;
    format?: string;
  }>;
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
    experienceBand: params.exp,
    availability: params.avail,
    format: params.format === "reciprocal_swap" ? "reciprocal_swap" : params.format === "interview_me" ? "interview_me" : undefined,
    cursor: params.cursor,
  });

  return (
    <AppShell name={current.profile.fullName}>
      <p className="text-xs uppercase tracking-[0.16em] text-[#d4af37]">Find People</p>
      <h1 className="mt-2 text-3xl font-semibold">People who can interview you in {result.viewerField}</h1>
      <AllyFilters
        values={{
          tab,
          q: params.q,
          field: params.field,
          exp: params.exp,
          company: params.company,
          topic: params.topic,
          avail: params.avail,
          format: params.format,
        }}
      />
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
            : "Nobody matches those filters yet. Clear a filter to see more people who can interview you."}
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
                    <p className="text-sm text-[#a0a0a0]">{[card.title, card.company].filter(Boolean).join(" · ")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {card.linkedinUrl ? (
                    <a href={card.linkedinUrl} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="p-2 text-[#a0a0a0]">
                      <ExternalLink className="size-4" />
                    </a>
                  ) : null}
                  <BookmarkButton allyId={card.id} saved={card.saved} />
                </div>
              </div>
              <p className="mt-3 text-sm">{experienceLabel(card.experienceYears)}</p>
              {card.topics.length ? (
                <p className="mt-2 text-xs text-[#a0a0a0]">{card.topics.join(" · ")}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {card.activity ? <span className="rounded-full border border-[#2d2d2d] px-2 py-0.5 text-[#d4af37]">{card.activity}</span> : null}
                {card.helpedCopy ? <span className="rounded-full border border-[#2d2d2d] px-2 py-0.5">{card.helpedCopy}</span> : null}
                {card.openToTwoWay ? <span className="rounded-full border border-[#d4af37]/40 px-2 py-0.5 text-[#d4af37]">Open to 2-way</span> : null}
              </div>
              {card.reasons.length ? (
                <p className="mt-4 text-sm text-[#a0a0a0]">{card.reasons.map((reason) => reason.label).join(" · ")}</p>
              ) : null}
              <Link href={`/allies/${card.id}/request`} className={cn(buttonVariants(), "mt-4 gold-outline")}>
                Request practice
              </Link>
              <Link href={`/allies/${card.id}`} className="mt-3 ml-3 text-sm text-[#a0a0a0]">
                View profile
              </Link>
            </article>
          ))}
        </div>
      )}
      {result.nextCursor ? (
        <Link
          href={`/allies?tab=${tab}&cursor=${result.nextCursor}&q=${params.q || ""}&field=${params.field || ""}&exp=${params.exp || ""}&company=${params.company || ""}&topic=${params.topic || ""}&avail=${params.avail || ""}&format=${params.format || ""}`}
          className="mt-6 inline-block text-sm text-[#d4af37]"
        >
          Load more
        </Link>
      ) : null}
    </AppShell>
  );
}
