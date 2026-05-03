import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGetPlatformOverview } from "@workspace/api-client-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar,
} from "recharts";
import { format, parseISO } from "date-fns";
import { TrendingUp, Percent, Store, Users, IndianRupee } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

type TrendPoint = { date: string; revenue: number; orders: number; commission: number };

export default function AdminAnalytics() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  const { data: overviewData, isLoading: overviewLoading } = useGetPlatformOverview();
  const overview = overviewData?.overview;

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ["/api/analytics/platform/revenue", period],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/platform/revenue?period=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch platform revenue");
      return res.json() as Promise<{ trend: TrendPoint[] }>;
    },
  });

  const trend = trendData?.trend || [];
  const formattedTrend = trend.map(p => ({
    ...p,
    displayDate: format(parseISO(p.date), "MMM d"),
    GMV: parseFloat(p.revenue.toFixed(2)),
    Commission: parseFloat(p.commission.toFixed(2)),
  }));

  // Top days by revenue
  const topDays = [...trend]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 7)
    .map(p => ({ ...p, displayDate: format(parseISO(p.date), "MMM d") }));

  const totalGMV = trend.reduce((sum, p) => sum + p.revenue, 0);
  const totalCommission = trend.reduce((sum, p) => sum + p.commission, 0);
  const totalOrders = trend.reduce((sum, p) => sum + p.orders, 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Platform Analytics</h1>
          <p className="text-muted-foreground mt-1">Revenue, commissions, and platform health metrics.</p>
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
      </div>

      {/* Period KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-sm border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground pb-2">Period GMV</p>
            {trendLoading ? <Skeleton className="h-8 w-28" /> : (
              <>
                <div className="text-3xl font-bold">₹{totalGMV.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                <p className="text-xs text-muted-foreground mt-1">Gross merchandise value</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground pb-2">Period Commission</p>
            {trendLoading ? <Skeleton className="h-8 w-24" /> : (
              <>
                <div className="text-3xl font-bold text-primary">₹{totalCommission.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalGMV > 0 ? ((totalCommission / totalGMV) * 100).toFixed(1) : "0"}% of GMV
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground pb-2">Period Orders</p>
            {trendLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-3xl font-bold">{totalOrders}</div>
                <p className="text-xs text-muted-foreground mt-1">Delivered orders</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground pb-2">Active Subscriptions</p>
            {overviewLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-3xl font-bold">{overview?.activeSubscriptions ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">{overview?.totalCustomers ?? 0} total customers</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue + Commission Area Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>GMV vs Commission Revenue</CardTitle>
          <CardDescription>Daily gross merchandise value against platform commission earned</CardDescription>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : formattedTrend.every(p => p.GMV === 0) ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-2">
              <TrendingUp className="w-10 h-10 opacity-20" />
              <p>No delivered orders in this period.</p>
            </div>
          ) : (
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="commissionGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={v => `₹${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                    formatter={(v: number, name: string) => [`₹${v.toFixed(0)}`, name]}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="GMV" stroke="#94a3b8" strokeWidth={2} fill="url(#gmvGrad)" />
                  <Area type="monotone" dataKey="Commission" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#commissionGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Revenue Days */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Top Revenue Days</CardTitle>
            <CardDescription>Highest GMV days in the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : topDays.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground">No data yet</div>
            ) : (
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topDays} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                      formatter={(v: number) => [`₹${v.toFixed(0)}`, "Revenue"]}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform health snapshot */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Platform Snapshot</CardTitle>
            <CardDescription>Current state of the platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {overviewLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : (
              [
                { label: "Total Kitchens", value: overview?.totalVendors ?? 0, sub: `${overview?.activeVendors ?? 0} live · ${overview?.pendingVendorApprovals ?? 0} pending`, icon: Store, color: "text-orange-500" },
                { label: "Total Customers", value: overview?.totalCustomers ?? 0, sub: `${overview?.activeSubscriptions ?? 0} with active subscriptions`, icon: Users, color: "text-blue-500" },
                { label: "All-Time GMV", value: `₹${(overview?.platformGMV ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, sub: "Gross merchandise value", icon: IndianRupee, color: "text-green-500" },
                { label: "All-Time Commission", value: `₹${(overview?.commissionRevenue ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, sub: "Platform revenue earned", icon: Percent, color: "text-primary" },
                { label: "Today's Orders", value: overview?.totalOrdersToday ?? 0, sub: "Scheduled for today", icon: TrendingUp, color: "text-purple-500" },
              ].map(({ label, value, sub, icon: Icon, color }) => (
                <div key={label} className="flex items-center gap-4 p-3 rounded-lg border bg-muted/20">
                  <div className={`w-8 h-8 rounded-lg bg-card border flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground truncate">{sub}</p>
                  </div>
                  <div className="font-bold text-lg shrink-0">{value}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
