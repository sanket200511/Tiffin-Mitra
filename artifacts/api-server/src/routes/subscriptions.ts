import { Router } from "express";
import { db, subscriptionPlansTable, customerSubscriptionsTable, vendorsTable, ordersTable, walletTransactionsTable, customersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

const router = Router();

async function assertVendorOwnership(vendorId: string, userId: string, role: string | null | undefined): Promise<boolean> {
  if (role === "super_admin") return true;
  const [vendor] = await db.select({ ownerUserId: vendorsTable.ownerUserId })
    .from(vendorsTable).where(eq(vendorsTable.id, vendorId));
  return vendor?.ownerUserId === userId;
}

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
  const isOwner = await assertVendorOwnership(req.params.vendorId, req.user.id, req.user.role);
  if (!isOwner) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const { name, description, planType, price, mealTypes, isActive } = req.body;
    const [plan] = await db.insert(subscriptionPlansTable)
      .values({ name, description, planType, price, mealTypes, isActive, vendorId: req.params.vendorId })
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
  const isOwner = await assertVendorOwnership(req.params.vendorId, req.user.id, req.user.role);
  if (!isOwner) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const { name, description, planType, price, mealTypes, isActive } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (planType !== undefined) updates.planType = planType;
    if (price !== undefined) updates.price = price;
    if (mealTypes !== undefined) updates.mealTypes = mealTypes;
    if (isActive !== undefined) updates.isActive = isActive;

    const [plan] = await db.update(subscriptionPlansTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(subscriptionPlansTable.id, req.params.planId),
        eq(subscriptionPlansTable.vendorId, req.params.vendorId)
      ))
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
  const isOwner = await assertVendorOwnership(req.params.vendorId, req.user.id, req.user.role);
  if (!isOwner) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    await db.update(subscriptionPlansTable)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(
        eq(subscriptionPlansTable.id, req.params.planId),
        eq(subscriptionPlansTable.vendorId, req.params.vendorId)
      ));
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

    const rows = await db
      .select({
        sub: customerSubscriptionsTable,
        vendorName: vendorsTable.name,
        planName: subscriptionPlansTable.name,
        planType: subscriptionPlansTable.planType,
      })
      .from(customerSubscriptionsTable)
      .leftJoin(vendorsTable, eq(customerSubscriptionsTable.vendorId, vendorsTable.id))
      .leftJoin(subscriptionPlansTable, eq(customerSubscriptionsTable.planId, subscriptionPlansTable.id))
      .where(eq(customerSubscriptionsTable.customerId, customer.id));

    const subscriptions = rows.map(r => ({
      ...r.sub,
      vendorName: r.vendorName ?? undefined,
      planName: r.planName ?? undefined,
      planType: r.planType ?? undefined,
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

    const [vendor] = await db.select({ status: vendorsTable.status, name: vendorsTable.name })
      .from(vendorsTable).where(eq(vendorsTable.id, vendorId));
    if (!vendor || vendor.status !== "approved") {
      res.status(400).json({ error: "This kitchen is not currently accepting subscriptions." });
      return;
    }

    const planPrice = parseFloat(plan.price as string);
    const walletBalance = parseFloat(customer.walletBalance as string ?? "0");
    if (walletBalance < planPrice) {
      res.status(402).json({
        error: `Insufficient wallet balance. This plan costs ₹${planPrice.toFixed(0)} but your wallet has ₹${walletBalance.toFixed(0)}. Please top up your wallet first.`,
        required: planPrice,
        available: walletBalance,
      });
      return;
    }

    const PERIOD_DAYS: Record<string, number> = {
      daily: 1, weekly: 7, monthly: 30, weekday: 30, trial_3day: 3, trial_7day: 7, custom: 30,
    };
    const periodDays = PERIOD_DAYS[plan.planType] ?? 30;
    const start = new Date(startDate);
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + periodDays);

    const newBalance = (walletBalance - planPrice).toFixed(2);
    await db.update(customersTable)
      .set({ walletBalance: newBalance, updatedAt: new Date() })
      .where(eq(customersTable.id, customer.id));

    await db.insert(walletTransactionsTable).values({
      customerId: customer.id,
      type: "debit",
      amount: planPrice.toFixed(2),
      description: `Subscription: ${plan.name} from ${vendor.name}`,
    });

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

    const isWeekdayPlan = plan.planType === "weekday";
    const deliveryDates: string[] = [];
    const cursor = new Date(start);
    while (cursor < endDate) {
      const day = cursor.getDay();
      if (!isWeekdayPlan || (day !== 0 && day !== 6)) {
        deliveryDates.push(cursor.toISOString().split("T")[0]);
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    if (deliveryDates.length > 0) {
      const pricePerOrder = planPrice / deliveryDates.length;
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
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.userId, req.user.id));
    const isAdmin = req.user.role === "super_admin";

    const [subscription] = await db.select().from(customerSubscriptionsTable)
      .where(eq(customerSubscriptionsTable.id, req.params.subscriptionId));
    if (!subscription) {
      res.status(404).json({ error: "Subscription not found" });
      return;
    }
    if (!isAdmin && subscription.customerId !== customer?.id) {
      res.status(403).json({ error: "Forbidden" });
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

    if (status === "cancelled") {
      const refundableStatuses = ["pending", "accepted"] as const;
      const pendingOrders = await db.select().from(ordersTable)
        .where(and(
          eq(ordersTable.subscriptionId, existing.id),
          inArray(ordersTable.status, [...refundableStatuses])
        ));

      if (pendingOrders.length > 0) {
        const refundTotal = pendingOrders.reduce(
          (sum, o) => sum + parseFloat(o.totalAmount as string), 0
        );

        await db.update(ordersTable)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(and(
            eq(ordersTable.subscriptionId, existing.id),
            inArray(ordersTable.status, [...refundableStatuses])
          ));

        const currentBalance = parseFloat(customer.walletBalance as string ?? "0");
        await db.update(customersTable)
          .set({ walletBalance: (currentBalance + refundTotal).toFixed(2), updatedAt: new Date() })
          .where(eq(customersTable.id, customer.id));

        await db.insert(walletTransactionsTable).values({
          customerId: customer.id,
          type: "credit",
          amount: refundTotal.toFixed(2),
          description: `Refund for cancelled subscription (${pendingOrders.length} undelivered ${pendingOrders.length === 1 ? "day" : "days"})`,
        });
      }
    }

    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;

    const [subscription] = await db.update(customerSubscriptionsTable)
      .set({ ...updates, updatedAt: new Date() })
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

    const [skippedOrder] = await db.select().from(ordersTable)
      .where(and(
        eq(ordersTable.subscriptionId, sub.id),
        eq(ordersTable.scheduledDate, skipDate),
        eq(ordersTable.status, "pending")
      ));

    if (skippedOrder) {
      await db.update(ordersTable)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(ordersTable.id, skippedOrder.id));

      const refundAmount = parseFloat(skippedOrder.totalAmount as string);
      const currentBalance = parseFloat(customer.walletBalance as string ?? "0");
      await db.update(customersTable)
        .set({ walletBalance: (currentBalance + refundAmount).toFixed(2), updatedAt: new Date() })
        .where(eq(customersTable.id, customer.id));

      await db.insert(walletTransactionsTable).values({
        customerId: customer.id,
        type: "credit",
        amount: refundAmount.toFixed(2),
        description: `Skip refund for delivery on ${skipDate}`,
      });
    }

    res.json({ success: true, refunded: !!skippedOrder });
  } catch (err) {
    req.log.error({ err }, "Failed to skip day");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
