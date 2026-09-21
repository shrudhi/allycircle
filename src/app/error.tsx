"use client";

export default function ErrorPage({ error }: { error: Error & { digest?: string } }) {
  const friendly =
    error.message &&
    error.message.length < 180 &&
    !error.message.includes("\n") &&
    !/internal|undefined|null is not|failed to/i.test(error.message)
      ? error.message
      : "Please try again in a moment.";

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <div className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-8">
        <h1 className="text-2xl font-semibold">We hit a snag</h1>
        <p className="mt-3 text-[#a0a0a0]">{friendly}</p>
        {error.digest ? (
          <p className="mt-3 text-xs text-[#a0a0a0]">Reference: {error.digest}</p>
        ) : null}
      </div>
    </div>
  );
}
