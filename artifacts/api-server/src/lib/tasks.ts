import cron from "node-cron";
import { db, customerSubscriptionsTable } from "@workspace/db";
import { and, eq, lte, isNotNull } from "drizzle-orm";
import { resumeSubscription } from "./subscription-helpers";
import { performRedisKeepAlive } from "./redis";

export function initTasks() {
  // Run every hour to check for auto-resumptions
  cron.schedule("0 * * * *", async () => {
    console.log("[CRON] Checking for subscriptions to auto-resume...");
    
    try {
      const nowStr = new Date().toISOString().split("T")[0];
      
      const toResume = await db.select({ id: customerSubscriptionsTable.id })
        .from(customerSubscriptionsTable)
        .where(and(
          eq(customerSubscriptionsTable.status, "paused"),
          isNotNull(customerSubscriptionsTable.pausedUntil),
          lte(customerSubscriptionsTable.pausedUntil, nowStr)
        ));

      if (toResume.length === 0) {
        console.log("[CRON] No subscriptions to resume.");
        return;
      }

      console.log(`[CRON] Attempting to auto-resume ${toResume.length} subscriptions...`);

      for (const sub of toResume) {
        const result = await resumeSubscription(sub.id);
        if (result.success) {
          console.log(`[CRON] Successfully auto-resumed subscription ${sub.id}`);
        } else {
          console.error(`[CRON] Failed to auto-resume subscription ${sub.id}: ${result.error}`);
          // If it failed (e.g. low balance), we might want to clear pausedUntil 
          // to stop trying, or just leave it for the user to fix.
          // For now, let's just log it.
        }
      }
    } catch (err) {
      console.error("[CRON] Error in auto-resume task:", err);
    }
  });

  // Keep Redis active by pinging and recording heartbeat every 30 minutes
  // to prevent cloud Redis providers (e.g. RedisLabs / Redis Cloud, Upstash) from hibernating
  cron.schedule("*/30 * * * *", async () => {
    console.log("[CRON] Running scheduled Redis keep-alive heartbeat...");
    try {
      const result = await performRedisKeepAlive();
      if (result.success) {
        console.log(`[CRON] Redis keep-alive succeeded (${result.latencyMs}ms)`);
      } else {
        console.warn(`[CRON] Redis keep-alive failed: ${result.error}`);
      }
    } catch (err) {
      console.error("[CRON] Unexpected error in Redis keep-alive task:", err);
    }
  });

  console.log("[CRON] Tasks initialized.");
}
