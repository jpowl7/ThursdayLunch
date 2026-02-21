import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { neon } from "@neondatabase/serverless";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);
  const migrationsDir = join(__dirname, "migrations");

  // Ensure tracking table exists
  await sql.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  const applied = await sql.query("SELECT name FROM _migrations ORDER BY name") as { name: string }[];
  const appliedSet = new Set(applied.map((r) => r.name));

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`Skipping ${file} (already applied)`);
      continue;
    }

    const migration = readFileSync(join(migrationsDir, file), "utf-8");
    const statements = migration
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await sql.query(statement);
    }

    await sql.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
    console.log(`Applied ${file}`);
  }

  console.log("Migration complete!");
}

migrate().catch(console.error);
