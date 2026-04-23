/**
 * Incremental SQL migrator.
 *
 * Why this exists instead of `drizzle-kit migrate`:
 *   The repo ships drizzle migration SQL files (drizzle/NNNN_*.sql) but no
 *   `drizzle/meta/_journal.json`, so drizzle-kit doesn't know what's been
 *   applied and would regenerate the world. This script tracks applied
 *   migrations in a `_gist_migrations` table and applies new ones in order.
 *
 * Usage:
 *   pnpm db:migrate           # apply all pending migrations
 *   DATABASE_URL=... pnpm tsx scripts/db-migrate.ts
 *
 * On fresh DBs: applies every NNNN_*.sql file from drizzle/ in order.
 * On DBs that were set up manually (existing prod): run
 * `pnpm db:baseline` ONCE first to mark the already-applied migrations.
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

  const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });

  try {
    // 1. Ensure tracking table
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "${TRACKING_TABLE}" (
        "id" varchar(255) PRIMARY KEY,
        "applied_at" timestamp DEFAULT NOW() NOT NULL
      )
    `);

    // 2. Which migrations are already applied?
    const applied = await sql.unsafe<{ id: string }[]>(
      `SELECT id FROM "${TRACKING_TABLE}"`
    );
    const appliedSet = new Set(applied.map((r) => r.id));

    // 3. List migration files, sorted
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => /^\d{4}_.*\.sql$/.test(f))
      .sort();

    if (files.length === 0) {
      console.log("No migration files found in drizzle/.");
      return;
    }

    console.log(
      `Found ${files.length} migration file(s). Already applied: ${appliedSet.size}.`
    );

    let appliedCount = 0;
    for (const file of files) {
      const id = file.replace(/\.sql$/, "");
      if (appliedSet.has(id)) {
        console.log(`  ✓ skip  ${id} (already applied)`);
        continue;
      }

      const filePath = path.join(MIGRATIONS_DIR, file);
      const raw = fs.readFileSync(filePath, "utf8");

      // Drizzle uses `--> statement-breakpoint` to separate statements.
      // For files without the marker, run the whole file as one block.
      const statements = raw.includes("--> statement-breakpoint")
        ? raw
            .split("--> statement-breakpoint")
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : [raw];

      console.log(
        `  → apply ${id} (${statements.length} statement${
          statements.length === 1 ? "" : "s"
        })`
      );

      try {
        await sql.begin(async (tx) => {
          for (const stmt of statements) {
            // .simple() enables simple protocol so a single unsafe() call
            // can run multi-statement SQL — needed for migration files that
            // don't use `--> statement-breakpoint`.
            await tx.unsafe(stmt).simple();
          }
          await tx.unsafe(
            `INSERT INTO "${TRACKING_TABLE}" (id) VALUES ($1)`,
            [id]
          );
        });
      } catch (err) {
        console.error(`  ✗ FAILED on ${id}:`, err);
        throw err;
      }

      console.log(`  ✓ ${id} applied`);
      appliedCount++;
    }

    console.log(
      appliedCount === 0
        ? "Nothing to do. Database is up to date."
        : `Done. Applied ${appliedCount} migration(s).`
    );
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
