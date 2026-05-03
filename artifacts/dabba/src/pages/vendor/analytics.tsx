import { useState } from "react";
import { 
  useGetVendorRevenueTrend, 
  useGetPopularDishes, 
  useGetSubscriptionHealth, 
  useGetMyVendorProfile 
} from "@workspace/api-client-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { format, parseISO } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function VendorAnalytics() {
  const { data: profileData } = useGetMyVendorProfile();
  const vendorId = profileData?.vendor?.id;

  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  const { data: trendData, isLoading: trendLoading } = useGetVendorRevenueTrend(vendorId ?? '', { period }, {
    query: { enabled: !!vendorId, queryKey: ["/api/analytics/vendor/revenue", vendorId, { period }] }
  });
  
  const { data: dishesData, isLoading: dishesLoading } = useGetPopularDishes(vendorId ?? '', {
    query: { enabled: !!vendorId, queryKey: ["/api/analytics/vendor/dishes", vendorId] }
  });

  const { data: healthData, isLoading: healthLoading } = useGetSubscriptionHealth(vendorId ?? '', {
    query: { enabled: !!vendorId, queryKey: ["/api/analytics/vendor/subscriptions/health", vendorId] }
  });

  const trend = trendData?.trend || [];
  const dishes = dishesData?.dishes || [];
  const health = healthData?.health;

  // Format data for charts
  const formattedTrend = trend.map(point => ({
    ...point,
    displayDate: format(parseISO(point.date), "MMM d")
  }));

  const pieData = health ? [
    { name: 'Active', value: health.active },
    { name: 'Paused', value: health.paused },
    { name: 'Expired', value: health.expired },
    { name: 'Cancelled', value: health.cancelled },
  ].filter(d => d.value > 0) : [];

  const totalRevenue = trend.reduce((sum, p) => sum + p.revenue, 0);
  const totalOrders = trend.reduce((sum, p) => sum + p.orders, 0);
  const avgDaily = trend.length > 0 ? totalRevenue / trend.length : 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Track your kitchen's performance and growth.</p>
        </div>
      </div>

      {/* Period KPI strip */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Period Revenue", value: trendLoading ? null : `₹${totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, sub: `Last ${period === "7d" ? "7" : period === "30d" ? "30" : "90"} days`, color: "border-l-green-500" },
          { label: "Period Orders", value: trendLoading ? null : String(totalOrders), sub: "Delivered orders", color: "border-l-blue-500" },
          { label: "Avg Daily Revenue", value: trendLoading ? null : `₹${avgDaily.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, sub: "Per day in period", color: "border-l-primary" },
        ].map(({ label, value, sub, color }) => (
          <Card key={label} className={`shadow-sm border-l-4 ${color}`}>
            <CardContent className="p-5">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              {value === null ? (
                <Skeleton className="h-8 w-24 mt-1" />
              ) : (
                <>
                  <p className="text-2xl font-bold mt-1">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Daily revenue over time</CardDescription>
            </div>
            <div className="w-32">
              <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
            ) : trend.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data available</div>
            ) : (
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="displayDate" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value: number) => [`₹${value}`, 'Revenue']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Health */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Subscription Health</CardTitle>
            <CardDescription>Current state of your subscribers</CardDescription>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : pieData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">No data available</div>
            ) : (
              <>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {health?.retentionRate !== undefined && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">Retention Rate</p>
                    <p className="text-2xl font-bold text-primary">{health.retentionRate.toFixed(1)}%</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Popular Dishes */}
        <Card className="lg:col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle>Popular Dishes</CardTitle>
            <CardDescription>Most frequently ordered items from your menu</CardDescription>
          </CardHeader>
          <CardContent>
            {dishesLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : dishes.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data available</div>
            ) : (
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dishes} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" axisLine={false} tickLine={false} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                      width={100}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      cursor={{ fill: 'hsl(var(--muted))' }}
                    />
                    <Bar dataKey="orderCount" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} barSize={24} name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
