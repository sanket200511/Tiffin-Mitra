import { Router } from "express";
import { db, peerDeliveriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

// ─── Valid status transitions per role ───────────────────────────────────────
const CARRIER_TRANSITIONS: Record<string, string[]> = {
  accepted: ["in_transit"],
  in_transit: ["delivered"],
};
const REQUESTER_TRANSITIONS: Record<string, string[]> = {
  open: ["cancelled"],
  accepted: ["cancelled"],
};

// GET /api/peer-deliveries — public marketplace of open requests
router.get("/peer-deliveries", async (req, res) => {
  try {
    const { city, category } = req.query as Record<string, string>;
    const conditions: ReturnType<typeof eq>[] = [eq(peerDeliveriesTable.status, "open")];
    if (city) conditions.push(eq(peerDeliveriesTable.city, city));
    if (category) conditions.push(eq(peerDeliveriesTable.itemCategory, category as "books" | "documents" | "food" | "medicine" | "gift" | "other"));

    const rawRequests = await db.select().from(peerDeliveriesTable).where(and(...conditions));

    // Only show locality (not full address) in public listing
    const requests = rawRequests.map(r => ({
      id: r.id,
      requesterId: r.requesterId,
      requesterName: r.requesterName,
      itemTitle: r.itemTitle,
      itemDescription: r.itemDescription,
      itemCategory: r.itemCategory,
      estimatedWeightKg: r.estimatedWeightKg,
      pickupLocality: r.pickupLocality,
      dropoffLocality: r.dropoffLocality,
      city: r.city,
      offeredPrice: r.offeredPrice,
      preferredTime: r.preferredTime,
      notes: r.notes,
      status: r.status,
      createdAt: r.createdAt,
    }));

    res.json({ requests });
  } catch (err) {
    req.log.error({ err }, "Failed to list peer deliveries");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/peer-deliveries/mine — requests I posted + deliveries I'm carrying
router.get("/peer-deliveries/mine", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const posted = await db.select().from(peerDeliveriesTable)
      .where(eq(peerDeliveriesTable.requesterId, req.user.id));
    const carrying = await db.select().from(peerDeliveriesTable)
      .where(eq(peerDeliveriesTable.acceptedByUserId, req.user.id));

    res.json({ posted, carrying });
  } catch (err) {
    req.log.error({ err }, "Failed to get my peer deliveries");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/peer-deliveries — create a delivery request
router.post("/peer-deliveries", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const {
      itemTitle, itemDescription, itemCategory, estimatedWeightKg,
      pickupLocality, pickupAddress, dropoffLocality, dropoffAddress,
      city, offeredPrice, preferredTime, notes,
    } = req.body as {
      itemTitle: string;
      itemDescription?: string;
      itemCategory?: string;
      estimatedWeightKg?: number;
      pickupLocality: string;
      pickupAddress: string;
      dropoffLocality: string;
      dropoffAddress: string;
      city: string;
      offeredPrice?: number;
      preferredTime?: string;
      notes?: string;
    };

    if (!itemTitle || !pickupLocality || !pickupAddress || !dropoffLocality || !dropoffAddress || !city) {
      res.status(400).json({ error: "itemTitle, pickup/dropoff address and locality, and city are required." });
      return;
    }

    const [request] = await db.insert(peerDeliveriesTable).values({
      requesterId: req.user.id,
      requesterName: `${req.user.firstName ?? ""}`.trim() || "Community Member",
      itemTitle,
      itemDescription: itemDescription || null,
      itemCategory: (itemCategory as "books" | "documents" | "food" | "medicine" | "gift" | "other") || "other",
      estimatedWeightKg: estimatedWeightKg ? String(estimatedWeightKg) : "0.50",
      pickupLocality,
      pickupAddress,
      dropoffLocality,
      dropoffAddress,
      city,
      offeredPrice: offeredPrice ? String(offeredPrice) : "0",
      preferredTime: preferredTime || null,
      notes: notes || null,
      status: "open",
    }).returning();

    res.status(201).json({ request });
  } catch (err) {
    req.log.error({ err }, "Failed to create peer delivery request");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/peer-deliveries/:id — full details (includes addresses for accepted carrier)
router.get("/peer-deliveries/:id", async (req, res) => {
  try {
    const [request] = await db.select().from(peerDeliveriesTable)
      .where(eq(peerDeliveriesTable.id, req.params.id));
    if (!request) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    const isRequester = req.isAuthenticated() && req.user.id === request.requesterId;
    const isCarrier = req.isAuthenticated() && req.user.id === request.acceptedByUserId;

    // Only reveal full addresses to the requester or accepted carrier
    const canSeeAddress = isRequester || isCarrier;
    const response = {
      ...request,
      pickupAddress: canSeeAddress ? request.pickupAddress : null,
      dropoffAddress: canSeeAddress ? request.dropoffAddress : null,
    };

    res.json({ request: response });
  } catch (err) {
    req.log.error({ err }, "Failed to get peer delivery");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/peer-deliveries/:id/accept — carrier accepts a request
router.patch("/peer-deliveries/:id/accept", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [request] = await db.select().from(peerDeliveriesTable)
      .where(eq(peerDeliveriesTable.id, req.params.id));
    if (!request) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    if (request.status !== "open") {
      res.status(400).json({ error: "This request has already been accepted or closed." });
      return;
    }
    if (request.requesterId === req.user.id) {
      res.status(400).json({ error: "You cannot carry your own delivery request." });
      return;
    }

    const [updated] = await db.update(peerDeliveriesTable)
      .set({
        status: "accepted",
        acceptedByUserId: req.user.id,
        acceptorName: `${req.user.firstName ?? ""}`.trim() || "Carrier",
        updatedAt: new Date(),
      })
      .where(eq(peerDeliveriesTable.id, req.params.id))
      .returning();

    res.json({ request: updated });
  } catch (err) {
    req.log.error({ err }, "Failed to accept peer delivery");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/peer-deliveries/:id/status — update status (carrier or requester)
router.patch("/peer-deliveries/:id/status", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [request] = await db.select().from(peerDeliveriesTable)
      .where(eq(peerDeliveriesTable.id, req.params.id));
    if (!request) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    const { status: newStatus } = req.body as { status: string };
    const isCarrier = request.acceptedByUserId === req.user.id;
    const isRequester = request.requesterId === req.user.id;

    if (!isCarrier && !isRequester) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const allowedForCarrier = CARRIER_TRANSITIONS[request.status] ?? [];
    const allowedForRequester = REQUESTER_TRANSITIONS[request.status] ?? [];

    const allowed = isCarrier ? allowedForCarrier : allowedForRequester;
    if (!allowed.includes(newStatus)) {
      res.status(400).json({
        error: `Cannot transition from '${request.status}' to '${newStatus}'.`,
      });
      return;
    }

    const [updated] = await db.update(peerDeliveriesTable)
      .set({ status: newStatus as "open" | "accepted" | "in_transit" | "delivered" | "cancelled", updatedAt: new Date() })
      .where(eq(peerDeliveriesTable.id, req.params.id))
      .returning();

    res.json({ request: updated });
  } catch (err) {
    req.log.error({ err }, "Failed to update peer delivery status");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
