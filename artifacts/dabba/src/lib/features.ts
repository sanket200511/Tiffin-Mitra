/**
 * Feature flags — single source of truth for feature gating.
 *
 * How this works today:
 *   All flags default to "safe" values (payment off, pro-tiers off, etc.).
 *   You can override any flag by changing its value below.
 *
 * How to wire to the database (when you are ready):
 *   1. Create GET /api/platform/config that reads the platform_settings table
 *      and returns only the `feature_*` keys as { [key]: boolean }.
 *   2. Create a usePlatformConfig() React hook that fetches that endpoint.
 *   3. Replace the static FEATURES object here with values from that hook
 *      (or merge them so the static object acts as a fallback).
 *
 * Adding a new flag:
 *   1. Add it here with a safe default.
 *   2. Add the matching key to DEFAULT_SETTINGS in lib/db/src/schema/settings.ts
 *   3. The admin can then toggle it via Admin → Settings.
 */

export const FEATURES = {
  /**
   * Payment gateway (Razorpay / UPI).
   * When true, the checkout flow will hit /api/payments/create-order and the
   * Razorpay checkout SDK will be loaded.  Requires RAZORPAY_KEY_ID +
   * RAZORPAY_KEY_SECRET env vars on the server.
   */
  PAYMENT_GATEWAY: false,

  /**
   * Vendor pro-tier billing.
   * When true:
   *   - Basic vendors see an "Upgrade to Pro" banner on the Plans page.
   *   - Plan creation is blocked when they hit max_plans_basic limit.
   *   - The /vendor/upgrade page shows pricing (pulled from platform settings).
   * When false:
   *   - All vendors get the Pro-level limits (999 plans) for free.
   *   - Upgrade page is accessible but shows "Coming Soon" pricing.
   */
  VENDOR_PRO_TIERS: false,

  /**
   * Loyalty points redemption at checkout.
   * Safe to keep true — the existing checkout flow already handles this.
   */
  LOYALTY_REDEMPTION: true,

  /**
   * Peer-to-peer delivery marketplace.
   * Disable to hide the Peer Delivery section from the customer nav/home.
   */
  PEER_DELIVERY: true,

  /**
   * Customer referral program.
   * Disable during DB migrations that touch the wallet / referral tables.
   */
  REFERRAL_PROGRAM: true,
} as const;

export type FeatureKey = keyof typeof FEATURES;

/** Type-safe flag check used in components. */
export function isEnabled(flag: FeatureKey): boolean {
  return FEATURES[flag];
}
