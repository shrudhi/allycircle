import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

export async function GET() {
  const configured = Boolean(process.env.DATABASE_URL);
  if (!configured) {
    return Response.json({ ok: false, database: "missing" });
  }
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, database: "connected" });
  } catch {
    return Response.json({ ok: false, database: "failed" });
  }
}
