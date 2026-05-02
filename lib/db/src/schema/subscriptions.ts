import { pgTable, text, timestamp, numeric, integer, boolean, pgEnum, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const planTypeEnum = pgEnum("plan_type", ["daily", "weekly", "monthly", "weekday", "trial_3day", "trial_7day", "custom"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "paused", "cancelled", "expired"]);

export const subscriptionPlansTable = pgTable("subscription_plans", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  vendorId: text("vendor_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  planType: planTypeEnum("plan_type").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  mealTypes: text("meal_types").array().notNull().default([]),
  dietType: text("diet_type"),
  mealsPerDay: integer("meals_per_day").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const customerSubscriptionsTable = pgTable("customer_subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull(),
  planId: text("plan_id").notNull(),
  vendorId: text("vendor_id").notNull(),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  deliverySlot: text("delivery_slot"),
  walletBalance: numeric("wallet_balance", { precision: 10, scale: 2 }).notNull().default("0"),
  skippedDays: text("skipped_days").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlansTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomerSubscriptionSchema = createInsertSchema(customerSubscriptionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlansTable.$inferSelect;
export type CustomerSubscription = typeof customerSubscriptionsTable.$inferSelect;
