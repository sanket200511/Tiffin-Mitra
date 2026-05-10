import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, Store, MapPin, ChefHat, Star, TrendingUp, ShoppingBag,
  Users, CheckCircle2, XCircle, Clock, Calendar, Receipt,
  MessageSquare, IndianRupee, Percent, Pencil, Crown,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TierBadge } from "@/components/ui/tier-badge";
import { useToast } from "@/hooks/use-toast";

type Vendor = {
  id: string; name: string; cuisineType: string | null; city: string | null;
  address: string | null; description: string | null; status: string;
  fssaiLicense: string | null; commissionRate: string | null;
  rating: string | null; reviewCount: number | null;
  subscriptionTier: string | null; createdAt: string;
};

type VendorStats = {
  totalRevenue: number; monthlyRevenue: number; totalOrders: number;
  activeSubscriptions: number; averageRating: number | null;
  reviewCount: number; todayOrders: number; pendingOrders: number;
  completedOrdersToday: number;
};

type Order = {
  id: string; scheduledDate: string; status: string; totalAmount: string;
  deliveryAddress: string | null; vendorName?: string; customerName?: string;
};

type Review = {
  id: string; rating: number; comment: string | null; createdAt: string;
  customerName: string | null; vendorResponse: string | null;
};

type Payout = {
  id: string; vendorId: string; amount: string; status: string;
  upiId: string | null; bankAccount: string | null; ifscCode: string | null;
  accountName: string | null; adminNotes: string | null; createdAt: string;
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending:   { label: "Pending",   variant: "outline" },
  approved:  { label: "Approved",  variant: "default" },
  rejected:  { label: "Rejected",  variant: "destructive" },
  suspended: { label: "Suspended", variant: "secondary" },
};

const orderStatusConfig: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pending",    color: "text-amber-600" },
  accepted:  { label: "Accepted",   color: "text-blue-600" },
  preparing: { label: "Preparing",  color: "text-orange-600" },
  packed:    { label: "Packed",     color: "text-indigo-600" },
  picked_up: { label: "Picked Up",  color: "text-purple-600" },
  delivered: { label: "Delivered",  color: "text-green-600" },
  cancelled: { label: "Cancelled",  color: "text-red-500" },
};

const payoutStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending:    { label: "Pending",    variant: "outline" },
  processing: { label: "Processing", variant: "secondary" },
  paid:       { label: "Paid",       variant: "default" },
  rejected:   { label: "Rejected",   variant: "destructive" },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </span>
  );
}

