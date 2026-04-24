import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const connectionString = process.env.DATABASE_URL || "";

const shouldUseSsl = () => {
  if (process.env.PGSSL === "false") {
    return false;
  }
  if (process.env.PGSSL === "true") {
    return { rejectUnauthorized: false };
  }
  if (!connectionString) {
    return false;
  }
  const isLocalConnection = /localhost|127\.0\.0\.1/i.test(connectionString);
  return isLocalConnection ? false : { rejectUnauthorized: false };
};

const poolConfig = connectionString
  ? {
      connectionString,
    }
  : {
      host: process.env.PGHOST || process.env.DB_HOST || "localhost",
      port: Number(process.env.PGPORT || process.env.DB_PORT || 5432),
      user: process.env.PGUSER || process.env.DB_USER || "postgres",
      password: process.env.PGPASSWORD || process.env.DB_PASSWORD || "",
      database: process.env.PGDATABASE || process.env.DB_NAME || "mix_loans",
    };

const ssl = shouldUseSsl();
if (ssl) {
  poolConfig.ssl = ssl;
}

export const pool = new Pool({
  ...poolConfig,
  max: Number(process.env.DB_POOL_SIZE || 10),
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

export const withTransaction = async (handler) => {
  const connection = await pool.connect();
  try {
    await connection.query("BEGIN");
    const result = await handler(connection);
    await connection.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await connection.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("PostgreSQL rollback failed:", rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }
};
