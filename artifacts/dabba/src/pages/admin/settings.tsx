import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings2, Percent, IndianRupee, Users, Save, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
];

const UNIT: Record<string, string> = {
  default_commission_rate: "%",
  referral_referee_reward: "₹",
  referral_referrer_reward: "₹",
  min_wallet_topup: "₹",
  max_wallet_topup: "₹",
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
          Configure global defaults for commission rates, referral rewards, and wallet limits.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
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

            return (
              <Card key={group.title}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <GroupIcon className="w-4 h-4 text-primary" />
                    {group.title}
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
                    const unit = UNIT[key] ?? "";
                    const unitIsPrefix = unit === "₹";
                    return (
                      <div key={key} className="space-y-1.5">
                        <Label htmlFor={key} className="text-sm font-medium">
                          {s?.label ?? key}
                        </Label>
                        {s?.description && (
                          <p className="text-xs text-muted-foreground">{s.description}</p>
                        )}
                        <div className="flex items-center gap-2 max-w-xs">
                          {unitIsPrefix && (
                            <span className="text-sm font-medium text-muted-foreground w-5 shrink-0">₹</span>
                          )}
                          <Input
                            id={key}
                            type="number"
                            step="0.01"
                            min="0"
                            value={draft[key] ?? ""}
                            onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))}
                            className="font-mono"
                          />
                          {!unitIsPrefix && unit && (
                            <Badge variant="secondary" className="text-xs shrink-0">{unit}</Badge>
                          )}
                        </div>
                        {s && draft[key] !== s.value && (
                          <p className="text-xs text-amber-600">
                            Unsaved — was {s.value}
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
