import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { emailOutbox } from "@/lib/db/schema";

export default async function InboxPage() {
  if (process.env.NODE_ENV === "production") {
    return <p className="p-8">Not available in production.</p>;
  }
  const db = await getDb();
  const rows = await db.select().from(emailOutbox).orderBy(desc(emailOutbox.createdAt));
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Development inbox</h1>
      <p className="mt-2 text-sm text-[#a0a0a0]">Password reset and notification emails land here until a real email provider is connected.</p>
      <div className="mt-6 space-y-3">
        {rows.map((row) => (
          <article key={row.id} className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-4">
            <p className="text-sm text-[#a0a0a0]">{row.toEmail}</p>
            <p className="font-medium">{row.subject}</p>
            <p className="mt-2 text-sm">{row.body}</p>
            {row.href ? (
              <a href={row.href} className="mt-2 inline-block text-sm text-[#d4af37]">
                Open link
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
