import { pgTable, text, date, timestamp, unique } from "drizzle-orm/pg-core";
import { vendorsTable } from "./vendors";

export const vendorHolidaysTable = pgTable("vendor_holidays", {
  id:       text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  vendorId: text("vendor_id").notNull().references(() => vendorsTable.id, { onDelete: "cascade" }),
  date:     date("date").notNull(),
  reason:   text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  uniqVendorDate: unique().on(t.vendorId, t.date),
}));

export type VendorHoliday = typeof vendorHolidaysTable.$inferSelect;
