import { text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { dabbaSchema } from "./schema";

export const notificationsTable = dabbaSchema.table("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
