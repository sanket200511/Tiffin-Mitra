import { pgTable, text, timestamp, numeric, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vendorStatusEnum = pgEnum("vendor_status", ["pending", "approved", "suspended"]);
export const vendorTierEnum = pgEnum("vendor_tier", ["basic", "pro", "enterprise"]);

export const vendorsTable = pgTable("vendors", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ownerUserId: text("owner_user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  city: text("city").notNull(),
  address: text("address"),
  cuisineType: text("cuisine_type").notNull(),
  logoUrl: text("logo_url"),
  coverImageUrl: text("cover_image_url"),
  rating: numeric("rating", { precision: 3, scale: 2 }),
  reviewCount: integer("review_count").notNull().default(0),
  status: vendorStatusEnum("status").notNull().default("pending"),
  subscriptionTier: vendorTierEnum("subscription_tier").notNull().default("basic"),
  fssaiLicense: text("fssai_license"),
  deliveryZones: text("delivery_zones").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVendorSchema = createInsertSchema(vendorsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendorsTable.$inferSelect;
