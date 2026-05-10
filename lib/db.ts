import { Pool, type PoolConfig } from "pg";

type DatabasePoolGlobal = typeof globalThis & {
  petCarePool?: Pool;
};

const globalForPool = globalThis as DatabasePoolGlobal;

function createPoolConfig(connectionString: string): PoolConfig {
  const databaseUrl = new URL(connectionString);

  return {
    host: databaseUrl.hostname,
    port: databaseUrl.port ? Number(databaseUrl.port) : undefined,
    database: databaseUrl.pathname.replace(/^\//, "") || undefined,
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: process.env.POSTGRES_SSL === "false" ? false : { rejectUnauthorized: false },
  };
}

export function getPool() {
  if (globalForPool.petCarePool) {
    return globalForPool.petCarePool;
  }

  const connectionString = process.env.SUPABASE_SESSION_POOLER_URL ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Missing SUPABASE_SESSION_POOLER_URL or DATABASE_URL.");
  }

  globalForPool.petCarePool = new Pool(createPoolConfig(connectionString));

  return globalForPool.petCarePool;
}
