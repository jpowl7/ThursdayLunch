import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { neon } from "@neondatabase/serverless";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);
  const migrationPath = join(__dirname, "migrations", "001_initial.sql");
  const migration = readFileSync(migrationPath, "utf-8");

  // Split on semicolons and run each statement
  const statements = migration
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await sql.query(statement);
  }

  console.log("Migration complete!");
}

migrate().catch(console.error);
