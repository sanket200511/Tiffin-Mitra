import { pgTable, text, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { dabbaSchema } from "./schema";

export const payoutRequestStatusEnum = dabbaSchema.enum("app_payout_request_status", [
  "pending", "processing", "paid", "rejected",
]);

export const payoutRequestsTable = dabbaSchema.table("payout_requests", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  vendorId: text("vendor_id").notNull(),
  vendorName: text("vendor_name"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  upiId: text("upi_id"),
  bankAccount: text("bank_account"),
  ifscCode: text("ifsc_code"),
  accountName: text("account_name"),
  notes: text("notes"),
  status: payoutRequestStatusEnum("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PayoutRequest = typeof payoutRequestsTable.$inferSelect;
