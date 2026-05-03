import { Router } from "express";
import { db, menuItemsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/vendors/:vendorId/menus", async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { mealType, dietType } = req.query as Record<string, string>;

    const conditions: ReturnType<typeof eq>[] = [eq(menuItemsTable.vendorId, vendorId)];
    if (mealType) conditions.push(eq(menuItemsTable.mealType, mealType as "breakfast" | "lunch" | "dinner" | "snacks"));
    if (dietType) conditions.push(eq(menuItemsTable.dietType, dietType as "veg" | "non_veg" | "jain" | "diabetic_friendly"));

    const menuItems = await db.select().from(menuItemsTable).where(and(...conditions));
    res.json({ menuItems });
  } catch (err) {
    req.log.error({ err }, "Failed to list menu items");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/vendors/:vendorId/menus", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { vendorId } = req.params;
    const [menuItem] = await db.insert(menuItemsTable).values({ ...req.body, vendorId }).returning();
    res.status(201).json({ menuItem });
  } catch (err) {
    req.log.error({ err }, "Failed to create menu item");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/vendors/:vendorId/menus/:menuItemId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [menuItem] = await db.update(menuItemsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(menuItemsTable.id, req.params.menuItemId))
      .returning();
    res.json({ menuItem });
  } catch (err) {
    req.log.error({ err }, "Failed to update menu item");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/vendors/:vendorId/menus/:menuItemId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    await db.delete(menuItemsTable).where(eq(menuItemsTable.id, req.params.menuItemId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete menu item");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
