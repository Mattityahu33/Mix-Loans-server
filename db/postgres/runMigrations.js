import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../pool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationFiles = fs
  .readdirSync(__dirname)
  .filter((name) => /^\d+.*\.sql$/i.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

if (migrationFiles.length === 0) {
  console.log("No PostgreSQL migration files found.");
  await pool.end();
  process.exit(0);
}

const client = await pool.connect();

try {
  for (const fileName of migrationFiles) {
    const filePath = path.join(__dirname, fileName);
    const sql = fs.readFileSync(filePath, "utf8").trim();
    if (!sql) {
      continue;
    }

    console.log(`Running migration: ${fileName}`);
    await client.query(sql);
  }

  console.log("PostgreSQL migrations completed successfully.");
} catch (error) {
  console.error("PostgreSQL migration failed:", error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
