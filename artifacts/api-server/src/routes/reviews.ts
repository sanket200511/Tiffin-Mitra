import { Router } from "express";
import { db, reviewsTable, customersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/reviews", async (req, res) => {
  try {
    const { vendorId, customerId } = req.query as Record<string, string>;
    const conditions: ReturnType<typeof eq>[] = [];
    if (vendorId) conditions.push(eq(reviewsTable.vendorId, vendorId));
    if (customerId) conditions.push(eq(reviewsTable.customerId, customerId));

    const rawReviews = conditions.length > 0
      ? await db.select().from(reviewsTable).where(and(...conditions))
      : await db.select().from(reviewsTable);

    const reviews = await Promise.all(rawReviews.map(async (review) => {
      const [customer] = await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, review.customerId));
      return { ...review, customerName: customer?.name };
    }));

    res.json({ reviews });
  } catch (err) {
    req.log.error({ err }, "Failed to list reviews");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reviews", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    let [customer] = await db.select().from(customersTable).where(eq(customersTable.userId, req.user!.id));
    if (!customer) {
      [customer] = await db.insert(customersTable).values({ userId: req.user!.id }).returning();
    }
    const [review] = await db.insert(reviewsTable).values({ ...req.body, customerId: customer.id }).returning();
    res.status(201).json({ review });
  } catch (err) {
    req.log.error({ err }, "Failed to create review");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
