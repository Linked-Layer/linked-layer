import { config } from "@recall/core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/** Raw postgres-js client (also used by the migration runner). */
export const sql = postgres(config.databaseUrl, { max: 10 });

/** Drizzle ORM instance bound to the schema. */
export const db = drizzle(sql, { schema });

export type Database = typeof db;

export async function closeDb(): Promise<void> {
  await sql.end({ timeout: 5 });
}
