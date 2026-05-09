import { text, timestamp, numeric, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { dabbaSchema } from "./schema";

export const vendorStatusEnum = dabbaSchema.enum("app_vendor_status", ["pending", "approved", "suspended", "rejected"]);
export const vendorTierEnum = dabbaSchema.enum("app_vendor_tier", ["basic", "pro", "enterprise"]);

export const vendorsTable = dabbaSchema.table("vendors", {
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
  featured: boolean("featured").notNull().default(false),
  commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }).notNull().default("10.00"),
  pauseCutoffHour: integer("pause_cutoff_hour").notNull().default(20), // Default 8:00 PM
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVendorSchema = createInsertSchema(vendorsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendorsTable.$inferSelect;
