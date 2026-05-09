import { useState } from "react";
import { useListOrders, useGetMyVendorProfile } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ShoppingBag,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  ChefHat,
  Package,
  Bike,
  Shield,
  ArrowLeft,
  Zap,
  Camera,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  pending:  { color: "bg-yellow-100 text-yellow-800 border-yellow-200",  icon: Clock,         label: "Pending" },
  accepted: { color: "bg-blue-100 text-blue-800 border-blue-200",        icon: CheckCircle2,  label: "Accepted" },
  preparing:{ color: "bg-orange-100 text-orange-800 border-orange-200",  icon: ChefHat,       label: "Preparing" },
  packed:   { color: "bg-purple-100 text-purple-800 border-purple-200",  icon: Package,       label: "Packed" },
  picked_up:{ color: "bg-indigo-100 text-indigo-800 border-indigo-200",  icon: Bike,          label: "Picked Up" },
  delivered:{ color: "bg-green-100 text-green-800 border-green-200",     icon: CheckCircle2,  label: "Delivered" },
  cancelled:{ color: "bg-red-100 text-red-800 border-red-200",           icon: AlertCircle,   label: "Cancelled" },
};

const NEXT_STATUSES: Record<string, Array<{ value: string; label: string }>> = {
  pending:   [{ value: "accepted",  label: "Accept Order" }, { value: "cancelled", label: "Cancel Order" }],
  accepted:  [{ value: "preparing", label: "Mark as Preparing" }, { value: "cancelled", label: "Cancel Order" }],
  preparing: [{ value: "packed",    label: "Mark as Packed" }, { value: "cancelled", label: "Cancel Order" }],
  packed:    [{ value: "picked_up", label: "Handed to Delivery" }, { value: "cancelled", label: "Cancel Order" }],
  picked_up: [{ value: "delivered", label: "Mark as Delivered" }],
  delivered: [],
  cancelled: [],
};

