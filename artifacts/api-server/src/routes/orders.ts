import { Router } from "express";
import { db, ordersTable, vendorsTable, customersTable, walletTransactionsTable, customerSubscriptionsTable, subscriptionPlansTable, DEFAULT_SETTINGS, platformSettingsTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { notifyUser } from "../lib/notify";

const router = Router();

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["packed", "cancelled"],
  packed: ["picked_up", "cancelled"],
  picked_up: ["delivered"],
  delivered: [],
  cancelled: [],
};

const STATUS_NOTIFICATION: Record<string, { title: string; body: (v: string, d: string) => string }> = {
  accepted:  { title: "Order accepted", body: (v, d) => `${v} has accepted your tiffin for ${d}. Preparation is starting soon.` },
  preparing: { title: "Order being prepared", body: (v, d) => `${v} is now preparing your tiffin for ${d}.` },
  packed:    { title: "Tiffin packed", body: (v, d) => `Your tiffin from ${v} (${d}) is packed and ready for pickup.` },
  picked_up: { title: "Out for delivery", body: (v, d) => `Your tiffin from ${v} is on its way! Delivery date: ${d}.` },
  delivered: { title: "Tiffin delivered!", body: (v, d) => `Your tiffin from ${v} for ${d} has been delivered. Enjoy your meal!` },
  cancelled: { title: "Order cancelled", body: (v, d) => `Your order from ${v} (${d}) was cancelled. A refund has been processed to your wallet.` },
};

