import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetVendorStats, useGetTodayOrderSummary, useGetMyVendorProfile, useListOrders } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  IndianRupee, ShoppingBag, Users, Star, ArrowRight,
  CheckCircle2, Clock, AlertCircle, UtensilsCrossed, CalendarDays, CircleDashed, Zap, ClipboardList,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  useGetVendorRevenueTrend,
} from "@workspace/api-client-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { parseISO } from "date-fns";

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending:   { color: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "Pending" },
  accepted:  { color: "bg-blue-100 text-blue-800 border-blue-200",       label: "Accepted" },
  preparing: { color: "bg-orange-100 text-orange-800 border-orange-200", label: "Preparing" },
  packed:    { color: "bg-purple-100 text-purple-800 border-purple-200", label: "Packed" },
  picked_up: { color: "bg-indigo-100 text-indigo-800 border-indigo-200", label: "Picked Up" },
  delivered: { color: "bg-green-100 text-green-800 border-green-200",    label: "Delivered" },
  cancelled: { color: "bg-red-100 text-red-800 border-red-200",          label: "Cancelled" },
};

// ─── Setup checklist card ─────────────────────────────────────────────────────
function SetupChecklist({ vendorId }: { vendorId: string }) {
  const { data: menuData } = useQuery({
    queryKey: ["/api/vendors/menus/setup-check", vendorId],
    queryFn: () =>
      fetch(`/api/vendors/${vendorId}/menus`, { credentials: "include" }).then(r => r.json()),
    staleTime: 60_000,
  });
  const { data: plansData } = useQuery({
    queryKey: ["/api/vendors/plans/setup-check", vendorId],
    queryFn: () =>
      fetch(`/api/vendors/${vendorId}/plans`, { credentials: "include" }).then(r => r.json()),
    staleTime: 60_000,
  });

  const hasMenuItems = (menuData?.menuItems?.length ?? 0) > 0;
  const hasPlans     = (plansData?.plans?.length ?? 0) > 0;

  if (hasMenuItems && hasPlans) return null;

  const steps = [
    {
      done:  true,
      icon:  CheckCircle2,
      label: "Kitchen Profile",
      sub:   "Name, cuisine type, city and FSSAI details submitted.",
      href:  "/vendor/profile",
      cta:   "Edit Profile",
    },
    {
      done:  hasMenuItems,
      icon:  UtensilsCrossed,
      label: "Add Menu Items",
      sub:   hasMenuItems
        ? "Menu items are set up."
        : "List your tiffin meals so customers can see what you offer.",
      href:  "/vendor/menu",
      cta:   "Add Menu",
    },
    {
      done:  hasPlans,
      icon:  CalendarDays,
      label: "Create Subscription Plans",
      sub:   hasPlans
        ? "Subscription plans are live."
        : "Create daily/weekly/monthly plans that customers can subscribe to.",
      href:  "/vendor/plans",
      cta:   "Create Plan",
    },
  ];

  const doneCount = steps.filter(s => s.done).length;

  return (
    <Card className="shadow-sm border-l-4 border-l-amber-400 bg-amber-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Getting Started</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Complete these steps before customers can subscribe to your tiffin.
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 text-amber-700 border-amber-300 bg-amber-50">
            {doneCount}/{steps.length} done
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step) => {
            const Icon = step.done ? CheckCircle2 : CircleDashed;
            return (
              <div key={step.label} className={`flex items-start gap-4 p-3 rounded-lg border ${step.done ? "bg-green-50 border-green-200" : "bg-card border-border"}`}>
                <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${step.done ? "text-green-600" : "text-muted-foreground/40"}`} />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${step.done ? "line-through text-muted-foreground" : ""}`}>{step.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.sub}</p>
                </div>
                {!step.done && (
                  <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs" asChild>
                    <Link href={step.href}>{step.cta}</Link>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function VendorDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const { data: profileData, isLoading: profileLoading } = useGetMyVendorProfile();
  const vendor   = profileData?.vendor;
  const vendorId = vendor?.id;

  useEffect(() => {
    if (!profileLoading && !vendor) setLocation("/vendor/onboarding");
  }, [profileLoading, vendor, setLocation]);

  const { data: statsData,   isLoading: statsLoading   } = useGetVendorStats(vendorId ?? "", {
    query: { enabled: !!vendorId, queryKey: ["/api/vendors/stats", vendorId] }
  });
  const stats = statsData?.stats;

  const { data: summaryData, isLoading: summaryLoading } = useGetTodayOrderSummary(
    vendorId ? { vendorId } : undefined,
    { query: { enabled: !!vendorId, queryKey: ["/api/orders/today-summary", vendorId] } }
  );
  const summary = summaryData?.summary;

  const { data: recentOrdersData, isLoading: ordersLoading } = useListOrders(
    { vendorId },
    { query: { enabled: !!vendorId, queryKey: ["/api/orders/recent", vendorId] } }
  );
  const recentOrders = (recentOrdersData?.orders || []).slice(0, 5);

  const { data: trendData, isLoading: trendLoading } = useGetVendorRevenueTrend(vendorId ?? '', { period: "7d" }, {
    query: { enabled: !!vendorId, queryKey: ["/api/analytics/vendor/revenue", vendorId, "7d"] }
  });
  const trend = trendData?.trend || [];
  const formattedTrend = trend.map(point => ({
    ...point,
    displayDate: format(parseISO(point.date), "MMM d")
  }));

  const handleQuickAccept = async (orderId: string) => {
    setAcceptingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      });
      if (!res.ok) throw new Error("Failed to accept");
      toast({ title: "Order accepted" });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/today-summary", vendorId] });
    } catch {
      toast({ variant: "destructive", title: "Could not accept order", description: "Please try from the Orders page." });
    } finally {
      setAcceptingId(null);
    }
  };

  if (profileLoading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const isPending = vendor?.status === "pending";

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">
            {isPending ? "Your kitchen is pending approval." : "Here's what's happening in your kitchen today."}
          </p>
        </div>
      </div>

      {/* Pending approval banner */}
      {isPending && (
        <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-800">Your kitchen is under review</p>
            <p className="text-sm text-yellow-700 mt-0.5">
              Our team will review and approve your kitchen profile within 24 hours.
              You can set up your menu and plans while you wait.
            </p>
          </div>
        </div>
      )}

      {/* Onboarding checklist — only shown when setup is incomplete */}
      {vendorId && <SetupChecklist vendorId={vendorId} />}

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Today's Orders</p>
              <ShoppingBag className="h-4 w-4 text-primary" />
            </div>
            {statsLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-3xl font-bold">{stats?.todayOrders || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
              <IndianRupee className="h-4 w-4 text-green-500" />
            </div>
            {statsLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-3xl font-bold">₹{(stats?.monthlyRevenue ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
            )}
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Active Subscribers</p>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            {statsLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-3xl font-bold">{stats?.activeSubscriptions || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Avg Rating</p>
              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
            </div>
            {statsLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-3xl font-bold">{vendor?.rating ? parseFloat(String(vendor.rating)).toFixed(1) : "N/A"}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Insights Chart */}
      {!isPending && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Weekly Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : trend.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground bg-muted/5 rounded-lg border border-dashed text-sm">
                Complete your first delivery to see revenue trends!
              </div>
            ) : (
              <div className="h-[200px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="displayDate" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
                      dy={10}
                    />
                    <YAxis 
                      hide
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value: number) => [`₹${value}`, 'Revenue']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                      activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Today's Production */}
        <Card className="lg:col-span-1 shadow-sm h-fit">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Today's Production</CardTitle>
            {vendorId && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 shrink-0" asChild>
                <Link href="/vendor/delivery-sheet">
                  <ClipboardList className="w-3 h-3" />
                  Sheet
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : summary && summary.totalOrders > 0 ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">By Status</h4>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
                    <span className="flex items-center gap-2 font-medium"><Clock className="w-4 h-4" /> Pending</span>
                    <span className="font-bold text-lg">{summary.pendingCount || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 text-green-800 rounded-lg border border-green-200">
                    <span className="flex items-center gap-2 font-medium"><CheckCircle2 className="w-4 h-4" /> Delivered</span>
                    <span className="font-bold text-lg">{summary.deliveredCount || 0}</span>
                  </div>
                </div>
                {Object.keys(summary.byMealType || {}).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">By Meal Type</h4>
                    {Object.entries(summary.byMealType).map(([type, cnt]) => (
                      <div key={type} className="flex justify-between items-center py-2 border-b last:border-0">
                        <span className="capitalize">{type}</span>
                        <span className="font-semibold">{cnt}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-6">No orders scheduled for today</p>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Recent Orders */}
          <Card className="shadow-sm flex-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Recent Orders</CardTitle>
                {summary && (summary.pendingCount ?? 0) > 0 && (
                  <p className="text-xs text-amber-700 mt-0.5 font-medium">
                    {summary.pendingCount ?? 0} order{(summary.pendingCount ?? 0) !== 1 ? "s" : ""} waiting for your acceptance
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {summary && (summary.pendingCount ?? 0) > 1 && (
                  <Button size="sm" variant="outline" className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50" asChild>
                    <Link href="/vendor/orders?status=pending">
                      <Zap className="w-3 h-3 mr-1" /> Manage Pending
                    </Link>
                  </Button>
                )}
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/vendor/orders" className="text-primary">
                    View All <ArrowRight className="ml-1 w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Meal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-7 w-16 rounded-md" /></TableCell>
                      </TableRow>
                    ))
                  ) : recentOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No orders yet. Once customers subscribe, orders will appear here.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentOrders.map(order => {
                      const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.customerName || "Customer"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(order.scheduledDate), "MMM d")}
                          </TableCell>
                          <TableCell className="capitalize text-sm">{order.mealType || "Standard"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs border ${config.color}`}>
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {order.status === "pending" && (
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs"
                                disabled={acceptingId === order.id}
                                onClick={() => handleQuickAccept(order.id)}
                              >
                                {acceptingId === order.id ? "..." : "Accept"}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
