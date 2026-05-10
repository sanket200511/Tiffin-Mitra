import { Router } from "express";
import { db, reviewsTable, customersTable, ordersTable, vendorsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

// ─── Utility: recalculate and persist vendor avg rating ───────────────────────
async function refreshVendorRating(vendorId: string) {
  const allReviews = await db.select({ rating: reviewsTable.rating }).from(reviewsTable)
    .where(eq(reviewsTable.vendorId, vendorId));
  if (allReviews.length === 0) return;
  const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
  await db.update(vendorsTable)
    .set({
      rating: avg.toFixed(2),
      reviewCount: allReviews.length,
      updatedAt: new Date(),
    })
    .where(eq(vendorsTable.id, vendorId));
}

// ─── Sanitize contact info from free-text ─────────────────────────────────────
function sanitizeContactInfo(text: string): string {
  if (!text) return text;
  let out = text.replace(/(?:\+91[\s\-.]?)?[6-9]\d{9}/g, "[phone removed]");
  out = out.replace(/\b\d{10,}\b/g, "[number removed]");
  out = out.replace(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi, "[email removed]");
  out = out.replace(/(?:https?:\/\/|www\.)\S+/gi, "[link removed]");
  out = out.replace(/(?:whatsapp|wa\.me|telegram|t\.me|signal)[\s:@/]\S*/gi, "[removed]");
  return out;
}

router.get("/reviews", async (req, res) => {
  try {
    const { vendorId, customerId } = req.query as Record<string, string>;
    const conditions: ReturnType<typeof eq>[] = [];
    if (vendorId) conditions.push(eq(reviewsTable.vendorId, vendorId));
    if (customerId) conditions.push(eq(reviewsTable.customerId, customerId));

    const rows = await db
      .select({
        id: reviewsTable.id,
        customerId: reviewsTable.customerId,
        vendorId: reviewsTable.vendorId,
        orderId: reviewsTable.orderId,
        rating: reviewsTable.rating,
        comment: reviewsTable.comment,
        tags: reviewsTable.tags,
        vendorResponse: reviewsTable.vendorResponse,
        createdAt: reviewsTable.createdAt,
        customerName: customersTable.name,
      })
      .from(reviewsTable)
      .leftJoin(customersTable, eq(reviewsTable.customerId, customersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json({ reviews: rows });
  } catch (err) {
    req.log.error({ err }, "Failed to list reviews");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reviews", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.userId, req.user.id));
    if (!customer) {
      res.status(400).json({ error: "You must have an active customer profile to leave a review." });
      return;
    }

    const { vendorId, orderId, rating, comment, tags } = req.body as {
      vendorId: string;
      orderId?: string;
      rating: number;
      comment?: string;
      tags?: string[];
    };

    if (!vendorId) {
      res.status(400).json({ error: "vendorId is required." });
      return;
    }
    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: "Rating must be between 1 and 5." });
      return;
    }

    // Gate: customer must have at least one delivered order from this vendor
    const [deliveredOrder] = await db.select({ id: ordersTable.id }).from(ordersTable)
      .where(and(
        eq(ordersTable.customerId, customer.id),
        eq(ordersTable.vendorId, vendorId),
        eq(ordersTable.status, "delivered")
      ));
    if (!deliveredOrder) {
      res.status(403).json({ error: "You can only review a kitchen after receiving at least one delivered order from them." });
      return;
    }

    // Prevent duplicate reviews per vendor
    const [existing] = await db.select({ id: reviewsTable.id }).from(reviewsTable)
      .where(and(eq(reviewsTable.customerId, customer.id), eq(reviewsTable.vendorId, vendorId)));
    if (existing) {
      res.status(409).json({ error: "You have already submitted a review for this kitchen." });
      return;
    }

    const [review] = await db.insert(reviewsTable).values({
      customerId: customer.id,
      vendorId,
      orderId: orderId || deliveredOrder.id,
      rating,
      comment: comment || null,
      tags: tags || [],
    }).returning();

    // Recalculate and persist vendor rating
    await refreshVendorRating(vendorId);

    res.status(201).json({ review });
  } catch (err) {
    req.log.error({ err }, "Failed to create review");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Vendor response to a review ──────────────────────────────────────────────
router.patch("/reviews/:reviewId/response", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, req.params.reviewId));
    if (!review) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    // Verify the caller owns this vendor
    const [vendor] = await db.select({ id: vendorsTable.id }).from(vendorsTable)
      .where(and(eq(vendorsTable.id, review.vendorId), eq(vendorsTable.ownerUserId, req.user.id)));
    if (!vendor) {
      res.status(403).json({ error: "Forbidden — you do not own this kitchen." });
      return;
    }

    const { response } = req.body as { response: string };
    if (!response || response.trim().length < 5) {
      res.status(400).json({ error: "Response must be at least 5 characters." });
      return;
    }

    const cleaned = sanitizeContactInfo(response);
    const [updated] = await db.update(reviewsTable)
      .set({ vendorResponse: cleaned })
      .where(eq(reviewsTable.id, req.params.reviewId))
      .returning();

    res.json({ review: updated });
  } catch (err) {
    req.log.error({ err }, "Failed to update review response");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: delete a review ───────────────────────────────────────────────────
router.delete("/reviews/:reviewId", async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== "super_admin") {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [review] = await db.select({ vendorId: reviewsTable.vendorId }).from(reviewsTable)
      .where(eq(reviewsTable.id, req.params.reviewId));
    if (!review) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    await db.delete(reviewsTable).where(eq(reviewsTable.id, req.params.reviewId));
    
    // Recalculate and persist vendor rating
    await refreshVendorRating(review.vendorId);

    res.json({ message: "Review deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete review");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
