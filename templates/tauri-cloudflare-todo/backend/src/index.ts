import { and, asc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { nanoid } from "nanoid";
import { kanbanCard } from "../db/schema/app";
import { createAuth } from "./auth";
import { createDb } from "./db";

type Bindings = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  CORS_ORIGINS: string;
};

type Variables = {
  userId: string;
};

type CardStatus = "backlog" | "todo" | "in_progress" | "done";
type Env = { Bindings: Bindings; Variables: Variables };

const app = new Hono<Env>();

function parseOrigins(raw: string): string[] {
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function isStatus(value: unknown): value is CardStatus {
  return value === "backlog" || value === "todo" || value === "in_progress" || value === "done";
}

function isPgUniqueViolation(error: unknown): error is { code: string } {
  if (!error || typeof error !== "object") {
    return false;
  }

  return "code" in error && (error as { code?: unknown }).code === "23505";
}

app.use("*", async (c, next) => {
  const allowedOrigins = parseOrigins(c.env.CORS_ORIGINS);

  return cors({
    origin: (origin) => {
      if (!origin) {
        return allowedOrigins[0] || c.env.BETTER_AUTH_URL;
      }
      return allowedOrigins.includes(origin)
        ? origin
        : allowedOrigins[0] || c.env.BETTER_AUTH_URL;
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })(c, next);
});

app.get("/api/health", (c) => c.json({ ok: true }));

app.all("/api/auth/*", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const auth = createAuth(c.env, db);
  return auth.handler(c.req.raw);
});

const requireUser: MiddlewareHandler<Env> = async (c, next) => {
  const db = createDb(c.env.DATABASE_URL);
  const auth = createAuth(c.env, db);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user?.id) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("userId", session.user.id);
  await next();
};

app.use("/api/cards", requireUser);
app.use("/api/cards/*", requireUser);
app.use("/api/reorder", requireUser);

app.get("/api/me", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const auth = createAuth(c.env, db);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ user: null });
  }

  return c.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
  });
});

app.get("/api/cards", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const userId = c.get("userId");

  const statusOrder = sql`case ${kanbanCard.status} when 'backlog' then 0 when 'todo' then 1 when 'in_progress' then 2 else 3 end`;

  const cards = await db
    .select()
    .from(kanbanCard)
    .where(eq(kanbanCard.userId, userId))
    .orderBy(statusOrder, asc(kanbanCard.sortOrder), asc(kanbanCard.createdAt));

  return c.json({ cards });
});

app.post("/api/cards", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const userId = c.get("userId");
  const body = await c.req.json<{
    title?: string;
    description?: string;
    status?: CardStatus;
    sortOrder?: number;
  }>();

  const title = (body.title || "").trim();
  if (!title) {
    return c.json({ error: "title is required" }, 400);
  }

  const now = new Date();
  const card = {
    id: nanoid(12),
    userId,
    title,
    description: body.description || "",
    status: isStatus(body.status) ? body.status : "backlog",
    sortOrder: Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : 0,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(kanbanCard).values(card);

  return c.json({ card }, 201);
});

app.patch("/api/cards/:id", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const userId = c.get("userId");
  const id = c.req.param("id");

  const body = await c.req.json<{
    title?: string;
    description?: string;
    status?: CardStatus;
    sortOrder?: number;
  }>();

  const patch: Partial<typeof kanbanCard.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title) {
      return c.json({ error: "title cannot be empty" }, 400);
    }
    patch.title = title;
  }

  if (typeof body.description === "string") {
    patch.description = body.description;
  }

  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
    patch.sortOrder = body.sortOrder;
  }

  if (typeof body.status !== "undefined") {
    if (!isStatus(body.status)) {
      return c.json({ error: "invalid status" }, 400);
    }
    patch.status = body.status;
  }

  await db
    .update(kanbanCard)
    .set(patch)
    .where(and(eq(kanbanCard.id, id), eq(kanbanCard.userId, userId)));

  const updated = await db
    .select()
    .from(kanbanCard)
    .where(and(eq(kanbanCard.id, id), eq(kanbanCard.userId, userId)))
    .limit(1);

  if (!updated[0]) {
    return c.json({ error: "Card not found" }, 404);
  }

  return c.json({ card: updated[0] });
});

app.post("/api/reorder", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const userId = c.get("userId");
  const body = await c.req.json<{
    items: { id: string; status: CardStatus; sortOrder: number }[];
  }>();

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return c.json({ error: "items is required" }, 400);
  }

  const itemIds = new Set<string>();
  for (const item of body.items) {
    if (!item.id || !isStatus(item.status) || !Number.isInteger(item.sortOrder) || item.sortOrder < 0) {
      return c.json({ error: "invalid item" }, 400);
    }

    if (itemIds.has(item.id)) {
      return c.json({ error: "duplicate item id" }, 400);
    }
    itemIds.add(item.id);
  }

  try {
    const inputValues = body.items.map((item) => sql`(${item.id}, ${item.status}, ${item.sortOrder})`);
    const result = await db.execute<{ id: string }>(sql`
      with input(id, status, sort_order) as (
        values ${sql.join(inputValues, sql`, `)}
      )
      update "kanban_card" as c
      set
        "status" = input.status::text,
        "sort_order" = input.sort_order::integer,
        "updated_at" = now()
      from input
      where c."id" = input.id
        and c."user_id" = ${userId}
      returning c."id"
    `);

    if (result.rows.length !== body.items.length) {
      return c.json({ error: "Card not found" }, 404);
    }
  } catch (error) {
    if (isPgUniqueViolation(error)) {
      return c.json({ error: "Conflicting sort order" }, 409);
    }

    throw error;
  }

  return c.json({ ok: true });
});

app.delete("/api/cards/:id", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const userId = c.get("userId");
  const id = c.req.param("id");

  await db
    .delete(kanbanCard)
    .where(and(eq(kanbanCard.id, id), eq(kanbanCard.userId, userId)));

  return c.json({ ok: true });
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((error, c) => {
  console.error(error);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
