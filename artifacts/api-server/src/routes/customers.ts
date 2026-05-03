import { Router } from "express";
import { db, customersTable, walletTransactionsTable, customerSubscriptionsTable, ordersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/customers", async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const [customers, subStats, orderStats] = await Promise.all([
      db.select().from(customersTable),
      db
        .select({
          customerId: customerSubscriptionsTable.customerId,
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) filter (where ${customerSubscriptionsTable.status} = 'active')::int`,
        })
        .from(customerSubscriptionsTable)
        .groupBy(customerSubscriptionsTable.customerId),
      db
        .select({
          customerId: ordersTable.customerId,
          total: sql<number>`count(*)::int`,
          totalSpend: sql<number>`coalesce(sum(${ordersTable.totalAmount}::numeric), 0)`,
        })
        .from(ordersTable)
        .groupBy(ordersTable.customerId),
    ]);

    const subMap = Object.fromEntries(subStats.map(s => [s.customerId, s]));
    const orderMap = Object.fromEntries(orderStats.map(o => [o.customerId, o]));

    const enriched = customers.map(c => ({
      ...c,
      totalSubscriptions: subMap[c.id]?.total ?? 0,
      activeSubscriptions: subMap[c.id]?.active ?? 0,
      totalOrders: orderMap[c.id]?.total ?? 0,
      totalSpend: Number(orderMap[c.id]?.totalSpend ?? 0),
    }));

    res.json({ customers: enriched });
  } catch (err) {
    req.log.error({ err }, "Failed to list customers");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/customers/me", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    let [customer] = await db.select().from(customersTable).where(eq(customersTable.userId, req.user.id));
    if (!customer) {
      [customer] = await db.insert(customersTable).values({
        userId: req.user.id,
        name: `${req.user.firstName ?? ""} ${req.user.lastName ?? ""}`.trim() || null,
      }).returning();
    }
    res.json({ customer });
  } catch (err) {
    req.log.error({ err }, "Failed to get customer profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/customers/me", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { name, phone, defaultDeliveryAddress, landmark, city, latitude, longitude, avatarUrl } = req.body as {
      name?: string;
      phone?: string;
      defaultDeliveryAddress?: string;
      landmark?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
      avatarUrl?: string;
    };

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = String(name).trim().slice(0, 100);
    if (phone !== undefined) updates.phone = String(phone).trim().slice(0, 20);
    if (defaultDeliveryAddress !== undefined) updates.defaultDeliveryAddress = String(defaultDeliveryAddress).trim().slice(0, 500);
    if (landmark !== undefined) updates.landmark = String(landmark).trim().slice(0, 200);
    if (city !== undefined) updates.city = String(city).trim().slice(0, 100);
    if (latitude !== undefined && typeof latitude === "number") updates.latitude = latitude.toFixed(7);
    if (longitude !== undefined && typeof longitude === "number") updates.longitude = longitude.toFixed(7);
    if (avatarUrl !== undefined) updates.avatarUrl = String(avatarUrl).trim().slice(0, 500);

    let [customer] = await db.select().from(customersTable).where(eq(customersTable.userId, req.user.id));
    if (!customer) {
      [customer] = await db.insert(customersTable).values({ userId: req.user.id, ...updates }).returning();
    } else {
      [customer] = await db.update(customersTable)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(customersTable.userId, req.user.id))
        .returning();
    }
    res.json({ customer });
  } catch (err) {
    req.log.error({ err }, "Failed to update customer profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/customers/wallet", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.userId, req.user.id));
    if (!customer) {
      res.json({ wallet: { balance: 0, loyaltyPoints: 0, transactions: [] } });
      return;
    }

    const transactions = await db.select().from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.customerId, customer.id));

    res.json({
      wallet: {
        balance: parseFloat(customer.walletBalance as string ?? "0"),
        loyaltyPoints: customer.loyaltyPoints,
        transactions,
      }
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get wallet");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/customers/wallet/topup", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { amount } = req.body as { amount: number };
  if (!amount || typeof amount !== "number" || amount <= 0 || amount > 50000) {
    res.status(400).json({ error: "Invalid amount. Must be between ₹1 and ₹50,000." });
    return;
  }
  try {
    let [customer] = await db.select().from(customersTable).where(eq(customersTable.userId, req.user.id));
    if (!customer) {
      [customer] = await db.insert(customersTable).values({ userId: req.user.id }).returning();
    }
    const currentBalance = parseFloat(customer.walletBalance as string ?? "0");
    const newBalance = (currentBalance + amount).toFixed(2);

    const [updated] = await db.update(customersTable)
      .set({ walletBalance: newBalance, updatedAt: new Date() })
      .where(eq(customersTable.userId, req.user.id))
      .returning();

    await db.insert(walletTransactionsTable).values({
      customerId: customer.id,
      type: "credit",
      amount: amount.toFixed(2),
      description: `Wallet top-up of ₹${amount}`,
    });

    res.json({ wallet: { balance: parseFloat(newBalance), loyaltyPoints: updated.loyaltyPoints } });
  } catch (err) {
    req.log.error({ err }, "Failed to top up wallet");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/customers/upcoming-deliveries", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.userId, req.user.id));
    if (!customer) {
      res.json({ deliveries: [] });
      return;
    }

    const { customerSubscriptionsTable, subscriptionPlansTable, vendorsTable } = await import("@workspace/db");

    const subs = await db.select().from(customerSubscriptionsTable)
      .where(eq(customerSubscriptionsTable.customerId, customer.id));

    const activeSubs = subs.filter(s => s.status === "active");
    if (activeSubs.length === 0) {
      res.json({ deliveries: [] });
      return;
    }

    // Batch-fetch all vendors and plans needed in two queries
    const vendorIds = [...new Set(activeSubs.map(s => s.vendorId))];
    const planIds = [...new Set(activeSubs.map(s => s.planId))];

    const [vendorRows, planRows] = await Promise.all([
      db
        .select({ id: vendorsTable.id, name: vendorsTable.name })
        .from(vendorsTable)
        .where(sql`${vendorsTable.id} = any(${vendorIds})`),
      db
        .select({ id: subscriptionPlansTable.id, name: subscriptionPlansTable.name, mealTypes: subscriptionPlansTable.mealTypes })
        .from(subscriptionPlansTable)
        .where(sql`${subscriptionPlansTable.id} = any(${planIds})`),
    ]);

    const vendorMap = Object.fromEntries(vendorRows.map(v => [v.id, v]));
    const planMap = Object.fromEntries(planRows.map(p => [p.id, p]));

    const today = new Date();
    const deliveries: {
      date: string;
      vendorName: string;
      planName: string;
      mealTypes: string[];
      status: string;
      deliverySlot: string | null;
    }[] = [];

    for (const sub of activeSubs) {
      const vendor = vendorMap[sub.vendorId];
      const plan = planMap[sub.planId];

      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];
        const skipped = (sub.skippedDays ?? []).includes(dateStr);
        deliveries.push({
          date: dateStr,
          vendorName: vendor?.name ?? "Unknown",
          planName: plan?.name ?? "Plan",
          mealTypes: plan?.mealTypes ?? [],
          status: skipped ? "skipped" : "scheduled",
          deliverySlot: sub.deliverySlot,
        });
      }
    }

    deliveries.sort((a, b) => a.date.localeCompare(b.date));
    res.json({ deliveries });
  } catch (err) {
    req.log.error({ err }, "Failed to get upcoming deliveries");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
