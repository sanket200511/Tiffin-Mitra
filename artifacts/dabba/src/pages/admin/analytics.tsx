import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGetPlatformOverview } from "@workspace/api-client-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, Cell,
} from "recharts";
import { format, parseISO } from "date-fns";
import {
  TrendingUp, Percent, Store, Users, IndianRupee,
  Download, TrendingDown, RefreshCw, AlertTriangle,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type TrendPoint = { date: string; revenue: number; orders: number; commission: number };
type TopVendor = { vendorId: string; vendorName: string; city: string; gmv: number; orders: number; commission: number };
type CityRevenue = { city: string; revenue: number; orders: number };
type ChurnStats = { churned: number; active: number; expiringSoon: number; newThisPeriod: number; churnRate: number };

const CITY_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#a78bfa",
  "#34d399",
  "#fb923c",
];

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

  const { data: topVendorData, isLoading: topVendorLoading } = useQuery({
    queryKey: ["/api/analytics/platform/top-vendors", period],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/platform/top-vendors?period=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ vendors: TopVendor[] }>;
    },
  });

  const { data: cityData, isLoading: cityLoading } = useQuery({
    queryKey: ["/api/analytics/platform/city-revenue", period],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/platform/city-revenue?period=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ cities: CityRevenue[] }>;
    },
  });

  const { data: churnData, isLoading: churnLoading } = useQuery({
    queryKey: ["/api/analytics/platform/churn", period],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/platform/churn?period=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<ChurnStats>;
    },
  });

  const trend = trendData?.trend || [];
  const formattedTrend = trend.map(p => ({
    ...p,
    displayDate: format(parseISO(p.date), "MMM d"),
    GMV: parseFloat(p.revenue.toFixed(2)),
    Commission: parseFloat(p.commission.toFixed(2)),
  }));

  const topDays = [...trend]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 7)
    .map(p => ({ ...p, displayDate: format(parseISO(p.date), "MMM d") }));

  const totalGMV = trend.reduce((sum, p) => sum + p.revenue, 0);
  const totalCommission = trend.reduce((sum, p) => sum + p.commission, 0);
  const totalOrders = trend.reduce((sum, p) => sum + p.orders, 0);

  const topVendors = topVendorData?.vendors ?? [];
  const cities = cityData?.cities ?? [];

  // CSV Export
  const exportCSV = useCallback(() => {
    if (!trend.length) return;
    const headers = ["Date", "GMV (₹)", "Commission (₹)", "Orders"];
    const rows = trend.map(p => [
      p.date,
      p.revenue.toFixed(2),
      p.commission.toFixed(2),
      p.orders,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dabba-analytics-${period}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [trend, period]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Platform Analytics</h1>
          <p className="text-muted-foreground mt-1">Revenue, commissions, and platform health metrics.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV} disabled={!trend.length}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <div className="w-36">
            <Select value={period} onValueChange={(v: "7d" | "30d" | "90d") => setPeriod(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                <div className="text-3xl font-bold">{totalOrders.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Delivered orders</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className={`shadow-sm border-l-4 ${(churnData?.churnRate ?? 0) > 10 ? "border-l-red-500" : "border-l-amber-500"}`}>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground pb-2">Churn Rate</p>
            {churnLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className={`text-3xl font-bold ${(churnData?.churnRate ?? 0) > 10 ? "text-red-600" : "text-amber-600"}`}>
                  {churnData?.churnRate ?? 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {churnData?.churned ?? 0} cancelled · {churnData?.expiringSoon ?? 0} expiring soon
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subscription health strip */}
      {!churnLoading && churnData && (
        <div className="grid sm:grid-cols-4 gap-4">
          {[
            { label: "Active Subscriptions", value: churnData.active, color: "text-green-600", bg: "bg-green-50 border-green-200" },
            { label: "New This Period", value: churnData.newThisPeriod, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
            { label: "Expiring This Week", value: churnData.expiringSoon, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
            { label: "Cancelled This Period", value: churnData.churned, color: "text-red-600", bg: "bg-red-50 border-red-200" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-lg border px-4 py-3 ${bg} flex items-center justify-between`}>
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold font-serif ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

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

      {/* City revenue + Platform Snapshot */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Revenue by City</CardTitle>
            <CardDescription>GMV breakdown across delivery cities in this period</CardDescription>
          </CardHeader>
          <CardContent>
            {cityLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : cities.length === 0 ? (
              <div className="h-[260px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <RefreshCw className="w-8 h-8 opacity-20" />
                <p>No city data yet for this period.</p>
              </div>
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cities.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="city" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} width={80} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                      formatter={(v: number) => [`₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, "Revenue"]}
                    />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]} name="Revenue">
                      {cities.slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={CITY_COLORS[i % CITY_COLORS.length]} />
                      ))}
                    </Bar>
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
                  <div className="w-8 h-8 rounded-lg bg-card border flex items-center justify-center shrink-0">
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

      {/* Top Revenue Days Bar Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Top Revenue Days</CardTitle>
          <CardDescription>Highest GMV days in the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : topDays.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">No data yet</div>
          ) : (
            <div className="h-[200px] w-full">
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

      {/* Top Vendors Table */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Top Kitchens by GMV</CardTitle>
            <CardDescription>Best-performing vendors in the selected period</CardDescription>
          </div>
          {topVendors.length > 0 && (
            <Badge variant="secondary" className="shrink-0">{topVendors.length} vendors</Badge>
          )}
        </CardHeader>
        <CardContent>
          {topVendorLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : topVendors.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Store className="w-10 h-10 opacity-20" />
              <p>No vendor orders in this period.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Kitchen</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">GMV</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topVendors.map((v, i) => (
                  <TableRow key={v.vendorId}>
                    <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{v.vendorName}</TableCell>
                    <TableCell className="text-muted-foreground">{v.city || "—"}</TableCell>
                    <TableCell className="text-right">{v.orders.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ₹{v.gmv.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right text-primary font-medium">
                      ₹{v.commission.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Churn Alert */}
      {!churnLoading && churnData && churnData.churnRate > 15 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">High churn detected</p>
            <p className="text-sm text-red-700 mt-0.5">
              {churnData.churned} subscriptions were cancelled in this period ({churnData.churnRate}% churn rate).
              Consider proactive retention outreach for the {churnData.expiringSoon} subscriptions expiring this week.
            </p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 border-red-300 text-red-700 hover:bg-red-100 ml-auto" asChild>
            <a href="/admin/subscriptions">View Subscriptions</a>
          </Button>
        </div>
      )}
    </div>
  );
}