router.get("/orders", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { status, date, vendorId } = req.query as Record<string, string>;
    const isAdmin = req.user.role === "super_admin";

    const conditions: ReturnType<typeof eq>[] = [];
    if (status) conditions.push(eq(ordersTable.status, status as "pending" | "paid" | "confirmed" | "accepted" | "preparing" | "packed" | "picked_up" | "out_for_delivery" | "delivered" | "cancelled"));
    if (date) conditions.push(eq(ordersTable.scheduledDate, date));

    if (vendorId) {
      if (!isAdmin) {
        const [vendorRow] = await db.select({ ownerUserId: vendorsTable.ownerUserId })
          .from(vendorsTable).where(eq(vendorsTable.id, vendorId));
        if (!vendorRow || vendorRow.ownerUserId !== req.user.id) {
          res.status(403).json({ error: "Forbidden" });
          return;
        }
      }
      conditions.push(eq(ordersTable.vendorId, vendorId));
    } else if (!isAdmin) {
      const [customer] = await db.select({ id: customersTable.id }).from(customersTable).where(eq(customersTable.userId, req.user.id));
      if (customer) {
        conditions.push(eq(ordersTable.customerId, customer.id));
      } else {
        res.json({ orders: [] });
        return;
      }
    }

    const rows = await db
      .select({
        order: ordersTable,
        vendorName: vendorsTable.name,
        customerName: customersTable.name,
      })
      .from(ordersTable)
      .leftJoin(vendorsTable, eq(ordersTable.vendorId, vendorsTable.id))
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : sql`1=1`)
      .orderBy(desc(ordersTable.scheduledDate), desc(ordersTable.createdAt));

    const orders = rows.map(r => ({
      ...r.order,
      vendorName: r.vendorName ?? undefined,
      customerName: r.customerName ?? undefined,
    }));

    res.json({ orders });
  } catch (err) {
    req.log.error({ err }, "Failed to list orders");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/orders/today-summary", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { vendorId } = req.query as Record<string, string>;
    const isAdmin = req.user.role === "super_admin";
    const today = new Date().toISOString().split("T")[0];

    if (vendorId && !isAdmin) {
      const [vendorRow] = await db.select({ ownerUserId: vendorsTable.ownerUserId })
        .from(vendorsTable).where(eq(vendorsTable.id, vendorId));
      if (!vendorRow || vendorRow.ownerUserId !== req.user.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }

    const conditions: ReturnType<typeof eq>[] = [eq(ordersTable.scheduledDate, today)];
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
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [row] = await db
      .select({
        order: ordersTable,
        vendorOwnerUserId: vendorsTable.ownerUserId,
        vendorName: vendorsTable.name,
        customerUserId: customersTable.userId,
        customerName: customersTable.name,
      })
      .from(ordersTable)
      .leftJoin(vendorsTable, eq(ordersTable.vendorId, vendorsTable.id))
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .where(eq(ordersTable.id, req.params.orderId));

    if (!row) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const isVendorOwner = row.vendorOwnerUserId === req.user.id;
    const isCustomer = row.customerUserId === req.user.id;
    const isAdmin = req.user.role === "super_admin";

    if (!isVendorOwner && !isCustomer && !isAdmin) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    res.json({ order: { ...row.order, vendorName: row.vendorName ?? undefined, customerName: row.customerName ?? undefined } });
  } catch (err) {
    req.log.error({ err }, "Failed to get order");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/orders/:orderId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.orderId));
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const newStatus = req.body.status as string | undefined;

    if (newStatus) {
      const allowed = VALID_TRANSITIONS[order.status] ?? [];
      if (!allowed.includes(newStatus)) {
        res.status(400).json({
          error: `Cannot transition order from '${order.status}' to '${newStatus}'. Valid next states: ${allowed.length ? allowed.join(", ") : "none (terminal state)"}`,
        });
        return;
      }

      const [vendor] = await db.select({ ownerUserId: vendorsTable.ownerUserId })
        .from(vendorsTable).where(eq(vendorsTable.id, order.vendorId));
      const isAdmin = req.user.role === "super_admin";
      const isCustomerCancelling = newStatus === "cancelled" && req.user.role === "customer";

      if (isCustomerCancelling) {
        if (order.status !== "pending") {
          res.status(400).json({ error: "Orders can only be cancelled before the vendor accepts them." });
          return;
        }
        const [custRow] = await db.select({ id: customersTable.id })
          .from(customersTable).where(eq(customersTable.userId, req.user.id));
        if (!custRow || custRow.id !== order.customerId) {
          res.status(403).json({ error: "You can only cancel your own orders." });
          return;
        }
      } else if (!vendor || (vendor.ownerUserId !== req.user.id && !isAdmin)) {
        res.status(403).json({ error: "Only the vendor can update order status." });
        return;
      }
    }

    const cancelledByCustomer =
      newStatus === "cancelled" &&
      req.user.role === "customer";

    if (newStatus === "cancelled") {
      const [customerRow] = await db.select()
        .from(customersTable)
        .where(eq(customersTable.id, order.customerId));

      if (customerRow) {
        const refundAmount = parseFloat(order.totalAmount as string);
        const currentBalance = parseFloat(customerRow.walletBalance as string ?? "0");
        await db.update(customersTable)
          .set({ walletBalance: (currentBalance + refundAmount).toFixed(2), updatedAt: new Date() })
          .where(eq(customersTable.id, customerRow.id));

        await db.insert(walletTransactionsTable).values({
          customerId: customerRow.id,
          type: "credit",
          amount: refundAmount.toFixed(2),
          description: cancelledByCustomer
            ? `Refund: you cancelled your order (scheduled ${order.scheduledDate})`
            : `Refund: order cancelled by kitchen (scheduled ${order.scheduledDate})`,
        });
      }
    }

    const [updated] = await db.update(ordersTable)
      .set({
        status: newStatus as "pending" | "paid" | "confirmed" | "accepted" | "preparing" | "packed" | "picked_up" | "out_for_delivery" | "delivered" | "cancelled" | undefined,
        updatedAt: new Date()
      })
      .where(eq(ordersTable.id, req.params.orderId))
      .returning();

    // Notify the customer about the status change (fire-and-forget)
    if (newStatus && STATUS_NOTIFICATION[newStatus]) {
      const [customerRow] = await db
        .select({ userId: customersTable.userId })
        .from(customersTable)
        .where(eq(customersTable.id, order.customerId));

      const [vendorRow] = await db
        .select({ name: vendorsTable.name })
        .from(vendorsTable)
        .where(eq(vendorsTable.id, order.vendorId));

      if (customerRow?.userId && vendorRow?.name) {
        const notifCfg = STATUS_NOTIFICATION[newStatus];
        void notifyUser(customerRow.userId, {
          type: `order_${newStatus}`,
          title: notifCfg.title,
          body: notifCfg.body(vendorRow.name, order.scheduledDate),
          metadata: { orderId: order.id, vendorId: order.vendorId },
        });
      }
    }

    res.json({ order: updated });
  } catch (err) {
    req.log.error({ err }, "Failed to update order");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Vendor delivery sheet for a given date ───────────────────────────────────
router.get("/vendors/:vendorId/delivery-sheet", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { vendorId } = req.params;
    const isAdmin = req.user.role === "super_admin";

    if (!isAdmin) {
      const [vendor] = await db.select({ ownerUserId: vendorsTable.ownerUserId })
        .from(vendorsTable).where(eq(vendorsTable.id, vendorId));
      if (!vendor || vendor.ownerUserId !== req.user.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }

    const targetDate = (req.query as Record<string, string>).date
      || new Date().toISOString().split("T")[0];

    const rows = await db
      .select({
        orderId: ordersTable.id,
        status: ordersTable.status,
        scheduledDate: ordersTable.scheduledDate,
        mealType: ordersTable.mealType,
        totalAmount: ordersTable.totalAmount,
        deliveryAddress: ordersTable.deliveryAddress,
        specialInstructions: ordersTable.specialInstructions,
        customerName: customersTable.name,
        customerPhone: customersTable.phone,
        deliverySlot: customerSubscriptionsTable.deliverySlot,
        planName: subscriptionPlansTable.name,
      })
      .from(ordersTable)
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .leftJoin(customerSubscriptionsTable, eq(ordersTable.subscriptionId, customerSubscriptionsTable.id))
      .leftJoin(subscriptionPlansTable, eq(customerSubscriptionsTable.planId, subscriptionPlansTable.id))
      .where(and(eq(ordersTable.vendorId, vendorId), eq(ordersTable.scheduledDate, targetDate)))
      .orderBy(ordersTable.status);

    res.json({ deliveries: rows, date: targetDate, total: rows.length });
  } catch (err) {
    req.log.error({ err }, "Failed to get delivery sheet");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
