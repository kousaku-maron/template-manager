import { betterAuth } from "better-auth";
import type { User, Session } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Database } from "./db";

export type Auth = ReturnType<typeof createAuth>;

export type { User, Session };

export function createAuth(secret: string, db: Database) {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
    }),
    secret,
    emailAndPassword: {
      enabled: true,
    },
  });
}
