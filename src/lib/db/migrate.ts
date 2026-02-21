import { readFileSync } from "fs";
import { join } from "path";
import { neon } from "@neondatabase/serverless";

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
    await sql(statement as unknown as TemplateStringsArray);
  }

  console.log("Migration complete!");
}

migrate().catch(console.error);
