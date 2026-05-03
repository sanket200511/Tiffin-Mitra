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
  {
    key: "default_commission_rate",
    value: "10.00",
    label: "Default Commission Rate (%)",
    description: "Commission % applied to all new vendor registrations",
  },
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
];
