import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays, parseISO } from "date-fns";
import {
  CalendarDays, Users, TrendingUp, AlertCircle, Search,
  IndianRupee, Store, CheckCircle2, Clock, XCircle, PauseCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Subscription = {
  id: string;
  customerId: string;
  vendorId: string;
  planId: string;
  status: "active" | "paused" | "cancelled" | "expired";
  startDate: string;
  endDate: string;
  deliveryAddress: string | null;
  totalAmount: string | null;
  createdAt: string;
  vendorName?: string;
  planName?: string;
  planType?: string;
  planPrice?: string;
  customerName?: string;
};

const statusConfig: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  active:    { label: "Active",    icon: CheckCircle2, variant: "default",     color: "text-green-600" },
  paused:    { label: "Paused",    icon: PauseCircle,  variant: "secondary",   color: "text-amber-600" },
  cancelled: { label: "Cancelled", icon: XCircle,      variant: "destructive", color: "text-red-500" },
  expired:   { label: "Expired",   icon: Clock,        variant: "outline",     color: "text-muted-foreground" },
};

const planTypeLabel: Record<string, string> = {
  daily: "Daily", weekly: "Weekly", monthly: "Monthly",
  weekday: "Weekday", trial_3day: "3-Day Trial", trial_7day: "7-Day Trial", custom: "Custom",
};

function ExpiryBadge({ endDate, status }: { endDate: string; status: string }) {
  if (status !== "active") return null;
  const days = differenceInDays(parseISO(endDate), new Date());
  if (days < 0) return <span className="text-xs text-red-500 font-medium">Expired</span>;
  if (days <= 3) return <span className="text-xs text-red-500 font-medium">Expires in {days}d</span>;
  if (days <= 7) return <span className="text-xs text-amber-500 font-medium">Expires in {days}d</span>;
  return null;
}

export default function AdminSubscriptions() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery<{ subscriptions: Subscription[] }>({
    queryKey: ["/api/subscriptions", "admin-all"],
    queryFn: async () => {
      const res = await fetch("/api/subscriptions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch subscriptions");
      return res.json();
    },
  });

  const all = data?.subscriptions ?? [];

  const filtered = all.filter((s) => {
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (s.customerName ?? "").toLowerCase().includes(q) ||
      (s.vendorName ?? "").toLowerCase().includes(q) ||
      (s.planName ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const counts = {
    total:     all.length,
    active:    all.filter((s) => s.status === "active").length,
    expiring:  all.filter((s) => {
      if (s.status !== "active") return false;
      const d = differenceInDays(parseISO(s.endDate), new Date());
      return d >= 0 && d <= 7;
    }).length,
    cancelled: all.filter((s) => s.status === "cancelled" || s.status === "expired").length,
  };

  const totalRevenue = all
    .filter((s) => s.status === "active")
    .reduce((acc, s) => acc + parseFloat(s.totalAmount || s.planPrice || "0"), 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">Subscription Management</h1>
        <p className="text-muted-foreground mt-1">
          Monitor all active tiffin subscriptions across the platform.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Subscriptions", value: counts.total,     icon: CalendarDays,  color: "text-primary" },
          { label: "Active Now",          value: counts.active,    icon: Users,          color: "text-green-600" },
          { label: "Expiring This Week",  value: counts.expiring,  icon: AlertCircle,   color: "text-amber-500" },
          { label: "Cancelled / Expired", value: counts.cancelled, icon: XCircle,       color: "text-red-500" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stat.value}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue card */}
      <Card className="shadow-sm bg-primary/5 border-primary/20">
        <CardContent className="flex items-center gap-4 pt-5 pb-5">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Total Value — Active Subscriptions</p>
            {isLoading ? (
              <Skeleton className="h-7 w-36 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-primary">
                ₹{totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
            )}
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground">Avg. per subscription</p>
            {isLoading ? (
              <Skeleton className="h-5 w-20 mt-1 ml-auto" />
            ) : (
              <p className="text-base font-semibold">
                ₹{counts.active > 0 ? (totalRevenue / counts.active).toLocaleString("en-IN", { maximumFractionDigits: 0 }) : "—"}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search customer, vendor, or plan..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="shadow-sm overflow-x-auto">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Customer</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expiry</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                  <CalendarDays className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  No subscriptions match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((sub) => {
                const sc = statusConfig[sub.status] ?? statusConfig.expired;
                const StatusIcon = sc.icon;
                const planType = sub.planType ? (planTypeLabel[sub.planType] ?? sub.planType) : "—";

                return (
                  <TableRow key={sub.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                          {(sub.customerName ?? "?")[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{sub.customerName ?? "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Store className="w-3.5 h-3.5 shrink-0" />
                        {sub.vendorName ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{sub.planName ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{planType}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>{sub.startDate ? format(parseISO(sub.startDate), "dd MMM") : "—"}</p>
                        <p className="text-muted-foreground/70">to</p>
                        <p>{sub.endDate ? format(parseISO(sub.endDate), "dd MMM yyyy") : "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm font-medium">
                        ₹{parseFloat(sub.totalAmount || sub.planPrice || "0").toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sc.variant} className="flex items-center gap-1 w-fit text-xs">
                        <StatusIcon className="w-3 h-3" />
                        {sc.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {sub.endDate ? format(parseISO(sub.endDate), "dd MMM yyyy") : "—"}
                        <div><ExpiryBadge endDate={sub.endDate} status={sub.status} /></div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {filtered.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Showing {filtered.length} of {all.length} subscriptions
        </p>
      )}
    </div>
  );
}
