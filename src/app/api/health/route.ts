import { sql } from "drizzle-orm";
import { lookup } from "node:dns/promises";

function safeHost(raw: string) {
  try {
    const parsed = new URL(raw.replace(/^postgres(ql)?:/i, "http:"));
    return parsed.hostname || "empty";
  } catch {
    return "unparsed";
  }
}

function connectionHint(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/password authentication failed|SASL|28P01/i.test(message)) return "password";
  if (/Tenant or user not found/i.test(message)) return "username";
  if (/ENOTFOUND|getaddrinfo|EAI_AGAIN/i.test(message)) return "host";
  if (/timeout|ETIMEDOUT|ECONNREFUSED/i.test(message)) return "timeout";
  if (/SSL|self-signed/i.test(message)) return "ssl";
  if (/DATABASE_URL/i.test(message)) return "missing";
  return "unknown";
}

export async function GET() {
  const raw = process.env.DATABASE_URL || "";
  if (!raw) {
    return Response.json({ ok: false, database: "missing" });
  }
  const host = safeHost(raw);
  let dns = "skipped";
  if (host && host !== "unparsed" && host !== "empty") {
    try {
      await lookup(host, { family: 4 });
      dns = "ok";
    } catch {
      dns = "fail";
    }
  }
  try {
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, database: "connected", host, dns });
  } catch (error) {
    return Response.json({
      ok: false,
      database: "failed",
      hint: connectionHint(error),
      host,
      dns,
    });
  }
}
