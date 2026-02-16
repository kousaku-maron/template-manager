import { defineMiddleware } from "astro:middleware";
import { createAuth } from "./lib/server/auth";
import { createDb } from "./lib/server/db";

export const onRequest = defineMiddleware(async ({ locals, request }, next) => {
  const env = locals.runtime.env;
  const db = createDb(env.DATABASE_URL);

  locals.db = db;
  locals.auth = createAuth(env.BETTER_AUTH_SECRET, db);

  // user
  const isAuthed = await locals.auth.api.getSession({
    headers: request.headers,
  });

  locals.user = isAuthed?.user || null;
  locals.session = isAuthed?.session || null;

  return next();
});
