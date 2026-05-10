import { pbkdf2Sync, randomBytes } from "node:crypto";
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

const args = new Map();

for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];

  if (key?.startsWith("--") && value) {
    args.set(key.slice(2), value);
  }
}

const username = args.get("username") ?? process.env.STAFF_SEED_USERNAME ?? process.env.STAFF_USERNAME;
const password = args.get("password") ?? process.env.STAFF_SEED_PASSWORD ?? process.env.STAFF_PASSWORD;
const displayName =
  args.get("name") ??
  process.env.STAFF_SEED_DISPLAY_NAME ??
  process.env.STAFF_DISPLAY_NAME ??
  username;
const role = args.get("role") ?? process.env.STAFF_SEED_ROLE ?? "admin";
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

function hashPassword(value) {
  const salt = randomBytes(16).toString("base64url");
  const key = pbkdf2Sync(value, salt, 310_000, 32, "sha256").toString("base64url");

  return `pbkdf2_sha256$310000$${salt}$${key}`;
}

if (!connectionString) {
  console.error("Missing SUPABASE_SESSION_POOLER_URL or DATABASE_URL.");
  process.exit(1);
}

if (!username || !password) {
  console.error(
    "Usage: npm run staff:create -- --username staff --password 123456 --name 泡泡爪员工 --role admin",
  );
  process.exit(1);
}

if (!["admin", "staff"].includes(role)) {
  console.error('Role must be "admin" or "staff".');
  process.exit(1);
}

const pool = new Pool(createPoolConfig(connectionString));

try {
  await pool.query(
    `insert into public.staff_users (username, display_name, password_hash, role)
     values ($1, $2, $3, $4)
     on conflict ((lower(username)))
     do update set
       display_name = excluded.display_name,
       password_hash = excluded.password_hash,
       role = excluded.role,
       is_active = true`,
    [username, displayName, hashPassword(password), role],
  );

  console.log(`Staff user "${username}" is ready.`);
} finally {
  await pool.end();
}
