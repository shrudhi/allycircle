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
  allyApplySchema?: (sql: string) => Promise<void>;
  appliedSchemaSql?: string;
  allySeeding?: boolean;
};

async function applySchemaSql(exec: (sql: string) => Promise<void>) {
  await exec(SCHEMA_SQL);
}

async function createDb() {
  const isBuild = process.env.NEXT_PHASE === "phase-production-build";
  if (process.env.DATABASE_URL && !isBuild) {
    const client = postgres(process.env.DATABASE_URL, {
      max: 4,
      prepare: false,
      ssl: "require",
      connect_timeout: 15,
    });
    const db = drizzlePg(client, { schema });
    globalForDb.allyApplySchema = async (sqlText: string) => {
      for (const statement of sqlText.split(";").map((part) => part.trim()).filter(Boolean)) {
        await client.unsafe(statement);
      }
    };
    await applySchemaSql(globalForDb.allyApplySchema);
    globalForDb.appliedSchemaSql = SCHEMA_SQL;
    return db;
  }

  const dataDir = path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dataDir, { recursive: true });
  const pglite = new PGlite(dataDir);
  await pglite.waitReady;
  const db = drizzlePglite(pglite, { schema });
  globalForDb.allyApplySchema = async (sqlText: string) => {
    await pglite.exec(sqlText);
  };
  await applySchemaSql(globalForDb.allyApplySchema);
  globalForDb.appliedSchemaSql = SCHEMA_SQL;
  return db;
}

export async function getDb() {
  if (!globalForDb.allyReady) {
    globalForDb.allyReady = (async () => {
      const db = await createDb();
      globalForDb.allyDb = db;
      globalForDb.allySeeding = true;
      try {
        if (process.env.NEXT_PHASE !== "phase-production-build") {
          const { seedDevelopmentData } = await import("@/lib/db/seed");
          await seedDevelopmentData(db);
        }
      } finally {
        globalForDb.allySeeding = false;
      }
      return db;
    })();
  }
  if (globalForDb.allySeeding && globalForDb.allyDb) {
    return globalForDb.allyDb;
  }
  const db = await globalForDb.allyReady;
  if (globalForDb.allyApplySchema && globalForDb.appliedSchemaSql !== SCHEMA_SQL) {
    await applySchemaSql(globalForDb.allyApplySchema);
    globalForDb.appliedSchemaSql = SCHEMA_SQL;
  }
  return db;
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
