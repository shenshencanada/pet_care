import { randomBytes, createHash } from "node:crypto";
import { Pool } from "pg";

function createPoolConfig(connectionString) {
  const databaseUrl = new URL(connectionString);

  return {
    host: databaseUrl.hostname,
    port: databaseUrl.port ? Number(databaseUrl.port) : undefined,
    database: databaseUrl.pathname.replace(/^\//, "") || undefined,
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    max: 1,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: process.env.POSTGRES_SSL === "false" ? false : { rejectUnauthorized: false },
  };
}

function hashApiKey(apiKey) {
  return createHash("sha256").update(apiKey).digest("hex");
}

const name = process.env.API_CLIENT_NAME ?? process.argv[2];

if (!name) {
  console.error("请提供 API 调用方名称：API_CLIENT_NAME=\"微信小程序\" npm run api-client:create");
  process.exit(1);
}

const connectionString = process.env.SUPABASE_SESSION_POOLER_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("缺少 SUPABASE_SESSION_POOLER_URL 或 DATABASE_URL。");
  process.exit(1);
}

const apiKey = `pc_${randomBytes(24).toString("base64url")}`;
const apiKeyHash = hashApiKey(apiKey);
const pool = new Pool(createPoolConfig(connectionString));

try {
  const result = await pool.query(
    `insert into public.api_clients (name, api_key_hash)
     values ($1, $2)
     returning id, name`,
    [name, apiKeyHash],
  );
  const client = result.rows[0];

  console.log(`API client created: ${client.name} (${client.id})`);
  console.log(`API key: ${apiKey}`);
  console.log("请立即保存 API key，数据库只保存哈希，后续无法找回明文。");
} finally {
  await pool.end();
}
