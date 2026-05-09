import { Router } from "express";
import { db, disputesTable, ordersTable, customersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { notifyUser } from "../lib/notify";

const router = Router();

router.post("/disputes", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { orderId, issueType, description, photoUrl } = req.body;
    
    const [customer] = await db.select({ id: customersTable.id }).from(customersTable).where(eq(customersTable.userId, req.user.id));
    if (!customer) {
      res.status(403).json({ error: "Only customers can raise disputes" });
      return;
    }

    const [order] = await db.select().from(ordersTable).where(and(eq(ordersTable.id, orderId), eq(ordersTable.customerId, customer.id)));
    if (!order) {
      res.status(404).json({ error: "Order not found or not yours" });
      return;
    }

    const [dispute] = await db.insert(disputesTable).values({
      orderId,
      customerId: customer.id,
      vendorId: order.vendorId,
      issueType,
      description,
      photoUrl,
      status: "pending",
    }).returning();

    // Notify admin (mock) or platform system
    // In a real app, we might notify the vendor too or just keep it for admin
    
    res.status(201).json({ dispute });
  } catch (err) {
    req.log.error({ err }, "Failed to create dispute");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/disputes", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const isAdmin = req.user.role === "super_admin";
    
    if (isAdmin) {
      const disputes = await db.select().from(disputesTable).orderBy(desc(disputesTable.createdAt));
      res.json({ disputes });
    } else {
      const [customer] = await db.select({ id: customersTable.id }).from(customersTable).where(eq(customersTable.userId, req.user.id));
      if (!customer) {
        res.json({ disputes: [] });
        return;
      }
      const disputes = await db.select().from(disputesTable).where(eq(disputesTable.customerId, customer.id)).orderBy(desc(disputesTable.createdAt));
      res.json({ disputes });
    }
  } catch (err) {
    req.log.error({ err }, "Failed to list disputes");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
