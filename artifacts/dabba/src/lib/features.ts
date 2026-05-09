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

import { useQuery } from "@tanstack/react-query";

export const DEFAULT_FEATURES = {
  /** Payment gateway (Razorpay / UPI). */
  PAYMENT_GATEWAY: false,

  /** Vendor pro-tier billing. */
  VENDOR_PRO_TIERS: false,

  /** Loyalty points redemption at checkout. */
  LOYALTY_REDEMPTION: true,

  /** Peer-to-peer delivery marketplace. */
  PEER_DELIVERY: true,

  /** Customer referral program. */
  REFERRAL_PROGRAM: true,

  /** Require OTP Email Verification. Disabled = Testing Mode. */
  REQUIRE_EMAIL_VERIFICATION: false,
} as const;

export type FeatureKey = keyof typeof DEFAULT_FEATURES;

export function useFeatures() {
  const { data } = useQuery({
    queryKey: ["/api/platform/config"],
    queryFn: async () => {
      const res = await fetch("/api/platform/config");
      if (!res.ok) return { config: {} };
      return res.json() as Promise<{ config: Record<string, boolean> }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const config = data?.config || {};

  return {
    PAYMENT_GATEWAY: config.feature_payment_gateway_enabled ?? DEFAULT_FEATURES.PAYMENT_GATEWAY,
    VENDOR_PRO_TIERS: config.feature_vendor_pro_tiers_enabled ?? DEFAULT_FEATURES.VENDOR_PRO_TIERS,
    LOYALTY_REDEMPTION: config.feature_loyalty_redemption_enabled ?? DEFAULT_FEATURES.LOYALTY_REDEMPTION,
    PEER_DELIVERY: config.feature_peer_delivery_enabled ?? DEFAULT_FEATURES.PEER_DELIVERY,
    REFERRAL_PROGRAM: config.feature_referral_enabled ?? DEFAULT_FEATURES.REFERRAL_PROGRAM,
    REQUIRE_EMAIL_VERIFICATION: config.feature_require_email_verification ?? DEFAULT_FEATURES.REQUIRE_EMAIL_VERIFICATION,
  };
}
