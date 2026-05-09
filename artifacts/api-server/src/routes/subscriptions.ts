import { Router } from "express";
import { db, subscriptionPlansTable, customerSubscriptionsTable, vendorsTable, ordersTable, walletTransactionsTable, customersTable, vendorHolidaysTable, usersTable } from "@workspace/db";
import { eq, and, inArray, desc, lt, gte, lte } from "drizzle-orm";
import { notifyUser } from "../lib/notify";

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
    const { vendorId } = req.params;

    // The vendor owner and super_admin may see all plans including inactive ones.
    // All other callers (customers, public) only see active plans.
    let showAll = false;
    if (req.isAuthenticated()) {
      if (req.user.role === "super_admin") {
        showAll = true;
      } else {
        const [vendor] = await db
          .select({ ownerUserId: vendorsTable.ownerUserId })
          .from(vendorsTable)
          .where(eq(vendorsTable.id, vendorId));
        if (vendor?.ownerUserId === req.user.id) showAll = true;
      }
    }

    const plans = showAll
      ? await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.vendorId, vendorId))
      : await db.select().from(subscriptionPlansTable).where(and(eq(subscriptionPlansTable.vendorId, vendorId), eq(subscriptionPlansTable.isActive, true)));

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
    const { name, description, planType, price, mealTypes, dietType, mealsPerDay, isActive } = req.body;
    const [plan] = await db.insert(subscriptionPlansTable)
      .values({ name, description, planType, price, mealTypes, dietType, mealsPerDay, isActive, vendorId: req.params.vendorId })
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
    const { name, description, planType, price, mealTypes, dietType, mealsPerDay, isActive } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (planType !== undefined) updates.planType = planType;
    if (price !== undefined) updates.price = price;
    if (mealTypes !== undefined) updates.mealTypes = mealTypes;
    if (dietType !== undefined) updates.dietType = dietType;
    if (mealsPerDay !== undefined) updates.mealsPerDay = mealsPerDay;
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
    // ── Admin: return all subscriptions with optional filters ──────────────
    if (req.user.role === "super_admin") {
      const { vendorId, status } = req.query as Record<string, string>;
      const conditions: ReturnType<typeof eq>[] = [];
      if (vendorId) conditions.push(eq(customerSubscriptionsTable.vendorId, vendorId));
      if (status)   conditions.push(eq(customerSubscriptionsTable.status, status as "active" | "paused" | "cancelled" | "expired"));

      const rows = await db
        .select({
          sub:          customerSubscriptionsTable,
          vendorName:   vendorsTable.name,
          planName:     subscriptionPlansTable.name,
          planType:     subscriptionPlansTable.planType,
          planPrice:    subscriptionPlansTable.price,
          customerName: customersTable.name,
        })
        .from(customerSubscriptionsTable)
        .leftJoin(vendorsTable,           eq(customerSubscriptionsTable.vendorId,  vendorsTable.id))
        .leftJoin(subscriptionPlansTable, eq(customerSubscriptionsTable.planId,    subscriptionPlansTable.id))
        .leftJoin(customersTable,         eq(customerSubscriptionsTable.customerId, customersTable.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(customerSubscriptionsTable.createdAt));

      const subscriptions = rows.map(r => ({
        ...r.sub,
        totalAmount:  r.sub.walletBalance ?? undefined,
        vendorName:   r.vendorName   ?? undefined,
        planName:     r.planName     ?? undefined,
        planType:     r.planType     ?? undefined,
        planPrice:    r.planPrice    ?? undefined,
        customerName: r.customerName ?? undefined,
      }));
      res.json({ subscriptions });
      return;
    }

    // ── Customer: own subscriptions only ──────────────────────────────────
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.userId, req.user.id));
    if (!customer) {
      res.json({ subscriptions: [] });
      return;
    }

    const rows = await db
      .select({
        sub:      customerSubscriptionsTable,
        vendorName: vendorsTable.name,
        pauseCutoffHour: vendorsTable.pauseCutoffHour,
        planName:   subscriptionPlansTable.name,
        planType:   subscriptionPlansTable.planType,
      })
      .from(customerSubscriptionsTable)
      .leftJoin(vendorsTable,           eq(customerSubscriptionsTable.vendorId, vendorsTable.id))
      .leftJoin(subscriptionPlansTable, eq(customerSubscriptionsTable.planId,   subscriptionPlansTable.id))
      .where(eq(customerSubscriptionsTable.customerId, customer.id))
      .orderBy(desc(customerSubscriptionsTable.createdAt));

    const subscriptions = rows.map(r => ({
      ...r.sub,
      totalAmount: r.sub.walletBalance ?? undefined,
      vendorName: r.vendorName ?? undefined,
      pauseCutoffHour: r.pauseCutoffHour ?? 20,
      planName:   r.planName   ?? undefined,
      planType:   r.planType   ?? undefined,
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

    const { planId, vendorId, startDate, deliveryAddress, deliverySlot, redeemLoyaltyPoints } = req.body as {
      planId: string;
      vendorId: string;
      startDate: string;
      deliveryAddress: string;
      deliverySlot?: string;
      redeemLoyaltyPoints?: boolean;
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

    const [vendor] = await db.select({ status: vendorsTable.status, name: vendorsTable.name, ownerUserId: vendorsTable.ownerUserId })
      .from(vendorsTable).where(eq(vendorsTable.id, vendorId));
    if (!vendor || vendor.status !== "approved") {
      res.status(400).json({ error: "This kitchen is not currently accepting subscriptions." });
      return;
    }

    const planPrice = parseFloat(plan.price as string);
    const walletBalance = parseFloat(customer.walletBalance as string ?? "0");
    const currentPoints = customer.loyaltyPoints ?? 0;

    // ── Loyalty points redemption ──────────────────────────────────────────
    // 100 points = ₹10 discount. Points are rounded down to nearest 100.
    const POINTS_PER_RUPEE = 10; // 100 points = ₹10
    const redeemablePoints = redeemLoyaltyPoints ? Math.floor(currentPoints / 100) * 100 : 0;
    const pointsDiscount = redeemablePoints / POINTS_PER_RUPEE;
    const chargeAmount = Math.max(0, planPrice - pointsDiscount);

    if (walletBalance < chargeAmount) {
      res.status(402).json({
        error: `Insufficient wallet balance. This plan costs ₹${chargeAmount.toFixed(0)} but your wallet has ₹${walletBalance.toFixed(0)}. Please top up your wallet first.`,
        required: chargeAmount,
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

    // ── Build raw delivery dates (skip weekends for weekday plans) ─────────
    const isWeekdayPlan = plan.planType === "weekday";
    const rawDates: string[] = [];
    const cursor = new Date(start);
    while (cursor < endDate) {
      const day = cursor.getDay();
      if (!isWeekdayPlan || (day !== 0 && day !== 6)) {
        rawDates.push(cursor.toISOString().split("T")[0]);
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    // ── Skip vendor holidays ───────────────────────────────────────────────
    const holidayRows = await db.select({ date: vendorHolidaysTable.date })
      .from(vendorHolidaysTable)
      .where(and(
        eq(vendorHolidaysTable.vendorId, vendorId),
        inArray(vendorHolidaysTable.date, rawDates.length > 0 ? rawDates : [""]),
      ));
    const holidaySet = new Set(holidayRows.map((h) => h.date));
    const deliveryDates = rawDates.filter((d) => !holidaySet.has(d));

    // ── Debit wallet ───────────────────────────────────────────────────────
    const newBalance = (walletBalance - chargeAmount).toFixed(2);
    const newPoints = redeemablePoints > 0
      ? currentPoints - redeemablePoints + Math.floor(chargeAmount)
      : currentPoints + Math.floor(chargeAmount);

    await db.update(customersTable)
      .set({ walletBalance: newBalance, loyaltyPoints: newPoints, updatedAt: new Date() })
      .where(eq(customersTable.id, customer.id));

    const debitDesc = redeemablePoints > 0
      ? `Subscription: ${plan.name} from ${vendor.name} (${redeemablePoints} pts redeemed)`
      : `Subscription: ${plan.name} from ${vendor.name}`;

    await db.insert(walletTransactionsTable).values({
      customerId: customer.id,
      type: "debit",
      amount: chargeAmount.toFixed(2),
      description: debitDesc,
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
      walletBalance: chargeAmount.toFixed(2),
    }).returning();

    if (deliveryDates.length > 0) {
      const pricePerOrder = chargeAmount / deliveryDates.length;
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

    // Notify the vendor about their new subscriber
    if (vendor?.ownerUserId) {
      void notifyUser(vendor.ownerUserId, {
        type: "new_subscription",
        title: "New subscription",
        body: `A customer just subscribed to your "${plan.name}" plan starting ${startDate}. ${deliveryDates.length} meal(s) scheduled${holidaySet.size > 0 ? ` (${holidaySet.size} holiday(s) skipped)` : ""}.`,
        metadata: { subscriptionId: subscription.id, planId, vendorId, planName: plan.name },
      });
    }

    res.status(201).json({
      subscription,
      skippedHolidays: holidaySet.size,
      pointsRedeemed: redeemablePoints,
      pointsEarned: Math.floor(chargeAmount),
    });
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

    const [existing] = await db.select({ sub: customerSubscriptionsTable, vendor: vendorsTable })
      .from(customerSubscriptionsTable)
      .leftJoin(vendorsTable, eq(customerSubscriptionsTable.vendorId, vendorsTable.id))
      .where(and(
        eq(customerSubscriptionsTable.id, req.params.subscriptionId),
        eq(customerSubscriptionsTable.customerId, customer.id)
      ));
    if (!existing || !existing.sub) {
      res.status(404).json({ error: "Subscription not found" });
      return;
    }

    const { status, pausedUntil } = req.body as { status?: string; pausedUntil?: string };
    const sub = existing.sub;
    const vendor = existing.vendor;
    const validTransitions: Record<string, string[]> = {
      active: ["paused", "cancelled"],
      paused: ["active", "cancelled"],
      cancelled: [],
      expired: [],
    };
    if (status && !validTransitions[sub.status]?.includes(status)) {
      res.status(400).json({ error: `Cannot transition subscription from '${sub.status}' to '${status}'.` });
      return;
    }

    // ── Handle Vacation Pause Logic ────────────────────────────────────────
    let finalPausedUntil = pausedUntil;
    let actualPauseStartDate: string | null = null;

    if (status === "paused") {
      const now = new Date();
      const cutoffHour = vendor?.pauseCutoffHour ?? 20; // Default 8 PM
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      // If pausing today after the cutoff, the first "pausable" day is day after tomorrow
      const isAfterCutoff = now.getHours() >= cutoffHour;
      
      if (isAfterCutoff) {
        const dayAfterTomorrow = new Date(tomorrow);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
        actualPauseStartDate = dayAfterTomorrow.toISOString().split("T")[0];
      } else {
        actualPauseStartDate = tomorrowStr;
      }

      // If user requested a specific resume date, keep it.
      // If they didn't, it's an indefinite pause (status="paused").
    }

    if (status === "paused" && actualPauseStartDate) {
      const refundableStatuses = ["pending", "accepted"] as const;
      
      const ordersToCancelQuery = and(
        eq(ordersTable.subscriptionId, sub.id),
        gte(ordersTable.scheduledDate, actualPauseStartDate),
        inArray(ordersTable.status, [...refundableStatuses] as any)
      );

      const pendingOrders = await db.select().from(ordersTable).where(ordersToCancelQuery);

      if (pendingOrders.length > 0) {
        // NOTE: For "pause", we don't necessarily refund the wallet immediately 
        // if the money stays in the "subscription escrow", but the current system 
        // seems to credit the wallet for cancelled orders. 
        // Let's stick to the current pattern: cancel = refund.
        const refundTotal = pendingOrders.reduce(
          (sum, o) => sum + parseFloat(o.totalAmount as string), 0
        );

        await db.update(ordersTable)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(ordersToCancelQuery);

        const currentBalance = parseFloat(customer.walletBalance as string ?? "0");
        await db.update(customersTable)
          .set({ walletBalance: (currentBalance + refundTotal).toFixed(2), updatedAt: new Date() })
          .where(eq(customersTable.id, customer.id));

        await db.insert(walletTransactionsTable).values({
          customerId: customer.id,
          type: "credit",
          amount: refundTotal.toFixed(2),
          description: `Escrow Refund: subscription paused starting ${actualPauseStartDate} (${pendingOrders.length} meal(s))`,
        });
      }
    }

    if (status === "cancelled") {
      const refundableStatuses = ["pending", "accepted", "preparing", "packed", "paid", "confirmed"] as const;
      const pendingOrders = await db.select().from(ordersTable)
        .where(and(
          eq(ordersTable.subscriptionId, sub.id),
          inArray(ordersTable.status, [...refundableStatuses] as any)
        ));

      if (pendingOrders.length > 0) {
        const refundTotal = pendingOrders.reduce(
          (sum, o) => sum + parseFloat(o.totalAmount as string), 0
        );

        await db.update(ordersTable)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(and(
            eq(ordersTable.subscriptionId, sub.id),
            inArray(ordersTable.status, [...refundableStatuses] as any)
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
    if (finalPausedUntil !== undefined) updates.pausedUntil = finalPausedUntil;

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

// ─── Admin: batch-expire overdue subscriptions ────────────────────────────────
// POST /subscriptions/process-expiry — super_admin only
// Finds every subscription where status='active' and endDate < today,
// marks them 'expired', and sends a notification to each affected customer.
router.post("/subscriptions/process-expiry", async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const expiredSubs = await db
      .select({
        subId: customerSubscriptionsTable.id,
        userId: usersTable.id,
        planName: subscriptionPlansTable.name,
      })
      .from(customerSubscriptionsTable)
      .innerJoin(customersTable, eq(customerSubscriptionsTable.customerId, customersTable.id))
      .innerJoin(usersTable, eq(customersTable.userId, usersTable.id))
      .leftJoin(subscriptionPlansTable, eq(customerSubscriptionsTable.planId, subscriptionPlansTable.id))
      .where(
        and(
          eq(customerSubscriptionsTable.status, "active"),
          lt(customerSubscriptionsTable.endDate, todayStr),
        ),
      );

    if (expiredSubs.length === 0) {
      res.json({ processed: 0, message: "No subscriptions to expire." });
      return;
    }

    const subIds = expiredSubs.map((s) => s.subId);
    await db
      .update(customerSubscriptionsTable)
      .set({ status: "expired", updatedAt: new Date() })
      .where(inArray(customerSubscriptionsTable.id, subIds));

    await Promise.all(
      expiredSubs.map((s) =>
        notifyUser(s.userId, {
          type: "subscription_expired",
          title: "Your subscription has ended",
          body: `Your ${s.planName ?? "tiffin"} subscription has expired. Renew anytime to keep getting fresh tiffins!`,
        }),
      ),
    );

    res.json({ processed: expiredSubs.length, subIds });
  } catch (err) {
    req.log.error({ err }, "Failed to process subscription expiry");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
