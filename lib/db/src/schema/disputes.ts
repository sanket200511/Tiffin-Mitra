import { text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { dabbaSchema } from "./schema";

export const disputeStatusEnum = dabbaSchema.enum("app_dispute_status", ["pending", "reviewed", "resolved", "rejected"]);
export const disputeTypeEnum = dabbaSchema.enum("app_dispute_type", ["damaged", "missing_item", "poor_quality", "wrong_item", "not_delivered", "other"]);

export const disputesTable = dabbaSchema.table("disputes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: text("order_id").notNull(),
  customerId: text("customer_id").notNull(),
  vendorId: text("vendor_id").notNull(),
  issueType: disputeTypeEnum("issue_type").notNull(),
  description: text("description").notNull(),
  photoUrl: text("photo_url"),
  status: disputeStatusEnum("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDisputeSchema = createInsertSchema(disputesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Dispute = typeof disputesTable.$inferSelect;