// ─── Day-level pipeline stats bar ────────────────────────────────────────────
function PipelineStats({ orders }: { orders: Array<{ status: string }> }) {
  const counts: Record<string, number> = {};
  for (const o of orders) counts[o.status] = (counts[o.status] ?? 0) + 1;

  const stats = [
    { key: "pending",   label: "Pending",   color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    { key: "accepted",  label: "Accepted",  color: "bg-blue-100 text-blue-800 border-blue-200" },
    { key: "preparing", label: "Preparing", color: "bg-orange-100 text-orange-800 border-orange-200" },
    { key: "packed",    label: "Packed",    color: "bg-purple-100 text-purple-800 border-purple-200" },
    { key: "picked_up", label: "Out",       color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
    { key: "delivered", label: "Delivered", color: "bg-green-100 text-green-800 border-green-200" },
    { key: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800 border-red-200" },
  ].filter(s => (counts[s.key] ?? 0) > 0);

  if (stats.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {stats.map(s => (
        <Badge key={s.key} variant="outline" className={`border ${s.color} text-xs font-semibold`}>
          {counts[s.key]} {s.label}
        </Badge>
      ))}
      <span className="text-xs text-muted-foreground ml-1">
        · {orders.length} total order{orders.length !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function VendorOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: profileData } = useGetMyVendorProfile();
  const vendorId = profileData?.vendor?.id;

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [search, setSearch] = useState("");
  const [isAcceptingAll, setIsAcceptingAll] = useState(false);
  const [proofOrder, setProofOrder] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: ordersData, isLoading } = useListOrders(
    {
      vendorId,
      status: statusFilter !== "all" ? statusFilter as any : undefined,
      date: dateFilter || undefined,
    },
    {
      query: { enabled: !!vendorId, queryKey: ["/api/orders", { vendorId, status: statusFilter, date: dateFilter }] }
    },
  );

  const rawOrders = ordersData?.orders || [];
  const orders = search.trim()
    ? rawOrders.filter(o => o.customerName?.toLowerCase().includes(search.toLowerCase()))
    : rawOrders;

  // All orders for the day (without status filter) — used for pipeline stats
  const { data: allDayData } = useListOrders(
    { vendorId, date: dateFilter || undefined },
    {
      query: {
        enabled: !!vendorId,
        queryKey: ["/api/orders/all-day", { vendorId, date: dateFilter }],
      },
    },
  );
  const allDayOrders = allDayData?.orders || [];

  // Pending orders visible in current list
  const pendingOrders = orders.filter(o => o.status === "pending");
  const hasMultiplePending = pendingOrders.length > 1;

  // ─── Bulk accept all pending orders ───────────────────────────────────────
  const handleAcceptAll = async () => {
    if (pendingOrders.length === 0) return;
    setIsAcceptingAll(true);
    let succeeded = 0;
    for (const order of pendingOrders) {
      try {
        const res = await fetch(`/api/orders/${order.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "accepted" }),
        });
        if (res.ok) succeeded++;
      } catch {
        // continue on individual failures
      }
    }
    setIsAcceptingAll(false);
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    toast({
      title: succeeded === pendingOrders.length
        ? `All ${succeeded} orders accepted`
        : `${succeeded} of ${pendingOrders.length} orders accepted`,
    });
  };

  // ─── Single order status update ───────────────────────────────────────────
  const handleStatusChange = async (orderId: string, newStatus: string, deliveryProofUrl?: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, deliveryProofUrl }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any)?.error || "Failed to update");
      }
      toast({ title: "Order status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setProofOrder(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const onFileUpload = async (file: File) => {
    if (!proofOrder) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    formData.append("folder", "delivery_proofs");

    try {
      const res = await fetch("/api/media/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      await handleStatusChange(proofOrder.id, "delivered", url);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload Error", description: err.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="lg:hidden">
          <a href="/vendor/dashboard"><ArrowLeft className="w-5 h-5" /></a>
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Order Pipeline</h1>
          <p className="text-muted-foreground mt-1">Manage today's preparation and delivery schedule.</p>
        </div>
      </div>

      {/* Platform integrity notice */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm">
        <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-blue-700">
          <strong>Platform policy:</strong> All communication and transactions with customers must happen through Dabba.
          Do not share phone numbers, social media handles, or payment links directly with customers.
        </p>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="w-full sm:w-48 shrink-0">
          <Input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="w-full sm:w-48 shrink-0">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {/* Bulk accept — only when 2+ pending orders are visible */}
        {hasMultiplePending && (
          <Button
            variant="default"
            size="default"
            disabled={isAcceptingAll}
            onClick={handleAcceptAll}
            className="shrink-0"
          >
            <Zap className="w-4 h-4 mr-2" />
            {isAcceptingAll
              ? "Accepting..."
              : `Accept All Pending (${pendingOrders.length})`
            }
          </Button>
        )}
      </div>

      {/* Day pipeline stats — shows counts of all non-filtered orders for the chosen day */}
      {!isLoading && allDayOrders.length > 0 && (
        <PipelineStats orders={allDayOrders} />
      )}

      {/* Orders table */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[100px]">Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Meal</TableHead>
              <TableHead>Delivery Area</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full max-w-[120px]" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <ShoppingBag className="w-10 h-10 text-muted-foreground/30" />
                    <p>No orders found for the selected filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
                const Icon = config.icon;
                const nextOptions = NEXT_STATUSES[order.status] ?? [];
                const isTerminal = nextOptions.length === 0;

                // Show locality only (first part of address before comma) for privacy
                const deliveryLocality = order.deliveryAddress
                  ? order.deliveryAddress.split(",").slice(-3, -1).join(",").trim() || order.deliveryAddress.split(",")[0]
                  : "N/A";

                return (
                  <TableRow key={order.id} className="hover:bg-muted/20">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{order.id.substring(0, 8)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{order.customerName || "Customer"}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(order.scheduledDate), "MMM d")}</div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {order.mealType || "Standard"}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[180px] truncate text-sm" title={order.deliveryAddress || ""}>
                        {deliveryLocality}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      ₹{parseFloat(String(order.totalAmount)).toFixed(0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-medium border ${config.color} px-2.5 py-0.5 flex w-fit items-center gap-1.5`}>
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isTerminal ? (
                        <span className="text-xs text-muted-foreground px-2">—</span>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">Update Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {nextOptions.map(opt => (
                              <DropdownMenuItem
                                key={opt.value}
                                onClick={() => {
                                  if (opt.value === "delivered") {
                                    setProofOrder(order);
                                  } else {
                                    handleStatusChange(order.id, opt.value);
                                  }
                                }}
                                className={opt.value === "cancelled" ? "text-destructive focus:bg-destructive/10 focus:text-destructive" : ""}
                              >
                                {opt.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delivery Proof Dialog */}
      <Dialog open={!!proofOrder} onOpenChange={(open) => !open && setProofOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Proof of Delivery
            </DialogTitle>
            <DialogDescription>
              Please upload a photo of the tiffin at the delivery location to complete this order.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl bg-muted/30 space-y-4">
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Uploading proof...</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <Button variant="outline" className="relative cursor-pointer" asChild>
                    <span>
                      Take Photo / Select Image
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) onFileUpload(file);
                        }}
                      />
                    </span>
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">Maximum file size: 5MB</p>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={() => setProofOrder(null)} disabled={uploading}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => proofOrder && handleStatusChange(proofOrder.id, "delivered")} disabled={uploading}>
              Skip & Mark Delivered
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
