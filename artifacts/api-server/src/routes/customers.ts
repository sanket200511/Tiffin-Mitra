import { Router } from "express";
import { db, customersTable, walletTransactionsTable, customerSubscriptionsTable, ordersTable, subscriptionPlansTable, vendorsTable, referralsTable, platformSettingsTable, DEFAULT_SETTINGS } from "@workspace/db";
import { eq, sql, desc, count } from "drizzle-orm";

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
    // Backfill referral code for customers created before the column was added
    if (!customer.referralCode) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      [customer] = await db.update(customersTable)
        .set({ referralCode: code, updatedAt: new Date() })
        .where(eq(customersTable.userId, req.user.id))
        .returning();
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
    const { name, phone, defaultDeliveryAddress, landmark, city, latitude, longitude } = req.body as {
      name?: string;
      phone?: string;
      defaultDeliveryAddress?: string;
      landmark?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
    };

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = String(name).trim().slice(0, 100);
    if (phone !== undefined) updates.phone = String(phone).trim().slice(0, 20);
    if (defaultDeliveryAddress !== undefined) updates.defaultDeliveryAddress = String(defaultDeliveryAddress).trim().slice(0, 500);
    if (landmark !== undefined) updates.landmark = String(landmark).trim().slice(0, 200);
    if (city !== undefined) updates.city = String(city).trim().slice(0, 100);
    if (latitude !== undefined && typeof latitude === "number") updates.latitude = latitude.toFixed(7);
    if (longitude !== undefined && typeof longitude === "number") updates.longitude = longitude.toFixed(7);

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

