/**
 * One-shot baseline: mark every current migration file as applied WITHOUT
 * running it. Run this exactly once on an existing production DB whose
 * tables were created by earlier drizzle-kit pushes.
 *
 * After baseline, `pnpm db:migrate` will only apply NEW migrations added
 * from this point forward.
 *
 * Usage:
 *   pnpm db:baseline
 *   DATABASE_URL=... pnpm tsx scripts/db-baseline.ts
 */
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");
const TRACKING_TABLE = "_gist_migrations";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  // Same SSL handling as db-migrate — managed Postgres (Supabase, Neon, etc.)
  // requires SSL; set DISABLE_DB_SSL=1 for plain local dev DBs.
  const sql = postgres(databaseUrl, {
    max: 1,
    onnotice: () => {},
    ssl: process.env.DISABLE_DB_SSL ? false : "require",
  });

  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "${TRACKING_TABLE}" (
        "id" varchar(255) PRIMARY KEY,
        "applied_at" timestamp DEFAULT NOW() NOT NULL
      )
    `);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => /^\d{4}_.*\.sql$/.test(f))
      .sort();

    if (files.length === 0) {
      console.log("No migration files found.");
      return;
    }

    let marked = 0;
    let skipped = 0;
    for (const file of files) {
      const id = file.replace(/\.sql$/, "");
      const result = await sql.unsafe<{ id: string }[]>(
        `INSERT INTO "${TRACKING_TABLE}" (id) VALUES ($1)
         ON CONFLICT (id) DO NOTHING
         RETURNING id`,
        [id]
      );
      if (result.length > 0) {
        console.log(`  ✓ marked ${id}`);
        marked++;
      } else {
        console.log(`  - ${id} already tracked`);
        skipped++;
      }
    }

    console.log(
      `Baseline complete. Marked ${marked} new entries, skipped ${skipped}.`
    );
    console.log(
      "⚠ Verify the DB actually matches this schema version before running future migrations."
    );
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("Baseline failed:", err);
  process.exit(1);
});
