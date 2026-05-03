import { Router } from "express";
import { db, ordersTable, vendorsTable, customersTable, customerSubscriptionsTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";

const router = Router();

async function assertVendorAccess(
  vendorId: string,
  userId: string,
  role: string | null | undefined,
): Promise<{ ok: boolean; status: number; error: string }> {
  if (role === "super_admin") return { ok: true, status: 200, error: "" };
  const [vendor] = await db.select({ ownerUserId: vendorsTable.ownerUserId })
    .from(vendorsTable).where(eq(vendorsTable.id, vendorId));
  if (!vendor) return { ok: false, status: 404, error: "Vendor not found" };
  if (vendor.ownerUserId !== userId) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true, status: 200, error: "" };
}

function dateRangeStrings(days: number): { startDate: string; endDate: string } {
  const today = new Date();
  const end = today.toISOString().split("T")[0];
  const start = new Date(today);
  start.setDate(today.getDate() - (days - 1));
  return { startDate: start.toISOString().split("T")[0], endDate: end };
}

router.get("/analytics/vendor/:vendorId/revenue", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { vendorId } = req.params;
  const access = await assertVendorAccess(vendorId, req.user.id, req.user.role);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }
  try {
    const { period = "30d" } = req.query as Record<string, string>;
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const { startDate, endDate } = dateRangeStrings(days);

    const orders = await db
      .select({
        scheduledDate: ordersTable.scheduledDate,
        totalAmount: ordersTable.totalAmount,
      })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.vendorId, vendorId),
          eq(ordersTable.status, "delivered"),
          gte(ordersTable.scheduledDate, startDate),
          lte(ordersTable.scheduledDate, endDate),
        )
      );

    const trendMap: Record<string, { revenue: number; orders: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      trendMap[d.toISOString().split("T")[0]] = { revenue: 0, orders: 0 };
    }

    for (const order of orders) {
      if (trendMap[order.scheduledDate]) {
        trendMap[order.scheduledDate].revenue += parseFloat(order.totalAmount as string);
        trendMap[order.scheduledDate].orders += 1;
      }
    }

    const trend = Object.entries(trendMap).map(([date, { revenue, orders: cnt }]) => ({ date, revenue, orders: cnt }));
    res.json({ trend });
  } catch (err) {
    req.log.error({ err }, "Failed to get revenue trend");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/analytics/vendor/:vendorId/popular-dishes", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { vendorId } = req.params;
  const access = await assertVendorAccess(vendorId, req.user.id, req.user.role);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }
  try {
    const { menuItemsTable } = await import("@workspace/db");
    const { startDate } = dateRangeStrings(90);

    const deliveredOrders = await db
      .select({ mealType: ordersTable.mealType, totalAmount: ordersTable.totalAmount })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.vendorId, vendorId),
          eq(ordersTable.status, "delivered"),
          gte(ordersTable.scheduledDate, startDate),
        )
      );

    const mealTypeCounts: Record<string, { count: number; revenue: number }> = {};
    for (const order of deliveredOrders) {
      const key = order.mealType || "standard";
      if (!mealTypeCounts[key]) mealTypeCounts[key] = { count: 0, revenue: 0 };
      mealTypeCounts[key].count += 1;
      mealTypeCounts[key].revenue += parseFloat(order.totalAmount as string);
    }

    const menuItems = await db.select().from(menuItemsTable).where(eq(menuItemsTable.vendorId, vendorId));

    const dishes = menuItems.map(item => {
      const orderStats = mealTypeCounts[item.mealType || "standard"] || { count: 0, revenue: 0 };
      return {
        name: item.name,
        orderCount: orderStats.count,
        revenue: orderStats.revenue,
        mealType: item.mealType,
      };
    }).sort((a, b) => b.orderCount - a.orderCount).slice(0, 10);

    if (dishes.length === 0) {
      const fallback = Object.entries(mealTypeCounts)
        .map(([mealType, stats]) => ({ name: mealType, orderCount: stats.count, revenue: stats.revenue, mealType }))
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 10);
      res.json({ dishes: fallback });
      return;
    }

    res.json({ dishes });
  } catch (err) {
    req.log.error({ err }, "Failed to get popular dishes");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/analytics/vendor/:vendorId/subscription-health", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { vendorId } = req.params;
  const access = await assertVendorAccess(vendorId, req.user.id, req.user.role);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }
  try {
    const rows = await db
      .select({
        status: customerSubscriptionsTable.status,
        count: sql<number>`count(*)::int`,
      })
      .from(customerSubscriptionsTable)
      .where(eq(customerSubscriptionsTable.vendorId, vendorId))
      .groupBy(customerSubscriptionsTable.status);

    const counts = { active: 0, paused: 0, cancelled: 0, expired: 0 };
    let total = 0;
    for (const row of rows) {
      const status = row.status as keyof typeof counts;
      if (status in counts) counts[status] = row.count;
      total += row.count;
    }

    const retentionRate = total > 0 ? Math.round((counts.active / total) * 100) : 0;
    res.json({ health: { ...counts, total, retentionRate } });
  } catch (err) {
    req.log.error({ err }, "Failed to get subscription health");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/analytics/platform/revenue", async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const { period = "30d" } = req.query as Record<string, string>;
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const { startDate, endDate } = dateRangeStrings(days);

    const [orders, allVendors] = await Promise.all([
      db
        .select({
          scheduledDate: ordersTable.scheduledDate,
          totalAmount: ordersTable.totalAmount,
          vendorId: ordersTable.vendorId,
        })
        .from(ordersTable)
        .where(
          and(
            eq(ordersTable.status, "delivered"),
            gte(ordersTable.scheduledDate, startDate),
            lte(ordersTable.scheduledDate, endDate),
          )
        ),
      db.select({ id: vendorsTable.id, commissionRate: vendorsTable.commissionRate }).from(vendorsTable),
    ]);

    const vendorRateMap = Object.fromEntries(
      allVendors.map(v => [v.id, parseFloat(v.commissionRate as string ?? "10") / 100])
    );

    const trendMap: Record<string, { revenue: number; orders: number; commission: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      trendMap[d.toISOString().split("T")[0]] = { revenue: 0, orders: 0, commission: 0 };
    }

    for (const order of orders) {
      if (trendMap[order.scheduledDate]) {
        const amount = parseFloat(order.totalAmount as string);
        const commission = amount * (vendorRateMap[order.vendorId] ?? 0.10);
        trendMap[order.scheduledDate].revenue += amount;
        trendMap[order.scheduledDate].orders += 1;
        trendMap[order.scheduledDate].commission += commission;
      }
    }

    const trend = Object.entries(trendMap).map(([date, data]) => ({ date, ...data }));
    res.json({ trend });
  } catch (err) {
    req.log.error({ err }, "Failed to get platform revenue trend");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/analytics/platform/overview", async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const today = new Date().toISOString().split("T")[0];

    const [vendorStats, customerCount, subStats, orderStats] = await Promise.all([
      db
        .select({
          status: vendorsTable.status,
          featured: vendorsTable.featured,
          count: sql<number>`count(*)::int`,
          commissionRate: vendorsTable.commissionRate,
        })
        .from(vendorsTable)
        .groupBy(vendorsTable.status, vendorsTable.featured, vendorsTable.commissionRate),
      db.select({ count: sql<number>`count(*)::int` }).from(customersTable),
      db
        .select({
          status: customerSubscriptionsTable.status,
          count: sql<number>`count(*)::int`,
        })
        .from(customerSubscriptionsTable)
        .groupBy(customerSubscriptionsTable.status),
      db
        .select({
          scheduledDate: ordersTable.scheduledDate,
          totalAmount: ordersTable.totalAmount,
          vendorId: ordersTable.vendorId,
          count: sql<number>`count(*)::int`,
          gmv: sql<number>`sum(${ordersTable.totalAmount}::numeric)`,
        })
        .from(ordersTable)
        .groupBy(ordersTable.scheduledDate, ordersTable.totalAmount, ordersTable.vendorId),
    ]);

    // Recompute per-vendor commission requires joining — do it simply
    const allOrders = await db
      .select({ vendorId: ordersTable.vendorId, totalAmount: ordersTable.totalAmount })
      .from(ordersTable);
    const allVendors = await db
      .select({ id: vendorsTable.id, status: vendorsTable.status, featured: vendorsTable.featured, commissionRate: vendorsTable.commissionRate })
      .from(vendorsTable);

    const activeVendors = allVendors.filter(v => v.status === "approved").length;
    const pendingApprovals = allVendors.filter(v => v.status === "pending").length;
    const featuredVendors = allVendors.filter(v => v.featured).length;
    const totalVendors = allVendors.length;
    const totalCustomers = customerCount[0]?.count ?? 0;

    const activeSubs = subStats.find(s => s.status === "active")?.count ?? 0;

    const vendorRateMap = Object.fromEntries(
      allVendors.map(v => [v.id, parseFloat(v.commissionRate as string ?? "10") / 100])
    );

    let gmv = 0;
    let commissionRevenue = 0;
    let totalOrdersToday = 0;
    for (const order of allOrders) {
      const amount = parseFloat(order.totalAmount as string);
      gmv += amount;
      commissionRevenue += amount * (vendorRateMap[order.vendorId] ?? 0.10);
    }

    const todayOrdersResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(ordersTable)
      .where(eq(ordersTable.scheduledDate, today));
    totalOrdersToday = todayOrdersResult[0]?.count ?? 0;

    res.json({
      overview: {
        totalVendors,
        activeVendors,
        featuredVendors,
        totalCustomers,
        activeSubscriptions: activeSubs,
        totalOrdersToday,
        platformGMV: gmv,
        commissionRevenue,
        pendingVendorApprovals: pendingApprovals,
      }
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get platform overview");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Top 10 vendors by GMV for the period ────────────────────────────────────
router.get("/analytics/platform/top-vendors", async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const { period = "30d" } = req.query as Record<string, string>;
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const { startDate, endDate } = dateRangeStrings(days);

    const allVendorsForRate = await db
      .select({ id: vendorsTable.id, commissionRate: vendorsTable.commissionRate })
      .from(vendorsTable);
    const vendorRateMap = Object.fromEntries(
      allVendorsForRate.map(v => [v.id, parseFloat(v.commissionRate as string ?? "10") / 100])
    );

    const rows = await db
      .select({
        vendorId: ordersTable.vendorId,
        gmv: sql<number>`sum(${ordersTable.totalAmount}::numeric)`,
        orders: sql<number>`count(*)::int`,
        vendorName: vendorsTable.name,
        city: vendorsTable.city,
      })
      .from(ordersTable)
      .leftJoin(vendorsTable, eq(ordersTable.vendorId, vendorsTable.id))
      .where(
        and(
          eq(ordersTable.status, "delivered"),
          gte(ordersTable.scheduledDate, startDate),
          lte(ordersTable.scheduledDate, endDate),
        )
      )
      .groupBy(ordersTable.vendorId, vendorsTable.name, vendorsTable.city)
      .orderBy(sql`sum(${ordersTable.totalAmount}::numeric) desc`)
      .limit(10);

    const vendors = rows.map(r => ({
      vendorId: r.vendorId,
      vendorName: r.vendorName ?? "Unknown",
      city: r.city ?? "-",
      gmv: parseFloat(String(r.gmv ?? 0)),
      orders: r.orders,
      commission: parseFloat(String(r.gmv ?? 0)) * (vendorRateMap[r.vendorId] ?? 0.1),
    }));

    res.json({ vendors });
  } catch (err) {
    req.log.error({ err }, "Failed to get top vendors");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── City-wise revenue breakdown ─────────────────────────────────────────────
router.get("/analytics/platform/city-revenue", async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const { period = "30d" } = req.query as Record<string, string>;
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const { startDate, endDate } = dateRangeStrings(days);

    const rows = await db
      .select({
        city: vendorsTable.city,
        revenue: sql<number>`sum(${ordersTable.totalAmount}::numeric)`,
        orders: sql<number>`count(*)::int`,
      })
      .from(ordersTable)
      .leftJoin(vendorsTable, eq(ordersTable.vendorId, vendorsTable.id))
      .where(
        and(
          eq(ordersTable.status, "delivered"),
          gte(ordersTable.scheduledDate, startDate),
          lte(ordersTable.scheduledDate, endDate),
        )
      )
      .groupBy(vendorsTable.city)
      .orderBy(sql`sum(${ordersTable.totalAmount}::numeric) desc`);

    const cities = rows.map(r => ({
      city: r.city ?? "Unknown",
      revenue: parseFloat(String(r.revenue ?? 0)),
      orders: r.orders,
    }));

    res.json({ cities });
  } catch (err) {
    req.log.error({ err }, "Failed to get city revenue");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Churn & subscription health ─────────────────────────────────────────────
router.get("/analytics/platform/churn", async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const { period = "30d" } = req.query as Record<string, string>;
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const { startDate } = dateRangeStrings(days);

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const expiryThreshold = sevenDaysFromNow.toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];

    const [churned, totalActive, expiringSoon, newThisPeriod] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(customerSubscriptionsTable)
        .where(
          and(
            eq(customerSubscriptionsTable.status, "cancelled"),
            gte(customerSubscriptionsTable.updatedAt, new Date(startDate)),
          )
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(customerSubscriptionsTable)
        .where(eq(customerSubscriptionsTable.status, "active")),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(customerSubscriptionsTable)
        .where(
          and(
            eq(customerSubscriptionsTable.status, "active"),
            gte(customerSubscriptionsTable.endDate, today),
            lte(customerSubscriptionsTable.endDate, expiryThreshold),
          )
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(customerSubscriptionsTable)
        .where(gte(customerSubscriptionsTable.createdAt, new Date(startDate))),
    ]);

    const churnedCount = churned[0]?.count ?? 0;
    const activeCount = totalActive[0]?.count ?? 0;
    const expiringSoonCount = expiringSoon[0]?.count ?? 0;
    const newCount = newThisPeriod[0]?.count ?? 0;
    const denominator = activeCount + churnedCount;
    const churnRate = denominator > 0
      ? parseFloat(((churnedCount / denominator) * 100).toFixed(1))
      : 0;

    res.json({ churned: churnedCount, active: activeCount, expiringSoon: expiringSoonCount, newThisPeriod: newCount, churnRate });
  } catch (err) {
    req.log.error({ err }, "Failed to get churn stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
