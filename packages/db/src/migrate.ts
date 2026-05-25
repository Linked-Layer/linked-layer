import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "./client";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

/** Apply all *.sql migrations in lexical order, tracked in _migrations. */
export async function migrate(): Promise<void> {
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS _migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);

  const applied = new Set(
    (await sql`SELECT name FROM _migrations`).map((r) => r.name as string),
  );

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`• skip   ${file} (already applied)`);
      continue;
    }
    const content = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`• apply  ${file}`);
    await sql.unsafe(content);
    await sql`INSERT INTO _migrations (name) VALUES (${file})`;
  }
  console.log("✓ migrations up to date");
}

// Run directly: `tsx src/migrate.ts`
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("migrate.ts")) {
  migrate()
    .then(() => sql.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("migration failed:", err);
      sql.end();
      process.exit(1);
    });
}
