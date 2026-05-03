import { Router } from "express";
import { db, vendorHolidaysTable, vendorsTable } from "@workspace/db";
import { eq, and, gte, asc } from "drizzle-orm";

const router = Router();

async function assertVendorAccess(vendorId: string, userId: string, role: string | null | undefined): Promise<boolean> {
  if (role === "super_admin") return true;
  const [vendor] = await db.select({ ownerUserId: vendorsTable.ownerUserId })
    .from(vendorsTable).where(eq(vendorsTable.id, vendorId));
  return vendor?.ownerUserId === userId;
}

// GET /api/vendors/:vendorId/holidays — public; returns upcoming + recent holidays
router.get("/vendors/:vendorId/holidays", async (req, res) => {
  try {
    const { vendorId } = req.params;
    const today = new Date().toISOString().split("T")[0];
    const rows = await db.select()
      .from(vendorHolidaysTable)
      .where(and(
        eq(vendorHolidaysTable.vendorId, vendorId),
        gte(vendorHolidaysTable.date, today),
      ))
      .orderBy(asc(vendorHolidaysTable.date));
    res.json({ holidays: rows });
  } catch (err) {
    req.log.error({ err }, "Failed to list holidays");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/vendors/:vendorId/holidays/all — vendor/admin; all holidays including past
router.get("/vendors/:vendorId/holidays/all", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const ok = await assertVendorAccess(req.params.vendorId, req.user.id, req.user.role);
  if (!ok) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const rows = await db.select()
      .from(vendorHolidaysTable)
      .where(eq(vendorHolidaysTable.vendorId, req.params.vendorId))
      .orderBy(asc(vendorHolidaysTable.date));
    res.json({ holidays: rows });
  } catch (err) {
    req.log.error({ err }, "Failed to list all holidays");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/vendors/:vendorId/holidays — add a holiday
router.post("/vendors/:vendorId/holidays", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const ok = await assertVendorAccess(req.params.vendorId, req.user.id, req.user.role);
  if (!ok) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { date, reason } = req.body as { date: string; reason?: string };
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "date is required in YYYY-MM-DD format" });
    return;
  }
  try {
    const [row] = await db.insert(vendorHolidaysTable)
      .values({ vendorId: req.params.vendorId, date, reason: reason?.trim() || null })
      .onConflictDoNothing()
      .returning();
    res.status(201).json({ holiday: row ?? null });
  } catch (err) {
    req.log.error({ err }, "Failed to add holiday");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/vendors/:vendorId/holidays/:holidayId — remove a holiday
router.delete("/vendors/:vendorId/holidays/:holidayId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const ok = await assertVendorAccess(req.params.vendorId, req.user.id, req.user.role);
  if (!ok) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    await db.delete(vendorHolidaysTable)
      .where(and(
        eq(vendorHolidaysTable.id, req.params.holidayId),
        eq(vendorHolidaysTable.vendorId, req.params.vendorId),
      ));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete holiday");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
