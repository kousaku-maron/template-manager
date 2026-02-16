import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as appSchema from "../../../db/schema/app";
import * as authSchema from "../../../db/schema/auth";

export type Database = ReturnType<typeof createDb>;

export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, {
    schema: {
      ...appSchema,
      ...authSchema,
    },
  });
}
