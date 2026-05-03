import { Router } from "express";
import { db } from "@workspace/db";
import { vendorsTable, reviewsTable } from "@workspace/db";
import { eq, like, and, desc } from "drizzle-orm";

const router = Router();

// ─── Contact info sanitization ─────────────────────────────────────────────────
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
    const { city, cuisine, search, includeAll } = req.query as Record<string, string>;

    const conditions: ReturnType<typeof eq>[] = [];
    if (!includeAll) conditions.push(eq(vendorsTable.status, "approved"));
    if (city) conditions.push(eq(vendorsTable.city, city));
    if (cuisine) conditions.push(like(vendorsTable.cuisineType, `%${cuisine}%`));
    if (search) conditions.push(like(vendorsTable.name, `%${search}%`));

    const vendors = await db.select().from(vendorsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(vendorsTable.featured), desc(vendorsTable.createdAt));
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
    const { name, description, city, address, cuisineType, fssaiLicense, subscriptionTier } = req.body;
    const [vendor] = await db.insert(vendorsTable).values({
      ownerUserId: req.user.id,
      name: sanitizeContactInfo(name) ?? name,
      description: sanitizeContactInfo(description) ?? null,
      city,
      address: sanitizeContactInfo(address) ?? null,
      cuisineType,
      fssaiLicense,
      subscriptionTier: subscriptionTier || "basic",
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
    const body = { ...req.body };
    if (body.description !== undefined) body.description = sanitizeContactInfo(body.description);
    if (body.name !== undefined) body.name = sanitizeContactInfo(body.name);
    if (body.address !== undefined) body.address = sanitizeContactInfo(body.address);

    const [vendor] = await db.update(vendorsTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(vendorsTable.id, req.params.vendorId))
      .returning();
    res.json({ vendor });
  } catch (err) {
    req.log.error({ err }, "Failed to update vendor");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/vendors/:vendorId/stats", async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { ordersTable, customerSubscriptionsTable } = await import("@workspace/db");

    const [subCount] = await db
      .select({ count: db.$count(customerSubscriptionsTable.id) })
      .from(customerSubscriptionsTable)
      .where(and(
        eq(customerSubscriptionsTable.vendorId, vendorId),
        eq(customerSubscriptionsTable.status, "active")
      ));

    const orders = await db.select().from(ordersTable).where(eq(ordersTable.vendorId, vendorId));
    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount as string), 0);
    const today = new Date().toISOString().split("T")[0];
    const todayOrders = orders.filter(o => o.scheduledDate === today);

    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split("T")[0];
    const monthOrders = orders.filter(o => o.scheduledDate >= monthStartStr);
    const monthlyRevenue = monthOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount as string), 0);

    // Calculate real average rating from reviews
    const reviews = await db.select({ rating: reviewsTable.rating })
      .from(reviewsTable)
      .where(eq(reviewsTable.vendorId, vendorId));
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

    res.json({
      stats: {
        totalRevenue,
        totalOrders: orders.length,
        activeSubscriptions: Number(subCount?.count ?? 0),
        averageRating: averageRating !== null ? parseFloat(averageRating.toFixed(1)) : null,
        reviewCount: reviews.length,
        todayOrders: todayOrders.length,
        monthlyRevenue,
        pendingOrders: todayOrders.filter(o => o.status === "pending").length,
        completedOrdersToday: todayOrders.filter(o => o.status === "delivered").length,
      }
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get vendor stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
