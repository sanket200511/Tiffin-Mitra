import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Store, Search, CheckCircle2, XCircle, Clock, ChefHat, MapPin, Percent, Pencil,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type Vendor = {
  id: string;
  name: string;
  cuisineType: string | null;
  city: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  fssaiNumber: string | null;
  commissionRate: string | null;
  createdAt: string;
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending:   { label: "Pending",   variant: "outline" },
  approved:  { label: "Approved",  variant: "default" },
  rejected:  { label: "Rejected",  variant: "destructive" },
  suspended: { label: "Suspended", variant: "secondary" },
};

export default function AdminVendors() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [commissionDialog, setCommissionDialog] = useState<{ id: string; name: string; currentRate: string } | null>(null);
  const [newRate, setNewRate] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ vendors: Vendor[] }>({
    queryKey: ["/api/vendors", "admin-all"],
    queryFn: async () => {
      const res = await fetch("/api/vendors?includeAll=true", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch vendors");
      return res.json();
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ vendorId, status }: { vendorId: string; status: string }) => {
      const res = await fetch(`/api/vendors/${vendorId}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", "admin-all"] });
      toast({ title: `Vendor ${variables.status}`, description: "Status updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not update vendor status.", variant: "destructive" });
    },
  });

  const updateCommission = useMutation({
    mutationFn: async ({ vendorId, rate }: { vendorId: string; rate: number }) => {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionRate: rate }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any)?.error || "Failed to update commission");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", "admin-all"] });
      toast({ title: "Commission rate updated" });
      setCommissionDialog(null);
      setNewRate("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleCommissionSave = () => {
    if (!commissionDialog) return;
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast({ title: "Invalid rate", description: "Enter a value between 0 and 100.", variant: "destructive" });
      return;
    }
    updateCommission.mutate({ vendorId: commissionDialog.id, rate });
  };

  const openCommissionDialog = (v: Vendor) => {
    setCommissionDialog({ id: v.id, name: v.name, currentRate: v.commissionRate ?? "10" });
    setNewRate(v.commissionRate ?? "10");
  };

  const vendors = data?.vendors ?? [];

  const filtered = vendors.filter((v) => {
    const matchSearch =
      !search ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.city ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    total:    vendors.length,
    pending:  vendors.filter((v) => v.status === "pending").length,
    approved: vendors.filter((v) => v.status === "approved").length,
    rejected: vendors.filter((v) => v.status === "rejected").length,
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">Vendor Management</h1>
        <p className="text-muted-foreground mt-1">Review applications, manage active kitchen partners, and set commission rates.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Vendors",   value: counts.total,    icon: Store,        color: "text-primary" },
          { label: "Pending Review",  value: counts.pending,  icon: Clock,        color: "text-amber-500" },
          { label: "Active Kitchens", value: counts.approved, icon: CheckCircle2, color: "text-green-600" },
          { label: "Rejected",        value: counts.rejected, icon: XCircle,      color: "text-red-500" },
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by kitchen name or city..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="shadow-sm overflow-x-auto">
        <Table className="min-w-[820px]">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Kitchen</TableHead>
              <TableHead>Cuisine / City</TableHead>
              <TableHead>FSSAI</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                  <ChefHat className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  No vendors match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((vendor) => {
                const sc = statusConfig[vendor.status] ?? statusConfig.pending;
                const isPending = vendor.status === "pending";
                const isApproved = vendor.status === "approved";
                const commissionRate = vendor.commissionRate ? parseFloat(vendor.commissionRate) : 10;

                return (
                  <TableRow key={vendor.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <ChefHat className="w-4 h-4" />
                        </div>
                        <span className="font-medium">{vendor.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {vendor.cuisineType && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <ChefHat className="w-3 h-3" /> {vendor.cuisineType}
                          </span>
                        )}
                        {vendor.city && (
                          <span className="flex items-center gap-1 text-muted-foreground mt-0.5">
                            <MapPin className="w-3 h-3" /> {vendor.city}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground font-mono">
                        {vendor.fssaiNumber ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        className="flex items-center gap-1.5 group"
                        onClick={() => openCommissionDialog(vendor)}
                        title="Click to edit commission rate"
                      >
                        <Badge variant="outline" className="font-mono text-xs border-slate-200 bg-slate-50 text-slate-700 group-hover:border-primary/40 group-hover:bg-primary/5 transition-colors">
                          <Percent className="w-2.5 h-2.5 mr-1" />
                          {commissionRate.toFixed(1)}%
                        </Badge>
                        <Pencil className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(vendor.createdAt), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isPending && (
                          <>
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              disabled={updateStatus.isPending}
                              onClick={() => updateStatus.mutate({ vendorId: vendor.id, status: "approved" })}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs"
                              disabled={updateStatus.isPending}
                              onClick={() => updateStatus.mutate({ vendorId: vendor.id, status: "rejected" })}
                            >
                              <XCircle className="w-3 h-3 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {isApproved && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                            disabled={updateStatus.isPending}
                            onClick={() => updateStatus.mutate({ vendorId: vendor.id, status: "suspended" })}
                          >
                            Suspend
                          </Button>
                        )}
                        {(vendor.status === "rejected" || vendor.status === "suspended") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={updateStatus.isPending}
                            onClick={() => updateStatus.mutate({ vendorId: vendor.id, status: "approved" })}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Re-approve
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Commission rate edit dialog */}
      <Dialog open={!!commissionDialog} onOpenChange={(open) => { if (!open) { setCommissionDialog(null); setNewRate(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit Commission Rate</DialogTitle>
            <DialogDescription>
              Set the platform commission rate for <strong>{commissionDialog?.name}</strong>.
              Current rate: <strong>{commissionDialog?.currentRate ?? "10"}%</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="commission-rate">Commission Rate (%)</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="commission-rate"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  className="pl-9"
                  placeholder="e.g. 10"
                  value={newRate}
                  onChange={e => setNewRate(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">Enter a value between 0 and 100. Vendors can see their current commission rate.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCommissionDialog(null); setNewRate(""); }}>
              Cancel
            </Button>
            <Button onClick={handleCommissionSave} disabled={updateCommission.isPending}>
              {updateCommission.isPending ? "Saving..." : "Save Rate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
