import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dns from "node:dns";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

// Prefer IPv4 when both IPv4 and IPv6 are returned to avoid local IPv6 routing issues.
dns.setDefaultResultOrder("ipv4first");

const client = postgres(databaseUrl);
export const db = drizzle(client, { schema });

export * from "./schema";
