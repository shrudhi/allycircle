import fs from "fs";
import path from "path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";
import { SCHEMA_SQL } from "@/lib/db/schema-sql";
import { timeOverrides } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type AppDb =
  | ReturnType<typeof drizzlePglite<typeof schema>>
  | ReturnType<typeof drizzlePg<typeof schema>>;

const globalForDb = globalThis as unknown as {
  allyDb?: AppDb;
  allyReady?: Promise<AppDb>;
};

async function createDb() {
  if (process.env.DATABASE_URL) {
    const client = postgres(process.env.DATABASE_URL, { max: 4 });
    const db = drizzlePg(client, { schema });
    for (const statement of SCHEMA_SQL.split(";").map((part) => part.trim()).filter(Boolean)) {
      await client.unsafe(statement);
    }
    return db;
  }

  const dataDir = path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dataDir, { recursive: true });
  const pglite = new PGlite(dataDir);
  await pglite.waitReady;
  const db = drizzlePglite(pglite, { schema });
  await pglite.exec(SCHEMA_SQL);
  return db;
}

export async function getDb() {
  if (globalForDb.allyDb) return globalForDb.allyDb;
  if (!globalForDb.allyReady) {
    globalForDb.allyReady = createDb().then(async (db) => {
      globalForDb.allyDb = db;
      const { seedDevelopmentData } = await import("@/lib/db/seed");
      await seedDevelopmentData(db);
      return db;
    });
  }
  return globalForDb.allyReady;
}

export async function getNow() {
  const db = await getDb();
  const rows = await db.select().from(timeOverrides).where(eq(timeOverrides.id, "global")).limit(1);
  if (rows[0]?.nowIso) return new Date(rows[0].nowIso);
  return new Date();
}

export async function setNowOverride(iso: string | null) {
  const db = await getDb();
  await db
    .insert(timeOverrides)
    .values({ id: "global", nowIso: iso })
    .onConflictDoUpdate({ target: timeOverrides.id, set: { nowIso: iso } });
}
