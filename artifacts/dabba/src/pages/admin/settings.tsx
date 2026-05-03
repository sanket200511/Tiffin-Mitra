import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings2, Percent, IndianRupee, Users, Save, RotateCcw,
  Layers3, ToggleLeft, Crown,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Setting = {
  key: string;
  value: string;
  label: string | null;
  description: string | null;
  updatedAt: string;
};

type SettingGroup = {
  title: string;
  description: string;
  icon: React.ElementType;
  keys: string[];
  type?: "mixed";
};

const GROUPS: SettingGroup[] = [
  {
    title: "Commission & Fees",
    description: "Default platform fees applied to vendor earnings",
    icon: Percent,
    keys: ["default_commission_rate"],
  },
  {
    title: "Referral Program",
    description: "Wallet rewards paid out when customers refer friends",
    icon: Users,
    keys: ["referral_referee_reward", "referral_referrer_reward"],
  },
  {
    title: "Wallet Top-up Limits",
    description: "Minimum and maximum single top-up amounts for customers",
    icon: IndianRupee,
    keys: ["min_wallet_topup", "max_wallet_topup"],
  },
  {
    title: "Vendor Tier Pricing",
    description: "Monthly fees charged to vendors on paid tiers. Set to 0 to offer tiers for free during early access.",
    icon: Crown,
    keys: ["vendor_pro_monthly_fee", "vendor_enterprise_monthly_fee"],
  },
  {
    title: "Vendor Plan Limits",
    description: "Maximum active subscription plans each tier can create. Set to 999 to allow unlimited (recommended during free period).",
    icon: Layers3,
    keys: ["max_plans_basic", "max_plans_pro", "max_plans_enterprise"],
  },
  {
    title: "Feature Flags",
    description: "Toggle platform features on or off. Changes take effect immediately — no deploy required.",
    icon: ToggleLeft,
    keys: [
      "feature_payment_gateway_enabled",
      "feature_vendor_pro_tiers_enabled",
      "feature_loyalty_redemption_enabled",
      "feature_peer_delivery_enabled",
      "feature_referral_enabled",
    ],
    type: "mixed",
  },
];

// Keys that are stored as boolean strings ("true" / "false")
const BOOLEAN_KEYS = new Set([
  "feature_payment_gateway_enabled",
  "feature_vendor_pro_tiers_enabled",
  "feature_loyalty_redemption_enabled",
  "feature_peer_delivery_enabled",
  "feature_referral_enabled",
]);

const UNIT: Record<string, string> = {
  default_commission_rate: "%",
  referral_referee_reward: "₹",
  referral_referrer_reward: "₹",
  min_wallet_topup: "₹",
  max_wallet_topup: "₹",
  vendor_pro_monthly_fee: "₹",
  vendor_enterprise_monthly_fee: "₹",
};

export default function AdminSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery<{ settings: Setting[] }>({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const settings = data?.settings ?? [];
  const settingMap = Object.fromEntries(settings.map(s => [s.key, s]));

  useEffect(() => {
    if (settings.length > 0) {
      const initial: Record<string, string> = {};
      for (const s of settings) initial[s.key] = s.value;
      setDraft(initial);
    }
  }, [settings.length]);

  const save = useMutation({
    mutationFn: async (updates: Record<string, string>) => {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json() as Promise<{ settings: Setting[] }>;
    },
    onSuccess: () => {
      toast({ title: "Settings saved", description: "Platform settings have been updated." });
      void qc.invalidateQueries({ queryKey: ["/api/admin/settings"] });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Save failed", description: "Could not update settings." });
    },
  });

  const handleGroupSave = (group: SettingGroup) => {
    const updates: Record<string, string> = {};
    for (const key of group.keys) {
      const val = draft[key];
      if (val !== undefined) updates[key] = val;
    }
    save.mutate(updates);
  };

  const handleReset = (group: SettingGroup) => {
    setDraft(prev => {
      const next = { ...prev };
      for (const key of group.keys) {
        if (settingMap[key]) next[key] = settingMap[key].value;
      }
      return next;
    });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-primary" />
          Platform Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure global defaults. Changes take effect immediately — no server restart needed.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {GROUPS.map(group => {
            const GroupIcon = group.icon;
            const groupSettings = group.keys.map(k => settingMap[k]).filter(Boolean);
            const lastUpdated = groupSettings.reduce((latest, s) => {
              if (!latest) return s.updatedAt;
              return s.updatedAt > latest ? s.updatedAt : latest;
            }, null as string | null);

            const hasUnsavedChanges = group.keys.some(
              k => settingMap[k] && draft[k] !== settingMap[k]?.value,
            );

            return (
              <Card key={group.title}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <GroupIcon className="w-4 h-4 text-primary" />
                    {group.title}
                    {hasUnsavedChanges && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 ml-auto">
                        Unsaved changes
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{group.description}</CardDescription>
                  {lastUpdated && (
                    <p className="text-xs text-muted-foreground">
                      Last updated {format(new Date(lastUpdated), "d MMM yyyy, h:mm a")}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-5">
                  {group.keys.map(key => {
                    const s = settingMap[key];
                    const isBool = BOOLEAN_KEYS.has(key);
                    const unit = UNIT[key] ?? "";
                    const unitIsPrefix = unit === "₹";
                    const currentVal = draft[key] ?? "";

                    return (
                      <div key={key} className="space-y-1.5">
                        <div className={isBool ? "flex items-center justify-between" : ""}>
                          <div>
                            <Label htmlFor={key} className="text-sm font-medium">
                              {s?.label ?? key}
                            </Label>
                            {s?.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                            )}
                          </div>
                          {isBool ? (
                            <Switch
                              id={key}
                              checked={currentVal === "true"}
                              onCheckedChange={checked =>
                                setDraft(prev => ({ ...prev, [key]: checked ? "true" : "false" }))
                              }
                            />
                          ) : (
                            <div className="flex items-center gap-2 max-w-xs mt-1.5">
                              {unitIsPrefix && (
                                <span className="text-sm font-medium text-muted-foreground w-5 shrink-0">₹</span>
                              )}
                              <Input
                                id={key}
                                type="number"
                                step="0.01"
                                min="0"
                                value={currentVal}
                                onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))}
                                className="font-mono"
                              />
                              {!unitIsPrefix && unit && (
                                <Badge variant="secondary" className="text-xs shrink-0">{unit}</Badge>
                              )}
                            </div>
                          )}
                        </div>
                        {s && currentVal !== s.value && (
                          <p className="text-xs text-amber-600">
                            Unsaved — was{" "}
                            {isBool
                              ? s.value === "true" ? "enabled" : "disabled"
                              : s.value}
                          </p>
                        )}
                      </div>
                    );
                  })}

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      onClick={() => handleGroupSave(group)}
                      disabled={save.isPending}
                      className="gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {save.isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-muted-foreground"
                      onClick={() => handleReset(group)}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
