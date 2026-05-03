import { Badge } from "@/components/ui/badge";
import { Crown, Layers3, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type Tier = "basic" | "pro" | "enterprise" | string | null | undefined;

const TIER_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  className: string;
}> = {
  basic: {
    label: "Basic",
    icon: Zap,
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  pro: {
    label: "Pro",
    icon: Crown,
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  enterprise: {
    label: "Enterprise",
    icon: Layers3,
    className: "bg-violet-50 text-violet-700 border-violet-200",
  },
};

interface TierBadgeProps {
  tier: Tier;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "default";
}

export function TierBadge({
  tier,
  className,
  showIcon = true,
  size = "default",
}: TierBadgeProps) {
  const config = TIER_CONFIG[tier ?? "basic"] ?? TIER_CONFIG.basic;
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium capitalize border",
        config.className,
        size === "sm" ? "text-[10px] px-1.5 py-0 gap-1" : "text-xs px-2 py-0.5 gap-1.5",
        className,
      )}
    >
      {showIcon && <Icon className={size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"} />}
      {config.label}
    </Badge>
  );
}

/** Returns true when the vendor is on a paid/upgraded tier */
export function isPaidTier(tier: Tier): boolean {
  return tier === "pro" || tier === "enterprise";
}
