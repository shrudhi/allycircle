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
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

type AppDb =
  | ReturnType<typeof drizzlePglite<typeof schema>>
  | ReturnType<typeof drizzlePg<typeof schema>>;

const globalForDb = globalThis as unknown as {
  allyDb?: AppDb;
  allyReady?: Promise<AppDb>;
  schemaReady?: boolean;
  allySeeding?: boolean;
};

async function ensureHostedSchema(client: ReturnType<typeof postgres>) {
  if (globalForDb.schemaReady) return;
  try {
    const rows = await client`select to_regclass('public.profiles') as name`;
    if (rows[0]?.name) {
      globalForDb.schemaReady = true;
      return;
    }
  } catch {
    /* table missing or first boot */
  }
  await client.unsafe(SCHEMA_SQL);
  globalForDb.schemaReady = true;
}

async function createDb() {
  const isBuild = process.env.NEXT_PHASE === "phase-production-build";
  if (process.env.DATABASE_URL && !isBuild) {
    const client = postgres(process.env.DATABASE_URL, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 8,
      prepare: false,
      ssl: "require",
    });
    const db = drizzlePg(client, { schema });
    await ensureHostedSchema(client);
    return db;
  }

  const dataDir = path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dataDir, { recursive: true });
  const pglite = new PGlite(dataDir);
  await pglite.waitReady;
  const db = drizzlePglite(pglite, { schema });
  await pglite.exec(SCHEMA_SQL);
  globalForDb.schemaReady = true;
  return db;
}

export async function getDb() {
  if (!globalForDb.allyReady) {
    globalForDb.allyReady = (async () => {
      const db = await createDb();
      globalForDb.allyDb = db;
      const allowSeed =
        process.env.NEXT_PHASE !== "phase-production-build" &&
        (process.env.NODE_ENV !== "production" || process.env.SEED_DEMO_USERS === "true");
      if (allowSeed) {
        globalForDb.allySeeding = true;
        try {
          const { seedDevelopmentData } = await import("@/lib/db/seed");
          await seedDevelopmentData(db);
        } finally {
          globalForDb.allySeeding = false;
        }
      }
      return db;
    })();
  }
  if (globalForDb.allySeeding && globalForDb.allyDb) {
    return globalForDb.allyDb;
  }
  return globalForDb.allyReady;
}

export async function getNow() {
  if (process.env.NODE_ENV === "production") return new Date();
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
