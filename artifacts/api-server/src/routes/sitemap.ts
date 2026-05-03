import { Router } from "express";
import { db, vendorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /sitemap.xml — public XML sitemap
router.get("/sitemap.xml", async (req, res) => {
  try {
    const vendors = await db
      .select({ id: vendorsTable.id, updatedAt: vendorsTable.updatedAt })
      .from(vendorsTable)
      .where(eq(vendorsTable.status, "approved"));

    // APP_URL: set this to your production domain, e.g. https://dabba.example.com
    const domain = process.env.APP_URL ?? "https://dabba.app";

    const today = new Date().toISOString().split("T")[0];

    const staticEntries = [
      { url: "/",             priority: "1.0", changefreq: "weekly",  lastmod: today },
      { url: "/explore",      priority: "0.9", changefreq: "daily",   lastmod: today },
      { url: "/how-it-works", priority: "0.7", changefreq: "monthly", lastmod: today },
      { url: "/about",        priority: "0.6", changefreq: "monthly", lastmod: today },
    ];

    const vendorEntries = vendors.map((v) => ({
      url: `/vendor/${v.id}`,
      priority: "0.8",
      changefreq: "weekly",
      lastmod: v.updatedAt
        ? new Date(v.updatedAt).toISOString().split("T")[0]
        : today,
    }));

    const allEntries = [...staticEntries, ...vendorEntries];

    const urlNodes = allEntries
      .map((e) =>
        [
          "  <url>",
          `    <loc>${domain}${e.url}</loc>`,
          `    <lastmod>${e.lastmod}</lastmod>`,
          `    <changefreq>${e.changefreq}</changefreq>`,
          `    <priority>${e.priority}</priority>`,
          "  </url>",
        ].join("\n"),
      )
      .join("\n");

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      urlNodes,
      "</urlset>",
    ].join("\n");

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (err) {
    req.log.error({ err }, "Failed to generate sitemap");
    res.status(500).send("Internal server error");
  }
});

export default router;
