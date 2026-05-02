import { Router } from "express";
import { db, subscriptionPlansTable, customerSubscriptionsTable, vendorsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

// ─── Subscription Plans ───────────────────────────────────────────────────────
router.get("/vendors/:vendorId/plans", async (req, res) => {
  try {
    const plans = await db.select().from(subscriptionPlansTable)
      .where(and(eq(subscriptionPlansTable.vendorId, req.params.vendorId), eq(subscriptionPlansTable.isActive, true)));
    res.json({ plans });
  } catch (err) {
    req.log.error({ err }, "Failed to list plans");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/vendors/:vendorId/plans", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const [plan] = await db.insert(subscriptionPlansTable)
      .values({ ...req.body, vendorId: req.params.vendorId })
      .returning();
    res.status(201).json({ plan });
  } catch (err) {
    req.log.error({ err }, "Failed to create plan");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/vendors/:vendorId/plans/:planId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const [plan] = await db.update(subscriptionPlansTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(subscriptionPlansTable.id, req.params.planId))
      .returning();
    res.json({ plan });
  } catch (err) {
    req.log.error({ err }, "Failed to update plan");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/vendors/:vendorId/plans/:planId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    await db.update(subscriptionPlansTable)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(subscriptionPlansTable.id, req.params.planId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete plan");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Customer Subscriptions ───────────────────────────────────────────────────
router.get("/subscriptions", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const { customersTable } = await import("@workspace/db");
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.userId, req.user!.id));
    if (!customer) return res.json({ subscriptions: [] });

    const subs = await db.select().from(customerSubscriptionsTable)
      .where(eq(customerSubscriptionsTable.customerId, customer.id));

    const subscriptions = await Promise.all(subs.map(async (sub) => {
      const [vendor] = await db.select({ name: vendorsTable.name }).from(vendorsTable).where(eq(vendorsTable.id, sub.vendorId));
      const [plan] = await db.select({ name: subscriptionPlansTable.name, planType: subscriptionPlansTable.planType })
        .from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, sub.planId));
      return { ...sub, vendorName: vendor?.name, planName: plan?.name, planType: plan?.planType };
    }));

    res.json({ subscriptions });
  } catch (err) {
    req.log.error({ err }, "Failed to list subscriptions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/subscriptions", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const { customersTable } = await import("@workspace/db");
    let [customer] = await db.select().from(customersTable).where(eq(customersTable.userId, req.user!.id));
    if (!customer) {
      [customer] = await db.insert(customersTable).values({ userId: req.user!.id }).returning();
    }

    const { planId, vendorId, startDate, deliveryAddress, deliverySlot } = req.body;
    const [plan] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, planId));

    const daysMap: Record<string, number> = {
      daily: 1, weekly: 7, monthly: 30, weekday: 5,
      trial_3day: 3, trial_7day: 7, custom: 30,
    };
    const days = daysMap[plan?.planType ?? "monthly"] ?? 30;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);

    const [subscription] = await db.insert(customerSubscriptionsTable).values({
      customerId: customer.id,
      planId,
      vendorId,
      startDate,
      endDate: endDate.toISOString().split("T")[0],
      deliveryAddress,
      deliverySlot,
      status: "active",
    }).returning();
    res.status(201).json({ subscription });
  } catch (err) {
    req.log.error({ err }, "Failed to create subscription");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/subscriptions/:subscriptionId", async (req, res) => {
  try {
    const [subscription] = await db.select().from(customerSubscriptionsTable)
      .where(eq(customerSubscriptionsTable.id, req.params.subscriptionId));
    if (!subscription) return res.status(404).json({ error: "Subscription not found" });
    res.json({ subscription });
  } catch (err) {
    req.log.error({ err }, "Failed to get subscription");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/subscriptions/:subscriptionId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const [subscription] = await db.update(customerSubscriptionsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(customerSubscriptionsTable.id, req.params.subscriptionId))
      .returning();
    res.json({ subscription });
  } catch (err) {
    req.log.error({ err }, "Failed to update subscription");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/subscriptions/:subscriptionId/skip", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const [sub] = await db.select().from(customerSubscriptionsTable)
      .where(eq(customerSubscriptionsTable.id, req.params.subscriptionId));
    if (!sub) return res.status(404).json({ error: "Subscription not found" });

    const skippedDays = [...(sub.skippedDays ?? []), req.body.date];
    await db.update(customerSubscriptionsTable)
      .set({ skippedDays, updatedAt: new Date() })
      .where(eq(customerSubscriptionsTable.id, req.params.subscriptionId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to skip day");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
