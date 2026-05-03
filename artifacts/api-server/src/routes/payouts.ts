import { Router } from "express";
import { db, payoutRequestsTable, vendorsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { notifyUser, notifyAllAdmins } from "../lib/notify";

const router = Router();

// GET /payouts — vendor: own requests; admin: all requests
router.get("/payouts", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    if (req.user.role === "super_admin") {
      const { status, vendorId: vendorIdFilter } = req.query as Record<string, string>;
      const conditions: ReturnType<typeof eq>[] = [];
      if (status) conditions.push(eq(payoutRequestsTable.status, status as "pending" | "processing" | "paid" | "rejected"));
      if (vendorIdFilter) conditions.push(eq(payoutRequestsTable.vendorId, vendorIdFilter));
      const payouts = await db.select().from(payoutRequestsTable)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(payoutRequestsTable.createdAt));
      res.json({ payouts });
      return;
    }
    // Vendor: fetch their vendor record, then their payout requests
    const [vendor] = await db
      .select({ id: vendorsTable.id })
      .from(vendorsTable)
      .where(eq(vendorsTable.ownerUserId, req.user.id));
    if (!vendor) {
      res.json({ payouts: [] });
      return;
    }
    const payouts = await db.select().from(payoutRequestsTable)
      .where(eq(payoutRequestsTable.vendorId, vendor.id))
      .orderBy(desc(payoutRequestsTable.createdAt));
    res.json({ payouts });
  } catch (err) {
    req.log.error({ err }, "Failed to list payout requests");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /payouts — vendor submits a new payout request
router.post("/payouts", async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== "vendor") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const [vendor] = await db.select().from(vendorsTable)
      .where(eq(vendorsTable.ownerUserId, req.user.id));
    if (!vendor) {
      res.status(404).json({ error: "Vendor profile not found" });
      return;
    }

    const { amount, upiId, bankAccount, ifscCode, accountName, notes } = req.body as {
      amount: number;
      upiId?: string;
      bankAccount?: string;
      ifscCode?: string;
      accountName?: string;
      notes?: string;
    };

    if (!amount || typeof amount !== "number" || amount <= 0 || amount > 10_00_000) {
      res.status(400).json({ error: "Invalid amount. Must be between ₹1 and ₹10,00,000." });
      return;
    }
    if (!upiId?.trim() && !bankAccount?.trim()) {
      res.status(400).json({ error: "Provide either a UPI ID or a bank account number." });
      return;
    }

    const [payout] = await db.insert(payoutRequestsTable).values({
      vendorId: vendor.id,
      vendorName: vendor.name,
      amount: amount.toFixed(2),
      upiId: upiId?.trim() || null,
      bankAccount: bankAccount?.trim() || null,
      ifscCode: ifscCode?.trim() || null,
      accountName: accountName?.trim() || null,
      notes: notes?.trim() || null,
    }).returning();

    // Notify all admins of the new payout request
    void notifyAllAdmins({
      type: "payout_request",
      title: "New payout request",
      body: `${vendor.name} has requested a payout of ₹${amount.toFixed(0)}. Please review in Payouts.`,
      metadata: { payoutId: payout.id, vendorId: vendor.id, vendorName: vendor.name, amount },
    });

    res.status(201).json({ payout });
  } catch (err) {
    req.log.error({ err }, "Failed to create payout request");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /payouts/:id — admin updates status / adds notes
router.patch("/payouts/:payoutId", async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { status, adminNotes } = req.body as { status: string; adminNotes?: string };
  const allowed = ["pending", "processing", "paid", "rejected"] as const;
  if (!allowed.includes(status as typeof allowed[number])) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  try {
    const updates: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };
    if (adminNotes !== undefined) updates.adminNotes = adminNotes.trim();
    if (status === "paid" || status === "rejected") updates.processedAt = new Date();

    const [payout] = await db.update(payoutRequestsTable)
      .set(updates)
      .where(eq(payoutRequestsTable.id, req.params.payoutId))
      .returning();
    if (!payout) {
      res.status(404).json({ error: "Payout request not found" });
      return;
    }

    // Notify vendor if payout was paid or rejected
    if (status === "paid" || status === "rejected") {
      const [vendor] = await db
        .select({ ownerUserId: vendorsTable.ownerUserId, name: vendorsTable.name })
        .from(vendorsTable)
        .where(eq(vendorsTable.id, payout.vendorId));

      if (vendor?.ownerUserId) {
        const amountStr = `₹${parseFloat(payout.amount as string).toFixed(0)}`;
        void notifyUser(vendor.ownerUserId, {
          type: "payout_processed",
          title: status === "paid" ? "Payout completed" : "Payout rejected",
          body: status === "paid"
            ? `Your payout of ${amountStr} has been processed and sent to your account.`
            : `Your payout request of ${amountStr} was rejected. ${adminNotes ? `Note: ${adminNotes}` : "Please contact support for details."}`,
          metadata: { payoutId: payout.id, amount: payout.amount, status },
        });
      }
    }

    res.json({ payout });
  } catch (err) {
    req.log.error({ err }, "Failed to update payout request");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
