import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);

    if (!match || process.env[match[1]]) {
      continue;
    }

    process.env[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
  }
}

loadEnvFile(join(process.cwd(), ".env.local"));

const connectionString = process.env.SUPABASE_SESSION_POOLER_URL ?? process.env.DATABASE_URL;

function createPoolConfig(value) {
  const databaseUrl = new URL(value);

  return {
    host: databaseUrl.hostname,
    port: databaseUrl.port ? Number(databaseUrl.port) : undefined,
    database: databaseUrl.pathname.replace(/^\//, "") || undefined,
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    ssl: process.env.POSTGRES_SSL === "false" ? false : { rejectUnauthorized: false },
  };
}

if (!connectionString) {
  console.error("Missing SUPABASE_SESSION_POOLER_URL or DATABASE_URL.");
  process.exit(1);
}

const sql = readFileSync(join(process.cwd(), "database/staff-users.sql"), "utf8");
const pool = new Pool(createPoolConfig(connectionString));

try {
  await pool.query(sql);
  console.log("Staff user schema is ready.");
} finally {
  await pool.end();
}
