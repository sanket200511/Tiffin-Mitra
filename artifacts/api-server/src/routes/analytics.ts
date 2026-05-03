import { Router } from "express";
import { db, ordersTable, vendorsTable, customersTable, customerSubscriptionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/analytics/vendor/:vendorId/revenue", async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { period = "30d" } = req.query as Record<string, string>;

    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const orders = await db.select().from(ordersTable)
      .where(and(eq(ordersTable.vendorId, vendorId), eq(ordersTable.status, "delivered")));

    const trendMap: Record<string, { revenue: number; orders: number }> = {};
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      trendMap[dateStr] = { revenue: 0, orders: 0 };
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
  try {
    const { vendorId } = req.params;
    const { menuItemsTable } = await import("@workspace/db");

    const deliveredOrders = await db.select().from(ordersTable)
      .where(and(eq(ordersTable.vendorId, vendorId), eq(ordersTable.status, "delivered")));

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
  try {
    const { vendorId } = req.params;
    const subs = await db.select().from(customerSubscriptionsTable)
      .where(eq(customerSubscriptionsTable.vendorId, vendorId));

    const counts = { active: 0, paused: 0, cancelled: 0, expired: 0 };
    for (const sub of subs) {
      const status = sub.status as keyof typeof counts;
      if (status in counts) counts[status] += 1;
    }

    const total = subs.length;
    const retentionRate = total > 0 ? Math.round((counts.active / total) * 100) : 0;

    res.json({ health: { ...counts, total, retentionRate } });
  } catch (err) {
    req.log.error({ err }, "Failed to get subscription health");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/analytics/platform/overview", async (req, res) => {
  try {
    const allVendors = await db.select().from(vendorsTable);
    const allCustomers = await db.select().from(customersTable);
    const allSubs = await db.select().from(customerSubscriptionsTable);
    const today = new Date().toISOString().split("T")[0];
    const todayOrders = await db.select().from(ordersTable).where(eq(ordersTable.scheduledDate, today));
    const allOrders = await db.select().from(ordersTable);

    const activeVendors = allVendors.filter(v => v.status === "approved").length;
    const pendingApprovals = allVendors.filter(v => v.status === "pending").length;
    const featuredVendors = allVendors.filter(v => v.featured).length;
    const activeSubs = allSubs.filter(s => s.status === "active").length;
    const gmv = allOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount as string), 0);

    // Commission uses each vendor's actual stored rate (not a hardcoded percentage)
    const commissionRevenue = allVendors.reduce((total, vendor) => {
      const vendorOrders = allOrders.filter(o => o.vendorId === vendor.id);
      const vendorGMV = vendorOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount as string), 0);
      const rate = parseFloat(vendor.commissionRate as string) / 100;
      return total + vendorGMV * rate;
    }, 0);

    res.json({
      overview: {
        totalVendors: allVendors.length,
        activeVendors,
        featuredVendors,
        totalCustomers: allCustomers.length,
        activeSubscriptions: activeSubs,
        totalOrdersToday: todayOrders.length,
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

export default router;
