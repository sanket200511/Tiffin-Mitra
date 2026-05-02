import { Router } from "express";
import { db, customersTable, walletTransactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/customers/me", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    let [customer] = await db.select().from(customersTable).where(eq(customersTable.userId, req.user!.id));
    if (!customer) {
      [customer] = await db.insert(customersTable).values({
        userId: req.user!.id,
        name: `${req.user!.firstName ?? ""} ${req.user!.lastName ?? ""}`.trim() || null,
      }).returning();
    }
    res.json({ customer });
  } catch (err) {
    req.log.error({ err }, "Failed to get customer profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/customers/me", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    let [customer] = await db.select().from(customersTable).where(eq(customersTable.userId, req.user!.id));
    if (!customer) {
      [customer] = await db.insert(customersTable).values({ userId: req.user!.id, ...req.body }).returning();
    } else {
      [customer] = await db.update(customersTable)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(customersTable.userId, req.user!.id))
        .returning();
    }
    res.json({ customer });
  } catch (err) {
    req.log.error({ err }, "Failed to update customer profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/customers/wallet", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.userId, req.user!.id));
    if (!customer) return res.json({ wallet: { balance: 0, loyaltyPoints: 0, transactions: [] } });

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
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.userId, req.user!.id));
    if (!customer) return res.json({ deliveries: [] });

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
