import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

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
  const configured = Boolean(process.env.DATABASE_URL);
  if (!configured) {
    return Response.json({ ok: false, database: "missing" });
  }
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, database: "connected" });
  } catch (error) {
    return Response.json({ ok: false, database: "failed", hint: connectionHint(error) });
  }
}
