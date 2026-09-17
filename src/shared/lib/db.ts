import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/features/auth/infrastructure/user-schema";
import { getServerEnv } from "@/shared/lib/env";

function createDb() {
  const { DATABASE_URL } = getServerEnv();
  const sql = neon(DATABASE_URL);
  return drizzle(sql, { schema });
}

export type Database = ReturnType<typeof createDb>;

const globalForDb = globalThis as unknown as { __meetingDb?: Database };

export function getDb(): Database {
  if (!globalForDb.__meetingDb) {
    globalForDb.__meetingDb = createDb();
  }
  return globalForDb.__meetingDb;
}
