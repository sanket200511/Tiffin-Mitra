import { pgTable, text, timestamp, numeric, pgEnum, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const orderStatusEnum = pgEnum("order_status", ["pending", "accepted", "preparing", "packed", "picked_up", "delivered", "cancelled"]);

export const ordersTable = pgTable("orders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull(),
  vendorId: text("vendor_id").notNull(),
  subscriptionId: text("subscription_id").notNull(),
  status: orderStatusEnum("order_status").notNull().default("pending"),
  scheduledDate: date("scheduled_date").notNull(),
  mealType: text("meal_type"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  deliveryAddress: text("delivery_address"),
  specialInstructions: text("special_instructions"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("orders_customer_id_idx").on(table.customerId),
  index("orders_vendor_id_idx").on(table.vendorId),
  index("orders_subscription_id_idx").on(table.subscriptionId),
  index("orders_scheduled_date_idx").on(table.scheduledDate),
  index("orders_status_idx").on(table.status),
]);

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
