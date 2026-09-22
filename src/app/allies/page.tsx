import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { findAllies } from "@/lib/server/allies";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Initials } from "@/components/initials";
import { BookmarkButton } from "@/components/bookmark-button";
import { experienceLabel } from "@/lib/domain/types";

export default async function AlliesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string; cursor?: string }>;
}) {
  const current = await getSessionUser();
  if (!current) redirect("/login");
  if (!current.profile?.onboardingComplete) redirect("/onboarding");
  const params = await searchParams;
  const tab = (params.tab as "for-you" | "connected" | "saved") || "for-you";
  const result = await findAllies({
    query: params.q,
    tab,
    cursor: params.cursor,
  });

  return (
    <AppShell name={current.profile.fullName}>
      <p className="text-xs uppercase tracking-[0.22em] text-[#d4af37]">Find People</p>
      <h1 className="mt-3 font-serif text-4xl">The room for {result.viewerField}</h1>
      <form className="mt-8">
        <input type="hidden" name="tab" value={tab} />
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Search by name, role, company, or topic"
          className="h-12 w-full rounded-xl border border-white/15 bg-black px-4 text-sm"
        />
      </form>
      <div className="mt-6 flex gap-6 text-sm">
        {[
          ["for-you", "For you"],
          ["connected", "Past connections"],
          ["saved", "Saved"],
        ].map(([value, label]) => (
          <a key={value} href={`/allies?tab=${value}`} className={tab === value ? "text-[#d4af37]" : "text-[#8a8a8a]"}>
            {label}
          </a>
        ))}
      </div>
      {result.cards.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-white/10 bg-[#141414] p-8 text-[#b3b3b3]">
          {tab === "connected"
            ? "No past sessions yet. Send a request from For you and they’ll appear here."
            : "No one matches that search yet."}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {result.cards.map((card) => (
            <article key={card.id} className="rounded-2xl border border-white/10 bg-[#141414] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Initials name={card.name} photoPath={card.photoPath} />
                  <div>
                    <h2 className="font-serif text-2xl">{card.name}</h2>
                    <p className="text-sm text-[#b3b3b3]">{[card.title, card.company].filter(Boolean).join(" · ")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {card.linkedinUrl ? (
                    <a href={card.linkedinUrl} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="p-2 text-[#b3b3b3]">
                      <ExternalLink className="size-4" />
                    </a>
                  ) : null}
                  <BookmarkButton allyId={card.id} saved={card.saved} />
                </div>
              </div>
              <p className="mt-4 text-sm">{experienceLabel(card.experienceYears)}</p>
              {card.topics.length ? <p className="mt-2 text-xs text-[#8a8a8a]">{card.topics.join(" · ")}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {card.activity ? <span className="rounded-full border border-white/15 px-2 py-0.5 text-[#d4af37]">{card.activity}</span> : null}
                {card.helpedCopy ? <span className="rounded-full border border-white/15 px-2 py-0.5">{card.helpedCopy}</span> : null}
                {card.openToTwoWay ? (
                  <span className="rounded-full border border-[#d4af37]/40 px-2 py-0.5 text-[#d4af37]">Open to 2-way</span>
                ) : null}
              </div>
              {card.reasons.length ? (
                <p className="mt-4 text-sm text-[#b3b3b3]">{card.reasons.map((reason) => reason.label).join(" · ")}</p>
              ) : null}
              <div className="mt-5 flex gap-2">
                <a href={`/allies/${card.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
                  View profile
                </a>
                <a href={`/allies/${card.id}/request`} className={cn(buttonVariants(), "gold-outline")}>
                  Request session
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
      {result.nextCursor ? (
        <a href={`/allies?tab=${tab}&cursor=${result.nextCursor}&q=${params.q || ""}`} className="mt-6 inline-block text-sm text-[#d4af37]">
          Load more
        </a>
      ) : null}
    </AppShell>
  );
}
