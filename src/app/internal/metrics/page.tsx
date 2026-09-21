import { metricsSnapshot } from "@/lib/server/metrics";

export default async function MetricsPage() {
  const data = await metricsSnapshot();
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.16em] text-[#d4af37]">Internal</p>
      <h1 className="mt-2 text-3xl font-semibold">AllyCircle metrics</h1>
      <p className="mt-2 text-sm text-[#a0a0a0]">
        Product funnel and operational health. Events exclude message bodies, private notes, tokens, and emails.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        {Object.entries(data.totals).map(([key, value]) => (
          <div key={key} className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-4">
            <p className="text-xs text-[#a0a0a0]">{key}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-10 text-lg font-medium">Funnel</h2>
      <ol className="mt-4 space-y-2">
        {data.funnel.map((step) => (
          <li key={step.step} className="flex justify-between rounded-xl border border-[#2d2d2d] bg-[#1e1e1e] px-4 py-3 text-sm">
            <span>{step.step.replaceAll("_", " ")}</span>
            <span>{step.count}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
