import { useState } from "react";
import { useGetVendorStats, useGetVendorRevenueTrend, useGetMyVendorProfile } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IndianRupee, TrendingUp, Percent, Wallet, ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { format, parseISO } from "date-fns";

const COMMISSION_BY_TIER: Record<string, number> = {
  basic: 10,
  pro: 8,
  enterprise: 5,
};

export default function VendorEarnings() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  const { data: profileData, isLoading: profileLoading } = useGetMyVendorProfile();
  const vendor = profileData?.vendor;
  const vendorId = vendor?.id;
  const tier = vendor?.subscriptionTier || "basic";
  const commissionRate = COMMISSION_BY_TIER[tier] ?? 10;

  const { data: statsData, isLoading: statsLoading } = useGetVendorStats(vendorId ?? "", {
    query: { enabled: !!vendorId, queryKey: ["/api/vendors/stats", vendorId] }
  });
  const stats = statsData?.stats;

  const { data: trendData, isLoading: trendLoading } = useGetVendorRevenueTrend(vendorId ?? "", { period }, {
    query: { enabled: !!vendorId, queryKey: ["/api/analytics/vendor/revenue/earnings", vendorId, { period }] }
  });
  const trend = trendData?.trend || [];

  const isLoading = profileLoading || statsLoading;

  const grossRevenue = stats?.totalRevenue ?? 0;
  const commissionAmount = grossRevenue * (commissionRate / 100);
  const netEarnings = grossRevenue - commissionAmount;
  const monthlyGross = stats?.monthlyRevenue ?? 0;
  const monthlyNet = monthlyGross * (1 - commissionRate / 100);

  const chartData = trend.map(point => ({
    displayDate: format(parseISO(point.date), "MMM d"),
    gross: point.revenue,
    net: point.revenue * (1 - commissionRate / 100),
    commission: point.revenue * (commissionRate / 100),
  }));

  const TIER_COLORS: Record<string, string> = {
    basic: "bg-slate-100 text-slate-700 border-slate-200",
    pro: "bg-blue-100 text-blue-700 border-blue-200",
    enterprise: "bg-purple-100 text-purple-700 border-purple-200",
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Earnings</h1>
          <p className="text-muted-foreground mt-1">Your revenue, commission deductions, and net payouts.</p>
        </div>
        {vendor && (
          <Badge variant="outline" className={`text-sm px-3 py-1 ${TIER_COLORS[tier]}`}>
            {tier.charAt(0).toUpperCase() + tier.slice(1)} — {commissionRate}% commission
          </Badge>
        )}
      </div>

      {/* KPI Summary */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-sm border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Gross Revenue</p>
              <IndianRupee className="h-4 w-4 text-green-500" />
            </div>
            {isLoading ? <Skeleton className="h-8 w-28" /> : (
              <>
                <div className="text-3xl font-bold">₹{grossRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                <p className="text-xs text-muted-foreground mt-1">All time orders</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-red-400">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Platform Commission</p>
              <Percent className="h-4 w-4 text-red-400" />
            </div>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <>
                <div className="text-3xl font-bold text-red-500">₹{commissionAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowDownRight className="w-3 h-3 text-red-400" />
                  <p className="text-xs text-muted-foreground">{commissionRate}% of gross</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Net Earnings</p>
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            {isLoading ? <Skeleton className="h-8 w-28" /> : (
              <>
                <div className="text-3xl font-bold text-primary">₹{netEarnings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="w-3 h-3 text-green-500" />
                  <p className="text-xs text-muted-foreground">{(100 - commissionRate)}% of gross</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">This Month (Net)</p>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <>
                <div className="text-3xl font-bold">₹{monthlyNet.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                <p className="text-xs text-muted-foreground mt-1">After {commissionRate}% platform fee</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Gross vs Net Revenue</CardTitle>
            <CardDescription>Daily comparison of what you earn vs what you keep</CardDescription>
          </div>
          <div className="w-36">
            <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">No revenue data yet</div>
          ) : (
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                    formatter={(value: number, name: string) => [`₹${value.toFixed(0)}`, name === "gross" ? "Gross Revenue" : "Net Earnings"]}
                  />
                  <Area type="monotone" dataKey="gross" stroke="hsl(var(--chart-2))" strokeWidth={2} fill="url(#grossGrad)" name="gross" />
                  <Area type="monotone" dataKey="net" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#netGrad)" name="net" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tier Upgrade Notice */}
      {tier !== "enterprise" && (
        <Card className="shadow-sm border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <Percent className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-base mb-1">Lower your commission rate</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  You're currently on the <strong>{tier}</strong> tier at <strong>{commissionRate}%</strong> commission.
                  {tier === "basic" && " Upgrade to Pro to reduce it to 8%, or Enterprise for just 5%."}
                  {tier === "pro" && " Upgrade to Enterprise to reduce it to just 5%."}
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  {tier === "basic" && (
                    <>
                      <div className="flex items-center gap-1 text-blue-600 font-medium">
                        Pro Plan → 8% commission (save {commissionRate - 8}%)
                      </div>
                      <div className="flex items-center gap-1 text-purple-600 font-medium">
                        Enterprise → 5% commission (save {commissionRate - 5}%)
                      </div>
                    </>
                  )}
                  {tier === "pro" && (
                    <div className="flex items-center gap-1 text-purple-600 font-medium">
                      Enterprise → 5% commission (save {commissionRate - 5}%)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
