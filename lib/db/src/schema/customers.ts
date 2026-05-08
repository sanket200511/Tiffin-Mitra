import { dabbaSchema } from "./schema";
import { text, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customersTable = dabbaSchema.table("customers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique(),
  name: text("name"),
  phone: text("phone"),
  defaultDeliveryAddress: text("default_delivery_address"),
  landmark: text("landmark"),
  city: text("city"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  walletBalance: numeric("wallet_balance", { precision: 10, scale: 2 }).notNull().default("0"),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  referralCode: text("referral_code").$defaultFn(() => Math.random().toString(36).substring(2, 8).toUpperCase()),
  referredByCode: text("referred_by_code"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const referralsTable = dabbaSchema.table("referrals", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  referrerId: text("referrer_id").notNull(),
  refereeId: text("referee_id").notNull(),
  referrerReward: numeric("referrer_reward", { precision: 10, scale: 2 }).notNull().default("50.00"),
  refereeReward: numeric("referee_reward", { precision: 10, scale: 2 }).notNull().default("25.00"),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const walletTransactionsTable = dabbaSchema.table("wallet_transactions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull(),
  type: text("type").notNull(), // credit | debit
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;
