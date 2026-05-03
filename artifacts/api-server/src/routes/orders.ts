import { Router } from "express";
import { db, ordersTable, vendorsTable, customersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/orders", async (req, res) => {
  try {
    const { status, date, vendorId } = req.query as Record<string, string>;

    const conditions: ReturnType<typeof eq>[] = [];
    if (status) conditions.push(eq(ordersTable.status, status as "pending" | "accepted" | "preparing" | "packed" | "picked_up" | "delivered" | "cancelled"));
    if (date) conditions.push(eq(ordersTable.scheduledDate, date));

    if (vendorId) {
      // Vendor view: filter by vendorId
      conditions.push(eq(ordersTable.vendorId, vendorId));
    } else if (req.isAuthenticated()) {
      // Customer view: filter by their customer record
      const [customer] = await db.select().from(customersTable).where(eq(customersTable.userId, req.user!.id));
      if (customer) {
        conditions.push(eq(ordersTable.customerId, customer.id));
      } else {
        return res.json({ orders: [] });
      }
    }

    const orders = conditions.length > 0
      ? await db.select().from(ordersTable).where(and(...conditions))
      : await db.select().from(ordersTable);

    const enriched = await Promise.all(orders.map(async (order) => {
      const [vendor] = await db.select({ name: vendorsTable.name }).from(vendorsTable).where(eq(vendorsTable.id, order.vendorId));
      const [customer] = await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, order.customerId));
      return { ...order, vendorName: vendor?.name, customerName: customer?.name };
    }));

    res.json({ orders: enriched });
  } catch (err) {
    req.log.error({ err }, "Failed to list orders");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/orders/today-summary", async (req, res) => {
  try {
    const { vendorId } = req.query as Record<string, string>;
    const today = new Date().toISOString().split("T")[0];

    const conditions = [eq(ordersTable.scheduledDate, today)];
    if (vendorId) conditions.push(eq(ordersTable.vendorId, vendorId));

    const orders = await db.select().from(ordersTable).where(and(...conditions));

    const byStatus: Record<string, number> = {};
    const byMealType: Record<string, number> = {};
    let revenue = 0;

    for (const order of orders) {
      byStatus[order.status] = (byStatus[order.status] ?? 0) + 1;
      if (order.mealType) byMealType[order.mealType] = (byMealType[order.mealType] ?? 0) + 1;
      revenue += parseFloat(order.totalAmount as string);
    }

    res.json({
      summary: {
        totalOrders: orders.length,
        byStatus,
        byMealType,
        revenue,
        pendingCount: byStatus.pending ?? 0,
        deliveredCount: byStatus.delivered ?? 0,
      }
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get today summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/orders/:orderId", async (req, res) => {
  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.orderId));
    if (!order) return res.status(404).json({ error: "Order not found" });
    const [vendor] = await db.select({ name: vendorsTable.name }).from(vendorsTable).where(eq(vendorsTable.id, order.vendorId));
    const [customer] = await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, order.customerId));
    res.json({ order: { ...order, vendorName: vendor?.name, customerName: customer?.name } });
  } catch (err) {
    req.log.error({ err }, "Failed to get order");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/orders/:orderId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const [order] = await db.update(ordersTable)
      .set({ status: req.body.status, updatedAt: new Date() })
      .where(eq(ordersTable.id, req.params.orderId))
      .returning();
    res.json({ order });
  } catch (err) {
    req.log.error({ err }, "Failed to update order");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
