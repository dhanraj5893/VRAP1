import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import * as schema from "./schema";
import { DDL_STATEMENTS } from "./ensure-schema";
import { seedData } from "./seed";

/* -------------------------------------------------------------------------- */
/*  Database bootstrap.                                                        */
/*  - DATABASE_URL=postgresql://...  → real Postgres via pg (production).     */
/*  - Otherwise (unset / pglite://)  → PGlite, a real Postgres in WASM.       */
/*    On Vercel (serverless) the filesystem is ephemeral, so PGlite runs       */
/*    in-memory and auto-seeds demo data on first cold start.                  */
/*    Locally, PGlite is file-backed under ./.pglite-data for persistence.     */
/* -------------------------------------------------------------------------- */

const databaseUrl = process.env.DATABASE_URL ?? "";
const usePglite = !databaseUrl || databaseUrl.startsWith("pglite://");
const isServerless = !!process.env.VERCEL;

type PgDb = ReturnType<typeof drizzlePg<typeof schema>>;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaPgliteDb?: PgDb;
  __arenaPgliteReady?: Promise<void>;
  __arenaPgliteSeeded?: boolean;
  __arenaPgliteBootstrapping?: boolean;
};

let db: PgDb;

if (usePglite) {
  if (!globalForDb.__arenaPgliteDb) {
    // In serverless (Vercel), use in-memory PGlite — the filesystem is
    // ephemeral and each invocation is isolated. Locally, persist to disk.
    const dataDir = isServerless
      ? undefined
      : process.env.PGLITE_DATA_DIR ?? `${process.cwd()}/.pglite-data`;
    const client = new PGlite(dataDir ? { dataDir } : {});
    const pgliteDb = drizzlePglite(client, { schema }) as unknown as PgDb;
    globalForDb.__arenaPgliteDb = pgliteDb;
    // Queue DDL first, then auto-seed demo data if the DB is empty.
    globalForDb.__arenaPgliteReady = (async () => {
      await client.waitReady;
      for (const stmt of DDL_STATEMENTS) {
        await client.exec(stmt);
      }
      // Auto-seed once per cold start if the database is empty.
      if (!process.env.VRAP_SKIP_AUTOSEED && !globalForDb.__arenaPgliteSeeded) {
        const existing = await pgliteDb
          .select()
          .from(schema.users)
          .limit(1);
        if (existing.length === 0) {
          // Mark the bootstrap as in-flight so seedData()'s own ensureDb()
          // call returns immediately instead of awaiting this very promise
          // (which would deadlock every first request on a fresh database).
          globalForDb.__arenaPgliteBootstrapping = true;
          try {
            await seedData(pgliteDb);
          } finally {
            globalForDb.__arenaPgliteBootstrapping = false;
          }
          globalForDb.__arenaPgliteSeeded = true;
        }
      }
    })();
    // Attach the raw client for ensureDb() to await.
    (pgliteDb as unknown as { __client: unknown }).__client = client;
  }
  db = globalForDb.__arenaPgliteDb;
} else {
  const pool =
    globalForDb.__arenaNextJsPostgresqlPool ?? new Pool({ connectionString: databaseUrl });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = pool;
  }
  db = drizzlePg(pool, { schema });
}

export { db };

/** For the seed script / pg-only tooling. Null in PGlite mode. */
export const pool: Pool | null = usePglite ? null : (globalForDb.__arenaNextJsPostgresqlPool ?? null);

/** True when running on PGlite (Vercel serverless or local zero-setup demo). */
export const usePgliteForVercel = usePglite;

/**
 * Await PGlite schema bootstrap + auto-seed (no-op for real Postgres).
 * Call at the top of data-layer functions and server actions. Safe to repeat.
 */
export async function ensureDb(): Promise<void> {
  if (!usePglite) return;
  // Re-entrant call from inside the PGlite bootstrap (seedData) — tables are
  // already created by the bootstrap, so don't await the in-flight promise.
  if (globalForDb.__arenaPgliteBootstrapping) return;
  const ready = globalForDb.__arenaPgliteReady;
  if (ready) await ready;
}

/** Manually (re)seed the PGlite database. Used by the /api/seed route. */
export async function reseedPglite(): Promise<void> {
  if (!usePglite) return;
  await ensureDb();
  const rawClient = (db as unknown as { __client: { exec: (sql: string) => Promise<unknown> } }).__client;
  if (rawClient) {
    // Re-run DDL to be safe, then seed.
    for (const stmt of DDL_STATEMENTS) {
      await rawClient.exec(stmt);
    }
  }
  await seedData(db);
  globalForDb.__arenaPgliteSeeded = true;
}
