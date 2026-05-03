import { Router } from "express";
import { db } from "@workspace/db";
import { vendorsTable, reviewsTable, customersTable } from "@workspace/db";
import { eq, ilike, and, desc, count, gte, sql } from "drizzle-orm";
import { notifyUser } from "../lib/notify";

const router = Router();

function sanitizeContactInfo(text: string | null | undefined): string | null | undefined {
  if (!text) return text;
  let out = text.replace(/(?:\+91[\s\-.]?)?[6-9]\d{9}/g, "[phone removed]");
  out = out.replace(/\b\d{10,}\b/g, "[number removed]");
  out = out.replace(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi, "[email removed]");
  out = out.replace(/(?:https?:\/\/|www\.)\S+/gi, "[link removed]");
  out = out.replace(/(?:whatsapp|wa\.me|telegram|t\.me|signal)[\s:@/]\S*/gi, "[removed]");
  return out;
}

router.get("/vendors", async (req, res) => {
  try {
    const { city, cuisine, search } = req.query as Record<string, string>;
    const isAdmin = req.isAuthenticated() && req.user.role === "super_admin";
    // Support legacy ?includeAll=true used by admin overview page
    const includeAll = req.query.includeAll === "true" && isAdmin;

    const conditions: ReturnType<typeof eq>[] = [];
    if (!isAdmin && !includeAll) conditions.push(eq(vendorsTable.status, "approved"));
    if (city) conditions.push(eq(vendorsTable.city, city));
    // ilike = case-insensitive LIKE — avoids missing "north indian" vs "North Indian"
    if (cuisine) conditions.push(ilike(vendorsTable.cuisineType, `%${cuisine}%`));
    if (search) conditions.push(ilike(vendorsTable.name, `%${search}%`));

    const vendors = await db.select().from(vendorsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(vendorsTable.featured), desc(vendorsTable.createdAt));

    // Add cache hint for public vendor lists (approved only, no filters)
    if (!isAdmin && !search && !city && !cuisine) {
      res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
    } else {
      res.set("Cache-Control", "no-store");
    }

    res.json({ vendors });
  } catch (err) {
    req.log.error({ err }, "Failed to list vendors");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/vendors", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { name, description, city, address, cuisineType, fssaiLicense } = req.body;
    const [vendor] = await db.insert(vendorsTable).values({
      ownerUserId: req.user.id,
      name: sanitizeContactInfo(name) ?? name,
      description: sanitizeContactInfo(description) ?? null,
      city,
      address: sanitizeContactInfo(address) ?? null,
      cuisineType,
      fssaiLicense,
      subscriptionTier: "basic",
      status: "pending",
    }).returning();
    res.status(201).json({ vendor });
  } catch (err) {
    req.log.error({ err }, "Failed to create vendor");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/vendors/me", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.ownerUserId, req.user.id));
    if (!vendor) {
      res.status(404).json({ error: "Vendor profile not found" });
      return;
    }
    res.json({ vendor });
  } catch (err) {
    req.log.error({ err }, "Failed to get vendor profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/vendors/:vendorId", async (req, res) => {
  try {
    const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, req.params.vendorId));
    if (!vendor) {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }
    const isAdmin = req.isAuthenticated() && req.user.role === "super_admin";
    const isOwner = req.isAuthenticated() && vendor.ownerUserId === req.user.id;
    if (vendor.status !== "approved" && !isAdmin && !isOwner) {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }
    res.json({ vendor });
  } catch (err) {
    req.log.error({ err }, "Failed to get vendor");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/vendors/:vendorId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [existing] = await db.select({ ownerUserId: vendorsTable.ownerUserId })
      .from(vendorsTable).where(eq(vendorsTable.id, req.params.vendorId));
    if (!existing) {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }
    const isAdmin = req.user.role === "super_admin";
    if (existing.ownerUserId !== req.user.id && !isAdmin) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const {
      name, description, address, cuisineType, city,
      logoUrl, coverImageUrl, fssaiLicense,
      deliveryRadius, minimumOrderAmount,
      featured, commissionRate, subscriptionTier,
    } = req.body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = sanitizeContactInfo(name);
    if (description !== undefined) updates.description = sanitizeContactInfo(description);
    if (address !== undefined) updates.address = sanitizeContactInfo(address);
    if (cuisineType !== undefined) updates.cuisineType = cuisineType;
    if (city !== undefined) updates.city = city;
    if (logoUrl !== undefined) updates.logoUrl = logoUrl;
    if (coverImageUrl !== undefined) updates.coverImageUrl = coverImageUrl;
    if (fssaiLicense !== undefined) updates.fssaiLicense = fssaiLicense;
    if (deliveryRadius !== undefined) updates.deliveryRadius = deliveryRadius;
    if (minimumOrderAmount !== undefined) updates.minimumOrderAmount = minimumOrderAmount;

    if (isAdmin) {
      if (featured !== undefined) updates.featured = Boolean(featured);
      if (commissionRate !== undefined) {
        const rate = parseFloat(String(commissionRate));
        if (isNaN(rate) || rate < 0 || rate > 100) {
          res.status(400).json({ error: "commissionRate must be between 0 and 100" });
          return;
        }
        updates.commissionRate = rate.toFixed(2);
      }
      if (subscriptionTier !== undefined) {
        const allowedTiers = ["basic", "pro", "enterprise"];
        if (!allowedTiers.includes(String(subscriptionTier))) {
          res.status(400).json({ error: "subscriptionTier must be one of: basic, pro, enterprise" });
          return;
        }
        updates.subscriptionTier = subscriptionTier;
      }
    }

    const [vendor] = await db.update(vendorsTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(vendorsTable.id, req.params.vendorId))
      .returning();
    res.json({ vendor });
  } catch (err) {
    req.log.error({ err }, "Failed to update vendor");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/vendors/:vendorId/stats", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { vendorId } = req.params;
    const { ordersTable, customerSubscriptionsTable } = await import("@workspace/db");

    const [vendorRow] = await db.select({ ownerUserId: vendorsTable.ownerUserId })
      .from(vendorsTable).where(eq(vendorsTable.id, vendorId));
    if (!vendorRow) {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }
    if (vendorRow.ownerUserId !== req.user.id && req.user.role !== "super_admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split("T")[0];

    // Run all 4 queries in parallel — no more full table scan
    const [allTimeRow, todayRow, monthRow, subRow] = await Promise.all([
      db
        .select({
          total: count(),
          revenue: sql<number>`coalesce(sum(${ordersTable.totalAmount}::numeric), 0)`,
        })
        .from(ordersTable)
        .where(eq(ordersTable.vendorId, vendorId)),

      db
        .select({
          total: count(),
          pending: sql<number>`count(*) filter (where ${ordersTable.status} = 'pending')::int`,
          delivered: sql<number>`count(*) filter (where ${ordersTable.status} = 'delivered')::int`,
        })
        .from(ordersTable)
        .where(and(eq(ordersTable.vendorId, vendorId), eq(ordersTable.scheduledDate, today))),

      db
        .select({
          revenue: sql<number>`coalesce(sum(${ordersTable.totalAmount}::numeric), 0)`,
        })
        .from(ordersTable)
        .where(and(eq(ordersTable.vendorId, vendorId), gte(ordersTable.scheduledDate, monthStartStr))),

      db
        .select({ count: count() })
        .from(customerSubscriptionsTable)
        .where(and(
          eq(customerSubscriptionsTable.vendorId, vendorId),
          eq(customerSubscriptionsTable.status, "active"),
        )),
    ]);

    // Rating is already stored on the vendor row (updated by refreshVendorRating on each review)
    const [vendorFull] = await db
      .select({ rating: vendorsTable.rating, reviewCount: vendorsTable.reviewCount })
      .from(vendorsTable)
      .where(eq(vendorsTable.id, vendorId));

    res.json({
      stats: {
        totalRevenue: Number(allTimeRow[0]?.revenue ?? 0),
        totalOrders: Number(allTimeRow[0]?.total ?? 0),
        activeSubscriptions: Number(subRow[0]?.count ?? 0),
        averageRating: vendorFull?.rating ? parseFloat(String(vendorFull.rating)) : null,
        reviewCount: vendorFull?.reviewCount ?? 0,
        todayOrders: Number(todayRow[0]?.total ?? 0),
        monthlyRevenue: Number(monthRow[0]?.revenue ?? 0),
        pendingOrders: Number(todayRow[0]?.pending ?? 0),
        completedOrdersToday: Number(todayRow[0]?.delivered ?? 0),
      }
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get vendor stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/vendors/:vendorId/status", async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { status } = req.body as { status: string };
  const allowed = ["approved", "rejected", "suspended", "pending"];
  if (!allowed.includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  try {
    const [vendor] = await db
      .update(vendorsTable)
      .set({ status: status as "pending" | "approved" | "suspended" | "rejected", updatedAt: new Date() })
      .where(eq(vendorsTable.id, req.params.vendorId))
      .returning();
    if (!vendor) {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }

    // Notify the vendor owner about their application status change
    if ((status === "approved" || status === "rejected" || status === "suspended") && vendor.ownerUserId) {
      const messages: Record<string, { title: string; body: string }> = {
        approved:  { title: "Kitchen approved!", body: `Congratulations! Your kitchen "${vendor.name}" is now live on Dabba. Customers can discover and subscribe to your tiffin plans.` },
        rejected:  { title: "Application not approved", body: `Your kitchen application for "${vendor.name}" was not approved at this time. Please contact support for more details.` },
        suspended: { title: "Kitchen suspended", body: `Your kitchen "${vendor.name}" has been temporarily suspended. Please contact support to resolve this.` },
      };
      const msg = messages[status];
      if (msg) {
        void notifyUser(vendor.ownerUserId, {
          type: `vendor_${status}`,
          title: msg.title,
          body: msg.body,
          metadata: { vendorId: vendor.id, vendorName: vendor.name, status },
        });
      }
    }

    res.json({ vendor });
  } catch (err) {
    req.log.error({ err }, "Failed to update vendor status");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
