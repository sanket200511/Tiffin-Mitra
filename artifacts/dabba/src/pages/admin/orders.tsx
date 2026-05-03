import { useState } from "react";
import { useListOrders } from "@workspace/api-client-react";
import { format } from "date-fns";
import {
  ShoppingBag, Filter, Search, Clock, CheckCircle2, AlertCircle,
  ChefHat, Package, Bike, Download,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STATUS_CONFIG: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  pending: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock, label: "Pending" },
  accepted: { color: "bg-blue-100 text-blue-800 border-blue-200", icon: CheckCircle2, label: "Accepted" },
  preparing: { color: "bg-orange-100 text-orange-800 border-orange-200", icon: ChefHat, label: "Preparing" },
  packed: { color: "bg-purple-100 text-purple-800 border-purple-200", icon: Package, label: "Packed" },
  picked_up: { color: "bg-indigo-100 text-indigo-800 border-indigo-200", icon: Bike, label: "Picked Up" },
  delivered: { color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2, label: "Delivered" },
  cancelled: { color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle, label: "Cancelled" },
};

function exportCsv(orders: Array<{ id: string; scheduledDate: string; vendorName?: string | null; customerName?: string | null; mealType?: string | null; totalAmount: string | number; status: string }>) {
  const header = ["Order ID", "Date", "Kitchen", "Customer", "Meal Type", "Amount (₹)", "Status"];
  const rows = orders.map(o => [
    o.id,
    o.scheduledDate,
    o.vendorName ?? "",
    o.customerName ?? "",
    o.mealType ?? "Standard",
    parseFloat(String(o.totalAmount)).toFixed(2),
    o.status,
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dabba-orders-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [search, setSearch] = useState("");

  const { data: ordersData, isLoading } = useListOrders({
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    date: dateFilter || undefined,
  }, {
    query: {
      queryKey: ["/api/orders", "admin", { status: statusFilter, date: dateFilter }],
    }
  });

  const raw = ordersData?.orders || [];
  const orders = search.trim()
    ? raw.filter(o =>
        o.vendorName?.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName?.toLowerCase().includes(search.toLowerCase())
      )
    : raw;

  // Quick counts by status
  const counts = raw.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalRevenue = raw.reduce((sum, o) => sum + parseFloat(String(o.totalAmount)), 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Platform Orders</h1>
          <p className="text-muted-foreground mt-1">All orders across every kitchen on the platform.</p>
        </div>
        {!isLoading && orders.length > 0 && (
          <Button variant="outline" size="sm" className="shrink-0 gap-2" onClick={() => exportCsv(orders)}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        {!isLoading && (
          <>
            <div className="bg-card border rounded-lg px-4 py-2.5 flex items-center gap-2 shadow-sm">
              <ShoppingBag className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{raw.length} orders</span>
            </div>
            <div className="bg-card border rounded-lg px-4 py-2.5 flex items-center gap-2 shadow-sm">
              <span className="text-sm font-medium text-green-700">
                ₹{totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })} GMV
              </span>
            </div>
            {counts.pending > 0 && (
              <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-800 text-xs px-3 py-1.5">
                {counts.pending} pending
              </Badge>
            )}
            {counts.delivered > 0 && (
              <Badge variant="outline" className="bg-green-50 border-green-300 text-green-800 text-xs px-3 py-1.5">
                {counts.delivered} delivered
              </Badge>
            )}
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-48 shrink-0">
          <Input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="w-full"
            placeholder="Filter by date"
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
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by vendor or customer..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <Card className="shadow-sm overflow-hidden overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[100px]">Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Kitchen</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Meal</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full max-w-[100px]" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center text-muted-foreground">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  {search || statusFilter !== "all" || dateFilter ? "No orders match your filters." : "No orders yet."}
                </TableCell>
              </TableRow>
            ) : (
              orders.map(order => {
                const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
                const Icon = cfg.icon;
                return (
                  <TableRow key={order.id} className="hover:bg-muted/20">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{order.id.substring(0, 8)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(order.scheduledDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{order.vendorName || "—"}</TableCell>
                    <TableCell className="text-sm">{order.customerName || "—"}</TableCell>
                    <TableCell className="capitalize text-sm">{order.mealType || "Standard"}</TableCell>
                    <TableCell className="font-medium text-sm">
                      ₹{parseFloat(String(order.totalAmount)).toFixed(0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs border ${cfg.color} flex w-fit items-center gap-1`}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
