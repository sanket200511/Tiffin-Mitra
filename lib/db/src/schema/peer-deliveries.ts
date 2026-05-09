import { pgTable, text, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { dabbaSchema } from "./schema";

export const p2pStatusEnum = dabbaSchema.enum("app_p2p_status", ["open", "accepted", "in_transit", "delivered", "cancelled"]);
export const p2pCategoryEnum = dabbaSchema.enum("app_p2p_category", ["books", "documents", "food", "medicine", "gift", "other"]);

export const peerDeliveriesTable = dabbaSchema.table("peer_deliveries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  // The person who needs the item delivered
  requesterId: text("requester_id").notNull(),
  requesterName: text("requester_name"),
  // What to deliver
  itemTitle: text("item_title").notNull(),
  itemDescription: text("item_description"),
  itemCategory: p2pCategoryEnum("item_category").notNull().default("other"),
  estimatedWeightKg: numeric("estimated_weight_kg", { precision: 4, scale: 2 }).default("0.50"),
  // Where
  pickupLocality: text("pickup_locality").notNull(),      // shown publicly (e.g. "Aundh")
  pickupAddress: text("pickup_address").notNull(),         // revealed to accepted carrier only
  dropoffLocality: text("dropoff_locality").notNull(),
  dropoffAddress: text("dropoff_address").notNull(),
  city: text("city").notNull(),
  // Terms
  offeredPrice: numeric("offered_price", { precision: 8, scale: 2 }).notNull().default("0"),
  preferredTime: text("preferred_time"),
  notes: text("notes"),
  // Lifecycle
  status: p2pStatusEnum("p2p_status").notNull().default("open"),
  acceptedByUserId: text("accepted_by_user_id"),
  acceptorName: text("acceptor_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPeerDeliverySchema = createInsertSchema(peerDeliveriesTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertPeerDelivery = z.infer<typeof insertPeerDeliverySchema>;
export type PeerDelivery = typeof peerDeliveriesTable.$inferSelect;
