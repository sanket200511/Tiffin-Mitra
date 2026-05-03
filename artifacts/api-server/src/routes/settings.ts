import { Router } from "express";
import { db, platformSettingsTable, DEFAULT_SETTINGS } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function ensureDefaults() {
  for (const s of DEFAULT_SETTINGS) {
    await db.insert(platformSettingsTable)
      .values(s)
      .onConflictDoNothing();
  }
}

// ─── Public platform config (feature flags only) ─────────────────────────────
// Exposes only `feature_*` keys as booleans. No auth required.
// The frontend reads this to gate UI features without hardcoding flags.
router.get("/platform/config", async (_req, res) => {
  try {
    await ensureDefaults();
    const all = await db.select().from(platformSettingsTable);
    const config: Record<string, boolean | string> = {};
    for (const s of all) {
      if (s.key.startsWith("feature_")) {
        config[s.key] = s.value === "true";
      }
    }
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json({ config });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: read all settings ─────────────────────────────────────────────────
router.get("/admin/settings", async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    await ensureDefaults();
    const settings = await db.select().from(platformSettingsTable);
    res.json({ settings });
  } catch (err) {
    req.log.error({ err }, "Failed to get settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: update settings ───────────────────────────────────────────────────
router.patch("/admin/settings", async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const updates = req.body as Record<string, string>;
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") continue;
      await db.update(platformSettingsTable)
        .set({ value: String(value), updatedAt: new Date() })
        .where(eq(platformSettingsTable.key, key));
    }
    const settings = await db.select().from(platformSettingsTable);
    res.json({ settings });
  } catch (err) {
    req.log.error({ err }, "Failed to update settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
