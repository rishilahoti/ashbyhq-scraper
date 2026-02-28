import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
    min: 1,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 10000,
  });

  pool.on("error", () => {});

  return pool;
}
