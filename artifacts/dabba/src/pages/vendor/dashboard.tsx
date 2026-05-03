import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useGetVendorStats, useGetTodayOrderSummary, useGetMyVendorProfile, useListOrders } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IndianRupee, ShoppingBag, Users, Star, ArrowRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";


const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "Pending" },
  accepted: { color: "bg-blue-100 text-blue-800 border-blue-200", label: "Accepted" },
  preparing: { color: "bg-orange-100 text-orange-800 border-orange-200", label: "Preparing" },
  packed: { color: "bg-purple-100 text-purple-800 border-purple-200", label: "Packed" },
  picked_up: { color: "bg-indigo-100 text-indigo-800 border-indigo-200", label: "Picked Up" },
  delivered: { color: "bg-green-100 text-green-800 border-green-200", label: "Delivered" },
  cancelled: { color: "bg-red-100 text-red-800 border-red-200", label: "Cancelled" },
};

export default function VendorDashboard() {
  const [, setLocation] = useLocation();

  const { data: profileData, isLoading: profileLoading } = useGetMyVendorProfile();
  const vendor = profileData?.vendor;
  const vendorId = vendor?.id;

  // If profile loaded and no vendor record exists, redirect to onboarding
  useEffect(() => {
    if (!profileLoading && !vendor) {
      setLocation("/vendor/onboarding");
    }
  }, [profileLoading, vendor, setLocation]);

  const { data: statsData, isLoading: statsLoading } = useGetVendorStats(vendorId ?? "", {
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

  // Pending approval notice
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
              <div className="text-3xl font-bold">₹{stats?.monthlyRevenue?.toLocaleString("en-IN", { maximumFractionDigits: 0 }) || 0}</div>
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

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Today's Production */}
        <Card className="lg:col-span-1 shadow-sm h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Today's Production</CardTitle>
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
                    {Object.entries(summary.byMealType).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center py-2 border-b last:border-0">
                        <span className="capitalize">{type}</span>
                        <span className="font-semibold">{count}</span>
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
              <CardTitle className="text-lg">Recent Orders</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/vendor/orders" className="text-primary">
                  View All <ArrowRight className="ml-1 w-4 h-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table className="min-w-[400px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Meal</TableHead>
                    <TableHead>Status</TableHead>
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
                      </TableRow>
                    ))
                  ) : recentOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
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