export default function AdminVendorDetail() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [commissionDialog, setCommissionDialog] = useState(false);
  const [commissionInput, setCommissionInput] = useState("");
  const [tierDialog, setTierDialog] = useState(false);
  const [tierInput, setTierInput] = useState<string>("");
  const [statsDialog, setStatsDialog] = useState(false);
  const [ratingInput, setRatingInput] = useState("");
  const [countInput, setCountInput] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vendorData, isLoading: vendorLoading } = useQuery<{ vendor: Vendor }>({
    queryKey: ["/api/vendors", vendorId],
    queryFn: async () => {
      const res = await fetch(`/api/vendors/${vendorId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch vendor");
      return res.json();
    },
    enabled: !!vendorId,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery<{ stats: VendorStats }>({
    queryKey: ["/api/vendors", vendorId, "stats"],
    queryFn: async () => {
      const res = await fetch(`/api/vendors/${vendorId}/stats`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: !!vendorId,
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery<{ orders: Order[] }>({
    queryKey: ["/api/orders", vendorId, orderStatusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ vendorId: vendorId! });
      if (orderStatusFilter !== "all") params.set("status", orderStatusFilter);
      const res = await fetch(`/api/orders?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    enabled: !!vendorId,
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery<{ reviews: Review[] }>({
    queryKey: ["/api/reviews", { vendorId }],
    queryFn: async () => {
      const res = await fetch(`/api/reviews?vendorId=${vendorId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
    enabled: !!vendorId,
  });

  const { data: payoutsData, isLoading: payoutsLoading } = useQuery<{ payouts: Payout[] }>({
    queryKey: ["/api/payouts", "admin", vendorId],
    queryFn: async () => {
      const res = await fetch(`/api/payouts?vendorId=${vendorId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch payouts");
      return res.json();
    },
    enabled: !!vendorId,
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/vendors/${vendorId}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: (_d, status) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendorId] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", "admin-all"] });
      toast({ title: `Vendor ${status}`, description: "Status updated successfully." });
    },
    onError: () => toast({ title: "Error", description: "Could not update status.", variant: "destructive" }),
  });

  const updateCommission = useMutation({
    mutationFn: async (rate: number) => {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionRate: rate.toString() }),
      });
      if (!res.ok) throw new Error("Failed to update commission rate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendorId] });
      toast({ title: "Commission rate updated" });
      setCommissionDialog(false);
      setCommissionInput("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateTier = useMutation({
    mutationFn: async (tier: string) => {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionTier: tier }),
      });
      if (!res.ok) throw new Error("Failed to update vendor tier");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendorId] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", "admin-all"] });
      toast({ title: "Vendor tier updated", description: "Tier changed successfully." });
      setTierDialog(false);
      setTierInput("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateStatsOverride = useMutation({
    mutationFn: async ({ rating, count }: { rating?: string; count?: string }) => {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...(rating !== undefined && { rating }),
          ...(count !== undefined && { reviewCount: parseInt(count) })
        }),
      });
      if (!res.ok) throw new Error("Failed to override stats");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendorId] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendorId, "stats"] });
      toast({ title: "Stats overridden", description: "Kitchen statistics updated manually." });
      setStatsDialog(false);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteReview = useMutation({
    mutationFn: async (reviewId: string) => {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete review");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews", { vendorId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendorId, "stats"] });
      toast({ title: "Review deleted", description: "The review has been removed permanently." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const vendor = vendorData?.vendor;
  const stats = statsData?.stats;
  const orders = ordersData?.orders ?? [];
  const reviews = reviewsData?.reviews ?? [];
  const vendorPayouts = payoutsData?.payouts ?? [];

  if (vendorLoading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="p-8 text-center">
        <Store className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
        <p className="text-muted-foreground">Vendor not found.</p>
        <Link href="/admin/vendors">
          <Button variant="outline" className="mt-4">Back to Vendors</Button>
        </Link>
      </div>
    );
  }

  const sc = statusConfig[vendor.status] ?? statusConfig.pending;
  const commissionRate = vendor.commissionRate ? parseFloat(vendor.commissionRate) : 10;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Back */}
      <Link href="/admin/vendors" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Vendors
      </Link>

      {/* Vendor header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ChefHat className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-serif font-bold tracking-tight">{vendor.name}</h1>
              <Badge variant={sc.variant}>{sc.label}</Badge>
              <TierBadge tier={vendor.subscriptionTier} />
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
              {vendor.cuisineType && (
                <span className="flex items-center gap-1"><ChefHat className="w-3.5 h-3.5" />{vendor.cuisineType}</span>
              )}
              {vendor.city && (
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{vendor.city}</span>
              )}
              {vendor.fssaiLicense && (
                <span className="flex items-center gap-1 font-mono text-xs">FSSAI: {vendor.fssaiLicense}</span>
              )}
              <button
                className="flex items-center gap-1 hover:text-primary transition-colors group/commission"
                onClick={() => { setCommissionInput(commissionRate.toFixed(1)); setCommissionDialog(true); }}
                title="Edit commission rate"
              >
                <Percent className="w-3 h-3" />
                {commissionRate.toFixed(1)}% commission
                <Pencil className="w-3 h-3 opacity-0 group-hover/commission:opacity-60 transition-opacity" />
              </button>
              <button
                className="flex items-center gap-1 hover:text-primary transition-colors group/tier"
                onClick={() => { setTierInput(vendor.subscriptionTier ?? "basic"); setTierDialog(true); }}
                title="Change vendor tier"
              >
                <Crown className="w-3 h-3" />
                Change tier
                <Pencil className="w-3 h-3 opacity-0 group-hover/tier:opacity-60 transition-opacity" />
              </button>
              <button
                className="flex items-center gap-1 hover:text-primary transition-colors group/stats"
                onClick={() => { 
                  setRatingInput(vendor.rating || "5.0"); 
                  setCountInput(String(vendor.reviewCount || 0)); 
                  setStatsDialog(true); 
                }}
                title="Manipulate vendor stats"
              >
                <Settings className="w-3 h-3 text-amber-600" />
                <span className="text-amber-700 font-semibold">Manipulate Stats</span>
                <Pencil className="w-3 h-3 opacity-0 group-hover/stats:opacity-60 transition-opacity" />
              </button>
              <span className="text-xs">Joined {format(new Date(vendor.createdAt), "dd MMM yyyy")}</span>
            </div>
          </div>
        </div>

        {/* Status actions */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {vendor.status === "pending" && (
            <>
              <Button size="sm" disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate("approved")}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Approve
              </Button>
              <Button size="sm" variant="destructive" disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate("rejected")}>
                <XCircle className="w-3.5 h-3.5 mr-1.5" />Reject
              </Button>
            </>
          )}
          {vendor.status === "approved" && (
            <Button size="sm" variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50"
              disabled={updateStatus.isPending} onClick={() => updateStatus.mutate("suspended")}>
              Suspend Kitchen
            </Button>
          )}
          {(vendor.status === "rejected" || vendor.status === "suspended") && (
            <Button size="sm" variant="outline" disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate("approved")}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Re-approve
            </Button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Revenue", icon: IndianRupee, color: "text-green-600",
            value: statsLoading ? null : `₹${(stats?.totalRevenue ?? 0).toLocaleString("en-IN")}`,
          },
          {
            label: "Monthly Revenue", icon: TrendingUp, color: "text-primary",
            value: statsLoading ? null : `₹${(stats?.monthlyRevenue ?? 0).toLocaleString("en-IN")}`,
          },
          {
            label: "Total Orders", icon: ShoppingBag, color: "text-blue-600",
            value: statsLoading ? null : String(stats?.totalOrders ?? 0),
          },
          {
            label: "Active Subscriptions", icon: Users, color: "text-indigo-600",
            value: statsLoading ? null : String(stats?.activeSubscriptions ?? 0),
          },
          {
            label: "Today's Orders", icon: Calendar, color: "text-amber-600",
            value: statsLoading ? null : String(stats?.todayOrders ?? 0),
          },
          {
            label: "Pending Orders", icon: Clock, color: "text-orange-500",
            value: statsLoading ? null : String(stats?.pendingOrders ?? 0),
          },
          {
            label: "Avg. Rating", icon: Star, color: "text-amber-500",
            value: statsLoading ? null : stats?.averageRating != null ? `${stats.averageRating.toFixed(1)} / 5` : "—",
          },
          {
            label: "Reviews", icon: MessageSquare, color: "text-slate-600",
            value: statsLoading ? null : String(stats?.reviewCount ?? 0),
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{card.label}</CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                {card.value === null ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <p className="text-xl font-bold">{card.value}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Description */}
      {vendor.description && (
        <Card className="shadow-sm">
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{vendor.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="orders">
        <TabsList className="mb-6">
          <TabsTrigger value="orders" className="flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5" />Orders
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5" />Reviews
          </TabsTrigger>
          <TabsTrigger value="payouts" className="flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5" />Payouts
          </TabsTrigger>
        </TabsList>

        {/* ─── Orders tab ─── */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{orders.length} orders</p>
            <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(orderStatusConfig).map(([v, { label }]) => (
                  <SelectItem key={v} value={v}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Card className="shadow-sm overflow-x-auto">
            <Table className="min-w-[680px]">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordersLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 4 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                      <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                      No orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.slice(0, 100).map((order) => {
                    const osc = orderStatusConfig[order.status] ?? { label: order.status, color: "text-muted-foreground" };
                    return (
                      <TableRow key={order.id} className="hover:bg-muted/30">
                        <TableCell className="text-sm">
                          {order.scheduledDate
                            ? format(new Date(order.scheduledDate), "dd MMM yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{order.customerName ?? "—"}</TableCell>
                        <TableCell>
                          <span className={`text-sm font-medium ${osc.color}`}>{osc.label}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          ₹{parseFloat(order.totalAmount || "0").toFixed(0)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ─── Reviews tab ─── */}
        <TabsContent value="reviews" className="space-y-4">
          {reviewsLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          ) : reviews.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Star className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              No reviews yet.
            </div>
          ) : (
            reviews.map((review) => (
              <Card key={review.id} className="shadow-sm">
                <CardContent className="pt-5 space-y-2.5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
                        {(review.customerName ?? "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{review.customerName ?? "Anonymous"}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StarRating rating={review.rating} />
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this review? This will also update the kitchen's average rating.")) {
                            deleteReview.mutate(review.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                  )}
                  {review.vendorResponse && (
                    <div className="ml-4 pl-4 border-l-2 border-primary/20 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Vendor reply: </span>
                      {review.vendorResponse}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ─── Payouts tab ─── */}
        <TabsContent value="payouts" className="space-y-4">
          <Card className="shadow-sm overflow-x-auto">
            <Table className="min-w-[620px]">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Admin Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payoutsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : vendorPayouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      <Receipt className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                      No payout requests.
                    </TableCell>
                  </TableRow>
                ) : (
                  vendorPayouts.map((payout) => {
                    const psc = payoutStatusConfig[payout.status] ?? payoutStatusConfig.pending;
                    return (
                      <TableRow key={payout.id} className="hover:bg-muted/30">
                        <TableCell className="text-sm">
                          {format(new Date(payout.createdAt), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          ₹{parseFloat(payout.amount).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {payout.upiId
                            ? <span>UPI: {payout.upiId}</span>
                            : payout.bankAccount
                              ? <span>Bank: {payout.bankAccount}{payout.ifscCode ? ` / ${payout.ifscCode}` : ""}</span>
                              : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={psc.variant} className="text-xs">{psc.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {payout.adminNotes ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Commission rate edit dialog */}
      <Dialog open={commissionDialog} onOpenChange={(open) => { if (!open) { setCommissionDialog(false); setCommissionInput(""); } }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Edit Commission Rate</DialogTitle>
            <DialogDescription>
              Set the platform commission percentage for <strong>{vendor?.name}</strong>.
              This applies to all future earnings.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="commission-rate">Commission Rate (%)</Label>
              <div className="relative">
                <Input
                  id="commission-rate"
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  value={commissionInput}
                  onChange={e => setCommissionInput(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCommissionDialog(false); setCommissionInput(""); }}>
              Cancel
            </Button>
            <Button
              disabled={updateCommission.isPending || !commissionInput}
              onClick={() => {
                const rate = parseFloat(commissionInput);
                if (isNaN(rate) || rate < 0 || rate > 50) {
                  toast({ variant: "destructive", title: "Invalid rate", description: "Enter a value between 0 and 50." });
                  return;
                }
                updateCommission.mutate(rate);
              }}
            >
              {updateCommission.isPending ? "Saving..." : "Save Rate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tier change dialog */}
      <Dialog open={tierDialog} onOpenChange={(open) => { if (!open) { setTierDialog(false); setTierInput(""); } }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              Change Vendor Tier
            </DialogTitle>
            <DialogDescription>
              Update the subscription tier for <strong>{vendor?.name}</strong>.
              This controls plan limits and feature access.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-3">
            <div className="space-y-1.5">
              <Label>Subscription Tier</Label>
              <Select value={tierInput} onValueChange={setTierInput}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic — free tier</SelectItem>
                  <SelectItem value="pro">Pro — paid tier</SelectItem>
                  <SelectItem value="enterprise">Enterprise — custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTierDialog(false); setTierInput(""); }}>
              Cancel
            </Button>
            <Button
              disabled={updateTier.isPending || !tierInput || tierInput === vendor?.subscriptionTier}
              onClick={() => updateTier.mutate(tierInput)}
            >
              {updateTier.isPending ? "Saving..." : "Update Tier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Manipulation dialog */}
      <Dialog open={statsDialog} onOpenChange={setStatsDialog}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <ShieldCheck className="w-4 h-4" />
              Admin Manipulation
            </DialogTitle>
            <DialogDescription>
              Directly override the public rating and review count for <strong>{vendor?.name}</strong>. Use with caution.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rating-override">Manual Rating (0-5)</Label>
              <Input
                id="rating-override"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={ratingInput}
                onChange={e => setRatingInput(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="count-override">Manual Review Count</Label>
              <Input
                id="count-override"
                type="number"
                min="0"
                value={countInput}
                onChange={e => setCountInput(e.target.value)}
              />
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-[11px] text-amber-800 leading-relaxed">
              <strong>Note:</strong> These values will be displayed on the platform. Future reviews will continue to update these numbers based on the new manual baseline.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatsDialog(false)}>Cancel</Button>
            <Button 
              className="bg-amber-600 hover:bg-amber-700"
              disabled={updateStatsOverride.isPending}
              onClick={() => updateStatsOverride.mutate({ rating: ratingInput, count: countInput })}
            >
              {updateStatsOverride.isPending ? "Overriding..." : "Apply Override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
