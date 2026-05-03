import { useState } from "react";
import { useGetVendorStats, useGetVendorRevenueTrend, useGetMyVendorProfile } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IndianRupee, TrendingUp, Percent, Wallet, ArrowDownRight, ArrowUpRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { format, parseISO } from "date-fns";

const TIER_COLORS: Record<string, string> = {
  basic: "bg-slate-100 text-slate-700 border-slate-200",
  pro: "bg-blue-100 text-blue-700 border-blue-200",
  enterprise: "bg-purple-100 text-purple-700 border-purple-200",
};

const TIER_NEXT_RATE: Record<string, { tier: string; rate: number } | null> = {
  basic: { tier: "Pro", rate: 8 },
  pro: { tier: "Enterprise", rate: 5 },
  enterprise: null,
};

export default function VendorEarnings() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  const { data: profileData, isLoading: profileLoading } = useGetMyVendorProfile();
  const vendor = profileData?.vendor;
  const vendorId = vendor?.id;
  const tier = vendor?.subscriptionTier || "basic";

  // Commission rate comes from the database — not hardcoded
  const commissionRate = vendor?.commissionRate
    ? parseFloat(String(vendor.commissionRate))
    : 10;

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
    Gross: parseFloat(point.revenue.toFixed(2)),
    Net: parseFloat((point.revenue * (1 - commissionRate / 100)).toFixed(2)),
  }));

  const nextTierInfo = TIER_NEXT_RATE[tier];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild className="lg:hidden shrink-0">
          <a href="/vendor/dashboard"><ArrowLeft className="w-5 h-5" /></a>
        </Button>
        <div className="flex-1 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Earnings</h1>
            <p className="text-muted-foreground mt-1">Your revenue, commission deductions, and net payouts.</p>
          </div>
          {vendor && (
            <Badge variant="outline" className={`shrink-0 text-sm px-3 py-1.5 ${TIER_COLORS[tier]}`}>
              {tier.charAt(0).toUpperCase() + tier.slice(1)} — {commissionRate}% commission
            </Badge>
          )}
        </div>
      </div>

      {/* KPI Cards */}
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
                <p className="text-xs text-muted-foreground mt-1">All time (all orders)</p>
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
                  <p className="text-xs text-muted-foreground">{(100 - commissionRate)}% retained</p>
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
            <CardDescription>Daily comparison of what you earn vs what you keep after platform commission</CardDescription>
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
          ) : chartData.length === 0 || chartData.every(d => d.Gross === 0) ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-2">
              <TrendingUp className="w-10 h-10 opacity-20" />
              <p>No revenue data yet for this period.</p>
              <p className="text-sm">Revenue will appear here once orders are delivered.</p>
            </div>
          ) : (
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                    formatter={(value: number, name: string) => [`₹${value.toFixed(0)}`, name]}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="Gross" stroke="#94a3b8" strokeWidth={2} fill="url(#grossGrad)" />
                  <Area type="monotone" dataKey="Net" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#netGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tier Upgrade Nudge — only shown if not on highest tier */}
      {nextTierInfo && (
        <Card className="shadow-sm border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <Percent className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-base mb-1">Lower your commission rate</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  You're on the <strong>{tier.charAt(0).toUpperCase() + tier.slice(1)}</strong> tier at <strong>{commissionRate}%</strong> commission.
                  Upgrade to <strong>{nextTierInfo.tier}</strong> to reduce it to <strong>{nextTierInfo.rate}%</strong> and keep more of your earnings.
                </p>
                <p className="text-xs text-muted-foreground">
                  On your current monthly revenue of ₹{monthlyGross.toLocaleString("en-IN", { maximumFractionDigits: 0 })},
                  that's an extra ₹{(monthlyGross * (commissionRate - nextTierInfo.rate) / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })} per month in your pocket.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
