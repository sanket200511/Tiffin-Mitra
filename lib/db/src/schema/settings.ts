import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const platformSettingsTable = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  label: text("label"),
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PlatformSetting = typeof platformSettingsTable.$inferSelect;

export const DEFAULT_SETTINGS: Array<{
  key: string;
  value: string;
  label: string;
  description: string;
}> = [
  // ── Commission & Fees ──────────────────────────────────────────────────────
  {
    key: "default_commission_rate",
    value: "10.00",
    label: "Default Commission Rate (%)",
    description: "Commission % applied to all new vendor registrations",
  },

  // ── Referral Program ──────────────────────────────────────────────────────
  {
    key: "referral_referee_reward",
    value: "25.00",
    label: "Referee Wallet Reward (₹)",
    description: "Wallet credit given to a user who joins using a referral code",
  },
  {
    key: "referral_referrer_reward",
    value: "50.00",
    label: "Referrer Wallet Reward (₹)",
    description: "Wallet credit given to the user whose referral code was used",
  },

  // ── Wallet Limits ─────────────────────────────────────────────────────────
  {
    key: "min_wallet_topup",
    value: "100",
    label: "Minimum Wallet Top-up (₹)",
    description: "Minimum single top-up amount allowed for customer wallets",
  },
  {
    key: "max_wallet_topup",
    value: "100000",
    label: "Maximum Wallet Top-up (₹)",
    description: "Maximum single top-up amount allowed for customer wallets",
  },

  // ── Vendor Plan Limits (per tier) ─────────────────────────────────────────
  // Set to 999 = effectively unlimited while the platform is free.
  // Reduce these when pro tier billing is enabled to enforce limits.
  {
    key: "max_plans_basic",
    value: "999",
    label: "Max Subscription Plans — Basic Tier",
    description: "How many active subscription plans a basic (free) vendor can create. Set to a low number (e.g. 3) when pro billing goes live.",
  },
  {
    key: "max_plans_pro",
    value: "999",
    label: "Max Subscription Plans — Pro Tier",
    description: "How many active subscription plans a Pro vendor can create.",
  },
  {
    key: "max_plans_enterprise",
    value: "999",
    label: "Max Subscription Plans — Enterprise Tier",
    description: "How many active subscription plans an Enterprise vendor can create.",
  },

  // ── Vendor Tier Pricing ────────────────────────────────────────────────────
  // Set to 0 while the platform is free. Update these values and flip the
  // feature flag when you are ready to charge vendors for pro plans.
  {
    key: "vendor_pro_monthly_fee",
    value: "0",
    label: "Vendor Pro Plan — Monthly Fee (₹)",
    description: "Monthly subscription fee for Pro tier vendors. Set to 0 to offer Pro for free.",
  },
  {
    key: "vendor_enterprise_monthly_fee",
    value: "0",
    label: "Vendor Enterprise Plan — Monthly Fee (₹)",
    description: "Monthly subscription fee for Enterprise tier vendors. Set to 0 to offer for free.",
  },

  // ── Feature Flags ─────────────────────────────────────────────────────────
  // These act as kill switches. Flip "false" → "true" in this table to enable
  // a feature without any code change.
  {
    key: "feature_payment_gateway_enabled",
    value: "false",
    label: "Payment Gateway Enabled",
    description: "Enable Razorpay / UPI payment flows. Requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables to be set.",
  },
  {
    key: "feature_vendor_pro_tiers_enabled",
    value: "false",
    label: "Vendor Pro Tier Billing Enabled",
    description: "When true, enforce per-tier plan limits and show the upgrade CTA to basic vendors. Set to true when you are ready to charge vendors.",
  },
  {
    key: "feature_loyalty_redemption_enabled",
    value: "true",
    label: "Loyalty Points Redemption Enabled",
    description: "Allow customers to redeem loyalty points at checkout. Disable temporarily during migrations.",
  },
  {
    key: "feature_peer_delivery_enabled",
    value: "true",
    label: "Peer-to-Peer Delivery Enabled",
    description: "Show the peer delivery marketplace feature to customers.",
  },
  {
    key: "feature_referral_enabled",
    value: "true",
    label: "Referral Program Enabled",
    description: "Allow customers to refer friends and earn wallet credits.",
  },
];
