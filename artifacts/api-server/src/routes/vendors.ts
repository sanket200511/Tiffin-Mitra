import { Router } from "express";
import { db } from "@workspace/db";
import { vendorsTable } from "@workspace/db";
import { eq, like, and, desc } from "drizzle-orm";

const router = Router();

router.get("/vendors", async (req, res) => {
  try {
    const { city, cuisine, search } = req.query as Record<string, string>;
    let query = db.select().from(vendorsTable).where(eq(vendorsTable.status, "approved"));

    const conditions = [eq(vendorsTable.status, "approved")];
    if (city) conditions.push(eq(vendorsTable.city, city));
    if (cuisine) conditions.push(like(vendorsTable.cuisineType, `%${cuisine}%`));
    if (search) conditions.push(like(vendorsTable.name, `%${search}%`));

    const vendors = await db.select().from(vendorsTable)
      .where(and(...conditions))
      .orderBy(desc(vendorsTable.featured), desc(vendorsTable.createdAt));
    res.json({ vendors });
  } catch (err) {
    req.log.error({ err }, "Failed to list vendors");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/vendors", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const { name, description, city, address, cuisineType, fssaiLicense, subscriptionTier } = req.body;
    const [vendor] = await db.insert(vendorsTable).values({
      ownerUserId: req.user!.id,
      name,
      description,
      city,
      address,
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
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.ownerUserId, req.user!.id));
    if (!vendor) return res.status(404).json({ error: "Vendor profile not found" });
    res.json({ vendor });
  } catch (err) {
    req.log.error({ err }, "Failed to get vendor profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/vendors/:vendorId", async (req, res) => {
  try {
    const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, req.params.vendorId));
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    res.json({ vendor });
  } catch (err) {
    req.log.error({ err }, "Failed to get vendor");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/vendors/:vendorId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const [vendor] = await db.update(vendorsTable)
      .set({ ...req.body, updatedAt: new Date() })
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

    const [activeSubscriptions] = await db
      .select({ count: db.$count(customerSubscriptionsTable.id) })
      .from(customerSubscriptionsTable)
      .where(and(eq(customerSubscriptionsTable.vendorId, vendorId), eq(customerSubscriptionsTable.status, "active")));

    const orders = await db.select().from(ordersTable).where(eq(ordersTable.vendorId, vendorId));
    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount as string), 0);
    const today = new Date().toISOString().split("T")[0];
    const todayOrders = orders.filter(o => o.scheduledDate === today);
    const deliveredToday = todayOrders.filter(o => o.status === "delivered");

    res.json({
      stats: {
        totalRevenue,
        totalOrders: orders.length,
        activeSubscriptions: Number(activeSubscriptions?.count ?? 0),
        averageRating: 4.5,
        todayOrders: todayOrders.length,
        monthlyRevenue: totalRevenue * 0.1,
        pendingOrders: todayOrders.filter(o => o.status === "pending").length,
        completedOrdersToday: deliveredToday.length,
      }
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get vendor stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
