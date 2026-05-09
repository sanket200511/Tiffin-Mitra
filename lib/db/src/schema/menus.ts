import { text, timestamp, numeric, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { dabbaSchema } from "./schema";

export const mealTypeEnum = dabbaSchema.enum("app_meal_type", ["breakfast", "lunch", "dinner", "snacks"]);
export const dietTypeEnum = dabbaSchema.enum("app_diet_type", ["veg", "non_veg", "jain", "diabetic_friendly"]);

export const menuItemsTable = dabbaSchema.table("menu_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  vendorId: text("vendor_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  mealType: mealTypeEnum("meal_type").notNull(),
  dietType: dietTypeEnum("diet_type").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  calories: integer("calories"),
  isAvailable: boolean("is_available").notNull().default(true),
  isFestivalSpecial: boolean("is_festival_special").notNull().default(false),
  tags: text("tags").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMenuItemSchema = createInsertSchema(menuItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItemsTable.$inferSelect;