// GET /customers/wallet/limits — returns configured min/max topup amounts (no auth required for UI display)
router.get("/customers/wallet/limits", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(platformSettingsTable)
      .where(
        sql`${platformSettingsTable.key} IN ('min_wallet_topup', 'max_wallet_topup')`,
      );

    const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
    const minDefault = DEFAULT_SETTINGS.find(s => s.key === "min_wallet_topup")?.value ?? "100";
    const maxDefault = DEFAULT_SETTINGS.find(s => s.key === "max_wallet_topup")?.value ?? "100000";

    res.json({
      minTopup: parseFloat(map["min_wallet_topup"] ?? minDefault),
      maxTopup: parseFloat(map["max_wallet_topup"] ?? maxDefault),
    });
  } catch (err) {
    res.json({ minTopup: 100, maxTopup: 100000 });
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

    const LIMIT = 100;
    const [countResult] = await db
      .select({ total: count() })
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.customerId, customer.id));

    const transactions = await db
      .select()
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.customerId, customer.id))
      .orderBy(desc(walletTransactionsTable.createdAt))
      .limit(LIMIT);

    res.json({
      wallet: {
        balance: parseFloat(customer.walletBalance as string ?? "0"),
        loyaltyPoints: customer.loyaltyPoints,
        transactions,
        totalTransactions: countResult?.total ?? 0,
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
  if (!amount || typeof amount !== "number" || amount <= 0) {
    res.status(400).json({ error: "Invalid amount." });
    return;
  }
  try {
    // Read configurable min/max from platform_settings
    const limitRows = await db
      .select()
      .from(platformSettingsTable)
      .where(
        eq(platformSettingsTable.key, "min_wallet_topup"),
      );
    const maxRows = await db
      .select()
      .from(platformSettingsTable)
      .where(
        eq(platformSettingsTable.key, "max_wallet_topup"),
      );

    const minDefault = DEFAULT_SETTINGS.find(s => s.key === "min_wallet_topup")?.value ?? "100";
    const maxDefault = DEFAULT_SETTINGS.find(s => s.key === "max_wallet_topup")?.value ?? "100000";
    const MIN_TOPUP = parseFloat(limitRows[0]?.value ?? minDefault);
    const MAX_TOPUP = parseFloat(maxRows[0]?.value ?? maxDefault);

    if (amount < MIN_TOPUP || amount > MAX_TOPUP) {
      res.status(400).json({
        error: `Top-up amount must be between ₹${MIN_TOPUP.toLocaleString("en-IN")} and ₹${MAX_TOPUP.toLocaleString("en-IN")}.`,
      });
      return;
    }
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

// GET /customers/:customerId — admin fetches a single customer's full profile
router.get("/customers/:customerId", async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const { customerId } = req.params;
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, customerId));
    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    const [subscriptions, orders, transactions] = await Promise.all([
      db
        .select({
          id: customerSubscriptionsTable.id,
          status: customerSubscriptionsTable.status,
          startDate: customerSubscriptionsTable.startDate,
          endDate: customerSubscriptionsTable.endDate,
          deliverySlot: customerSubscriptionsTable.deliverySlot,
          deliveryAddress: customerSubscriptionsTable.deliveryAddress,
          walletBalance: customerSubscriptionsTable.walletBalance,
          createdAt: customerSubscriptionsTable.createdAt,
          planId: customerSubscriptionsTable.planId,
          vendorId: customerSubscriptionsTable.vendorId,
          planName: subscriptionPlansTable.name,
          planType: subscriptionPlansTable.planType,
          planPrice: subscriptionPlansTable.price,
          vendorName: vendorsTable.name,
          vendorCity: vendorsTable.city,
        })
        .from(customerSubscriptionsTable)
        .leftJoin(subscriptionPlansTable, eq(customerSubscriptionsTable.planId, subscriptionPlansTable.id))
        .leftJoin(vendorsTable, eq(customerSubscriptionsTable.vendorId, vendorsTable.id))
        .where(eq(customerSubscriptionsTable.customerId, customerId))
        .orderBy(desc(customerSubscriptionsTable.createdAt))
        .limit(20),

      db
        .select({
          id: ordersTable.id,
          status: ordersTable.status,
          scheduledDate: ordersTable.scheduledDate,
          totalAmount: ordersTable.totalAmount,
          mealType: ordersTable.mealType,
          vendorId: ordersTable.vendorId,
        })
        .from(ordersTable)
        .where(eq(ordersTable.customerId, customerId))
        .orderBy(desc(ordersTable.scheduledDate))
        .limit(20),

      db
        .select()
        .from(walletTransactionsTable)
        .where(eq(walletTransactionsTable.customerId, customerId))
        .orderBy(desc(walletTransactionsTable.createdAt))
        .limit(30),
    ]);

    const totalSpend = orders.reduce((s, o) => s + parseFloat(String(o.totalAmount ?? 0)), 0);

    res.json({ customer, subscriptions, orders, transactions, totalSpend });
  } catch (err) {
    req.log.error({ err }, "Failed to get customer detail");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /customers/:customerId/wallet-credit — admin credits or debits a customer's wallet
router.post("/customers/:customerId/wallet-credit", async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { amount, type, description } = req.body as {
    amount: number;
    type: "credit" | "debit";
    description?: string;
  };
  if (!amount || typeof amount !== "number" || amount <= 0 || amount > 1_00_000) {
    res.status(400).json({ error: "Invalid amount. Must be between ₹1 and ₹1,00,000." });
    return;
  }
  if (!["credit", "debit"].includes(type)) {
    res.status(400).json({ error: "type must be 'credit' or 'debit'" });
    return;
  }
  try {
    const [customer] = await db.select().from(customersTable)
      .where(eq(customersTable.id, req.params.customerId));
    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    const currentBalance = parseFloat(String(customer.walletBalance ?? "0"));
    const newBalance = type === "credit"
      ? (currentBalance + amount).toFixed(2)
      : Math.max(0, currentBalance - amount).toFixed(2);

    const [updated] = await db.update(customersTable)
      .set({ walletBalance: newBalance, updatedAt: new Date() })
      .where(eq(customersTable.id, req.params.customerId))
      .returning();

    await db.insert(walletTransactionsTable).values({
      customerId: customer.id,
      type,
      amount: amount.toFixed(2),
      description: description?.trim() || `Admin ${type} of ₹${amount}`,
    });

    res.json({ customer: updated, newBalance: parseFloat(newBalance) });
  } catch (err) {
    req.log.error({ err }, "Failed to adjust customer wallet");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Referral: get my code + stats ───────────────────────────────────────────
router.get("/customers/me/referral", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [customer] = await db.select().from(customersTable)
      .where(eq(customersTable.userId, req.user.id));
    if (!customer) {
      res.json({ referralCode: null, referredByCode: null, referrals: [], totalEarned: 0, count: 0 });
      return;
    }

    const referrals = await db
      .select({
        id: referralsTable.id,
        createdAt: referralsTable.createdAt,
        referrerReward: referralsTable.referrerReward,
        refereeName: customersTable.name,
      })
      .from(referralsTable)
      .leftJoin(customersTable, eq(referralsTable.refereeId, customersTable.id))
      .where(eq(referralsTable.referrerId, customer.id))
      .orderBy(desc(referralsTable.createdAt));

    const totalEarned = referrals.reduce((s, r) => s + parseFloat(String(r.referrerReward ?? 0)), 0);

    res.json({
      referralCode: customer.referralCode,
      referredByCode: customer.referredByCode,
      referrals,
      totalEarned,
      count: referrals.length,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get referral stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Referral: apply someone else's code ─────────────────────────────────────
router.post("/customers/me/referral/apply", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { code } = req.body as { code?: string };
  if (!code || typeof code !== "string" || code.trim().length < 4) {
    res.status(400).json({ error: "Invalid referral code." });
    return;
  }
  const normalizedCode = code.trim().toUpperCase();

  try {
    let [referee] = await db.select().from(customersTable)
      .where(eq(customersTable.userId, req.user.id));
    if (!referee) {
      [referee] = await db.insert(customersTable).values({ userId: req.user.id }).returning();
    }

    if (referee.referredByCode) {
      res.status(400).json({ error: "You have already used a referral code." });
      return;
    }

    if (referee.referralCode === normalizedCode) {
      res.status(400).json({ error: "You cannot use your own referral code." });
      return;
    }

    const [referrer] = await db.select().from(customersTable)
      .where(eq(customersTable.referralCode, normalizedCode));
    if (!referrer) {
      res.status(404).json({ error: "Referral code not found." });
      return;
    }

    // Read configurable reward amounts from platform settings (fall back to defaults)
    const settingRows = await db.select()
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.key, "referral_referee_reward"));
    const referrerSettingRows = await db.select()
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.key, "referral_referrer_reward"));

    const refereeDefault = DEFAULT_SETTINGS.find(s => s.key === "referral_referee_reward")?.value ?? "25";
    const referrerDefault = DEFAULT_SETTINGS.find(s => s.key === "referral_referrer_reward")?.value ?? "50";
    const REFEREE_REWARD = parseFloat(settingRows[0]?.value ?? refereeDefault);
    const REFERRER_REWARD = parseFloat(referrerSettingRows[0]?.value ?? referrerDefault);

    const refereeBalance = parseFloat(String(referee.walletBalance ?? "0"));
    const referrerBalance = parseFloat(String(referrer.walletBalance ?? "0"));

    await db.transaction(async (tx) => {
      await tx.update(customersTable)
        .set({ walletBalance: (refereeBalance + REFEREE_REWARD).toFixed(2), referredByCode: normalizedCode, updatedAt: new Date() })
        .where(eq(customersTable.id, referee.id));

      await tx.update(customersTable)
        .set({ walletBalance: (referrerBalance + REFERRER_REWARD).toFixed(2), updatedAt: new Date() })
        .where(eq(customersTable.id, referrer.id));

      await tx.insert(walletTransactionsTable).values({
        customerId: referee.id,
        type: "credit",
        amount: REFEREE_REWARD.toFixed(2),
        description: `Referral bonus — you joined using ${referrer.name || "a friend"}'s code`,
      });

      await tx.insert(walletTransactionsTable).values({
        customerId: referrer.id,
        type: "credit",
        amount: REFERRER_REWARD.toFixed(2),
        description: `Referral reward — ${referee.name || "someone"} joined with your code`,
      });

      await tx.insert(referralsTable).values({
        referrerId: referrer.id,
        refereeId: referee.id,
        referrerReward: REFERRER_REWARD.toFixed(2),
        refereeReward: REFEREE_REWARD.toFixed(2),
      });
    });

    res.json({ ok: true, refereeReward: REFEREE_REWARD, referrerReward: REFERRER_REWARD });
  } catch (err) {
    req.log.error({ err }, "Failed to apply referral code");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
