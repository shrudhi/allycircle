"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <div className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-8">
        <h1 className="font-serif text-2xl">We hit a snag</h1>
        <p className="mt-3 text-[#a0a0a0]">Please try again. If this screen returns, refresh the page or go back to Home.</p>
        {error.digest ? <p className="mt-3 text-xs text-[#a0a0a0]">Reference: {error.digest}</p> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-medium text-[#111]">
            Try again
          </button>
          <a href="/onboarding" className="rounded-lg border border-[#2d2d2d] px-4 py-2 text-sm">
            Profile setup
          </a>
          <a href="/home" className="rounded-lg border border-[#2d2d2d] px-4 py-2 text-sm">
            Home
          </a>
        </div>
      </div>
    </div>
  );
}
