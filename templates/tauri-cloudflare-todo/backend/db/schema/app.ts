import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const kanbanCard = pgTable(
  "kanban_card",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: text("status", { enum: ["backlog", "todo", "in_progress", "done"] }).notNull().default("backlog"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("kanban_card_user_status_idx").on(table.userId, table.status, table.sortOrder),
    uniqueIndex("kanban_card_user_status_sort_order_uq").on(
      table.userId,
      table.status,
      table.sortOrder,
    ),
  ],
);
