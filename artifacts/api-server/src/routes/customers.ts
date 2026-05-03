import { Router } from "express";
import { db, customersTable, walletTransactionsTable, customerSubscriptionsTable, ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/customers", async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const customers = await db.select().from(customersTable);
    const allSubs = await db.select().from(customerSubscriptionsTable);
    const allOrders = await db.select().from(ordersTable);

    const enriched = customers.map(c => {
      const cSubs = allSubs.filter(s => s.customerId === c.id);
      const cOrders = allOrders.filter(o => o.customerId === c.id);
      return {
        ...c,
        totalSubscriptions: cSubs.length,
        activeSubscriptions: cSubs.filter(s => s.status === "active").length,
        totalOrders: cOrders.length,
        totalSpend: cOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount as string), 0),
      };
    });

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
    let [customer] = await db.select().from(customersTable).where(eq(customersTable.userId, req.user.id));
    if (!customer) {
      [customer] = await db.insert(customersTable).values({ userId: req.user.id, ...req.body }).returning();
    } else {
      [customer] = await db.update(customersTable)
        .set({ ...req.body, updatedAt: new Date() })
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

    const deliveries = [];
    const today = new Date();

    for (const sub of subs) {
      if (sub.status !== "active") continue;
      const [vendor] = await db.select({ name: vendorsTable.name }).from(vendorsTable).where(eq(vendorsTable.id, sub.vendorId));
      const [plan] = await db.select({ name: subscriptionPlansTable.name, mealTypes: subscriptionPlansTable.mealTypes })
        .from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, sub.planId));

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
