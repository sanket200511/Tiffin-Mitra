import { Router } from "express";
import { db, ordersTable, customersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/deliveries", async (req, res) => {
  try {
    const { date, status } = req.query as Record<string, string>;
    const today = date ?? new Date().toISOString().split("T")[0];

    const conditions = [eq(ordersTable.scheduledDate, today)];
    const orders = await db.select().from(ordersTable).where(and(...conditions));

    const deliveries = await Promise.all(orders.map(async (order) => {
      const [customer] = await db.select({ name: customersTable.name, address: customersTable.defaultDeliveryAddress })
        .from(customersTable).where(eq(customersTable.id, order.customerId));
      return {
        id: order.id,
        orderId: order.id,
        agentName: null,
        customerName: customer?.name,
        deliveryAddress: order.deliveryAddress ?? customer?.address,
        status: order.status === "delivered" ? "completed"
          : order.status === "picked_up" ? "in_progress"
          : order.status === "cancelled" ? "failed"
          : "assigned",
        scheduledDate: order.scheduledDate,
        deliverySlot: null,
      };
    }));

    const filtered = status ? deliveries.filter(d => d.status === status) : deliveries;
    res.json({ deliveries: filtered });
  } catch (err) {
    req.log.error({ err }, "Failed to list deliveries");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/deliveries/:deliveryId/status", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const statusMap: Record<string, "delivered" | "picked_up" | "cancelled"> = {
      completed: "delivered",
      in_progress: "picked_up",
      failed: "cancelled",
    };
    const orderStatus = statusMap[req.body.status] ?? "delivered";
    await db.update(ordersTable).set({ status: orderStatus, updatedAt: new Date() }).where(eq(ordersTable.id, req.params.deliveryId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update delivery status");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
