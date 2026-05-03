import { Router } from "express";
import { db, subscriptionPlansTable, customerSubscriptionsTable, vendorsTable, ordersTable } from "@workspace/db";
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
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
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
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
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
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
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
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { customersTable } = await import("@workspace/db");
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.userId, req.user.id));
    if (!customer) {
      res.json({ subscriptions: [] });
      return;
    }

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
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { customersTable } = await import("@workspace/db");
    let [customer] = await db.select().from(customersTable).where(eq(customersTable.userId, req.user.id));
    if (!customer) {
      [customer] = await db.insert(customersTable).values({ userId: req.user.id }).returning();
    }

    const { planId, vendorId, startDate, deliveryAddress, deliverySlot } = req.body as {
      planId: string;
      vendorId: string;
      startDate: string;
      deliveryAddress: string;
      deliverySlot?: string;
    };

    // Validate the plan belongs to this vendor and is active
    const [plan] = await db.select().from(subscriptionPlansTable)
      .where(and(
        eq(subscriptionPlansTable.id, planId),
        eq(subscriptionPlansTable.vendorId, vendorId),
        eq(subscriptionPlansTable.isActive, true)
      ));
    if (!plan) {
      res.status(400).json({ error: "Invalid plan or plan does not belong to this vendor." });
      return;
    }

    // Validate vendor is approved
    const [vendor] = await db.select({ status: vendorsTable.status }).from(vendorsTable).where(eq(vendorsTable.id, vendorId));
    if (!vendor || vendor.status !== "approved") {
      res.status(400).json({ error: "This kitchen is not currently accepting subscriptions." });
      return;
    }

    // Calculate subscription period
    const PERIOD_DAYS: Record<string, number> = {
      daily: 1,
      weekly: 7,
      monthly: 30,
      weekday: 30,  // generates only Mon-Fri orders within 30 calendar days
      trial_3day: 3,
      trial_7day: 7,
      custom: 30,
    };
    const periodDays = PERIOD_DAYS[plan.planType] ?? 30;
    const start = new Date(startDate);
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + periodDays);

    const [subscription] = await db.insert(customerSubscriptionsTable).values({
      customerId: customer.id,
      planId,
      vendorId,
      startDate,
      endDate: endDate.toISOString().split("T")[0],
      deliveryAddress,
      deliverySlot: deliverySlot || null,
      status: "active",
    }).returning();

    // ── Auto-generate daily orders for each day in the subscription period ──
    const isWeekdayPlan = plan.planType === "weekday";
    const deliveryDates: string[] = [];
    const cursor = new Date(start);
    while (cursor < endDate) {
      const day = cursor.getDay(); // 0=Sun, 6=Sat
      if (!isWeekdayPlan || (day !== 0 && day !== 6)) {
        deliveryDates.push(cursor.toISOString().split("T")[0]);
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    if (deliveryDates.length > 0) {
      const pricePerOrder = parseFloat(plan.price as string) / deliveryDates.length;
      const primaryMealType = plan.mealTypes?.[0] || null;

      const ordersToInsert = deliveryDates.map(date => ({
        customerId: customer.id,
        vendorId,
        subscriptionId: subscription.id,
        scheduledDate: date,
        mealType: primaryMealType,
        totalAmount: pricePerOrder.toFixed(2),
        deliveryAddress,
        status: "pending" as const,
      }));

      await db.insert(ordersTable).values(ordersToInsert);
    }
    // ─────────────────────────────────────────────────────────────────────────

    res.status(201).json({ subscription });
  } catch (err) {
    req.log.error({ err }, "Failed to create subscription");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/subscriptions/:subscriptionId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [subscription] = await db.select().from(customerSubscriptionsTable)
      .where(eq(customerSubscriptionsTable.id, req.params.subscriptionId));
    if (!subscription) {
      res.status(404).json({ error: "Subscription not found" });
      return;
    }
    res.json({ subscription });
  } catch (err) {
    req.log.error({ err }, "Failed to get subscription");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/subscriptions/:subscriptionId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { customersTable } = await import("@workspace/db");
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.userId, req.user.id));
    if (!customer) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [existing] = await db.select().from(customerSubscriptionsTable)
      .where(and(
        eq(customerSubscriptionsTable.id, req.params.subscriptionId),
        eq(customerSubscriptionsTable.customerId, customer.id)
      ));
    if (!existing) {
      res.status(404).json({ error: "Subscription not found" });
      return;
    }

    const { status } = req.body as { status?: string };
    const validTransitions: Record<string, string[]> = {
      active: ["paused", "cancelled"],
      paused: ["active", "cancelled"],
      cancelled: [],
      expired: [],
    };
    if (status && !validTransitions[existing.status]?.includes(status)) {
      res.status(400).json({ error: `Cannot transition subscription from '${existing.status}' to '${status}'.` });
      return;
    }

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
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { customersTable } = await import("@workspace/db");
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.userId, req.user.id));
    if (!customer) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [sub] = await db.select().from(customerSubscriptionsTable)
      .where(and(
        eq(customerSubscriptionsTable.id, req.params.subscriptionId),
        eq(customerSubscriptionsTable.customerId, customer.id)
      ));
    if (!sub) {
      res.status(404).json({ error: "Subscription not found" });
      return;
    }
    if (sub.status !== "active") {
      res.status(400).json({ error: "Can only skip active subscriptions." });
      return;
    }

    const skipDate = req.body.date as string;
    const skipDt = new Date(skipDate);
    const now = new Date();
    const hoursUntilDelivery = (skipDt.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilDelivery < 12) {
      res.status(400).json({ error: "Delivery can only be skipped at least 12 hours in advance." });
      return;
    }

    const skippedDays = [...(sub.skippedDays ?? []), skipDate];
    await db.update(customerSubscriptionsTable)
      .set({ skippedDays, updatedAt: new Date() })
      .where(eq(customerSubscriptionsTable.id, req.params.subscriptionId));

    // Also cancel the pending order for that day
    await db.update(ordersTable)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(
        eq(ordersTable.subscriptionId, sub.id),
        eq(ordersTable.scheduledDate, skipDate)
      ));

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to skip day");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
