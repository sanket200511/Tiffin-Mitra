import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetPlatformOverview, useUpdateVendor } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, Store, Users, ShoppingBag, ArrowUpRight, Star, Percent, TrendingUp, CheckCircle2, XCircle, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const TIER_COLORS: Record<string, string> = {
  basic: "bg-slate-100 text-slate-700 border-slate-200",
  pro: "bg-blue-100 text-blue-700 border-blue-200",
  enterprise: "bg-purple-100 text-purple-700 border-purple-200",
};

type Vendor = {
  id: string;
  name: string;
  city: string;
  cuisineType: string;
  status: string;
  subscriptionTier: string;
  commissionRate: string | number | null;
  rating: string | number | null;
  featured: boolean;
  createdAt: string;
};

export default function AdminOverview() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: overviewData, isLoading: overviewLoading } = useGetPlatformOverview();
  const overview = overviewData?.overview;

  // Fetch ALL vendors (including pending) via includeAll param
  const { data: vendorsData, isLoading: vendorsLoading } = useQuery({
    queryKey: ["/api/vendors", "admin", "all"],
    queryFn: async () => {
      const res = await fetch("/api/vendors?includeAll=true", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch vendors");
      return res.json() as Promise<{ vendors: Vendor[] }>;
    },
  });

  const vendors = vendorsData?.vendors || [];
  const { mutate: updateVendor } = useUpdateVendor();

  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [editingCommission, setEditingCommission] = useState<Record<string, string>>({});
  const [actioning, setActioning] = useState<string | null>(null);

  const pendingVendors = vendors.filter(v => v.status === "pending");
  const approvedVendors = vendors.filter(v => v.status === "approved");

  function refetchVendors() {
    queryClient.invalidateQueries({ queryKey: ["/api/vendors", "admin", "all"] });
    queryClient.invalidateQueries({ queryKey: ["/api/analytics/platform/overview"] });
  }

  async function patchVendorStatus(vendorId: string, status: string) {
    setActioning(vendorId);
    try {
      const res = await fetch(`/api/vendors/${vendorId}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast({ variant: "destructive", title: "Error", description: body.error || "Action failed." });
        return;
      }
      refetchVendors();
    } catch {
      toast({ variant: "destructive", title: "Network error", description: "Could not reach the server." });
    } finally {
      setActioning(null);
    }
  }

  function approveVendor(vendorId: string) {
    patchVendorStatus(vendorId, "approved").then(() =>
      toast({ title: "Vendor approved", description: "The kitchen is now live on the platform." })
    );
  }

  function rejectVendor(vendorId: string) {
    patchVendorStatus(vendorId, "rejected").then(() =>
      toast({ title: "Vendor rejected", description: "The application has been declined." })
    );
  }

  function suspendVendor(vendorId: string) {
    patchVendorStatus(vendorId, "suspended").then(() =>
      toast({ title: "Vendor suspended", description: "The kitchen has been suspended." })
    );
  }

  function toggleFeatured(vendorId: string, current: boolean) {
    updateVendor(
      { vendorId, data: { featured: !current } as never },
      { onSuccess: () => refetchVendors() }
    );
  }

  function saveCommission(vendorId: string) {
    const value = editingCommission[vendorId];
    const rate = parseFloat(value);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast({ variant: "destructive", title: "Invalid rate", description: "Commission must be between 0 and 100." });
      return;
    }
    updateVendor(
      { vendorId, data: { commissionRate: String(rate) } as never },
      {
        onSuccess: () => {
          toast({ title: "Commission updated" });
          setEditingCommission(prev => {
            const next = { ...prev };
            delete next[vendorId];
            return next;
          });
          refetchVendors();
        }
      }
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Platform Overview</h1>
        <p className="text-muted-foreground mt-1">Super Admin dashboard for Dabba platform.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Total GMV</p>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            {overviewLoading ? <Skeleton className="h-8 w-24" /> : (
              <>
                <div className="text-3xl font-bold">₹{overview?.platformGMV?.toLocaleString("en-IN", { maximumFractionDigits: 0 }) || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Gross merchandise value</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Commission Earned</p>
              <Percent className="h-4 w-4 text-primary" />
            </div>
            {overviewLoading ? <Skeleton className="h-8 w-24" /> : (
              <>
                <div className="text-3xl font-bold text-primary">₹{overview?.commissionRevenue?.toLocaleString("en-IN", { maximumFractionDigits: 0 }) || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Platform revenue from orders</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Kitchens</p>
              <Store className="h-4 w-4 text-orange-500" />
            </div>
            {overviewLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-3xl font-bold">{overview?.totalVendors || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {overview?.activeVendors || 0} active · {overview?.featuredVendors || 0} featured
                  {(overview?.pendingVendorApprovals ?? 0) > 0 && (
                    <span className="ml-1 text-yellow-600 font-semibold">· {overview?.pendingVendorApprovals} pending</span>
                  )}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Active Subs</p>
              <ShoppingBag className="h-4 w-4 text-purple-500" />
            </div>
            {overviewLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-3xl font-bold">{overview?.activeSubscriptions || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">{overview?.totalCustomers || 0} total customers</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vendor Management */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Vendor Management</CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={tab === "pending" ? "default" : "outline"}
                onClick={() => setTab("pending")}
              >
                Pending
                {pendingVendors.length > 0 && (
                  <span className="ml-1.5 bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{pendingVendors.length}</span>
                )}
              </Button>
              <Button
                size="sm"
                variant={tab === "all" ? "default" : "outline"}
                onClick={() => setTab("all")}
              >
                Active ({approvedVendors.length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tab === "pending" ? (
            vendorsLoading ? (
              <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            ) : pendingVendors.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Store className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No kitchens pending approval.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Cuisine</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingVendors.map(vendor => (
                      <TableRow key={vendor.id}>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell>{vendor.city}</TableCell>
                        <TableCell>{vendor.cuisineType}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(vendor.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50"
                              disabled={actioning === vendor.id}
                              onClick={() => rejectVendor(vendor.id)}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              Reject
                            </Button>
                            <Button size="sm" disabled={actioning === vendor.id} onClick={() => approveVendor(vendor.id)}>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              {actioning === vendor.id ? "Saving..." : "Approve"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : (
            vendorsLoading ? (
              <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            ) : approvedVendors.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Store className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No active kitchens yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Commission %</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Featured</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedVendors.map(vendor => {
                      const isEditing = editingCommission[vendor.id] !== undefined;
                      return (
                        <TableRow key={vendor.id}>
                          <TableCell className="font-medium">{vendor.name}</TableCell>
                          <TableCell>{vendor.city}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={TIER_COLORS[vendor.subscriptionTier] || TIER_COLORS.basic}>
                              {vendor.subscriptionTier}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={0.5}
                                  className="w-20 h-7 text-sm"
                                  value={editingCommission[vendor.id]}
                                  onChange={e => setEditingCommission(prev => ({ ...prev, [vendor.id]: e.target.value }))}
                                />
                                <Button size="sm" className="h-7 px-2 text-xs" onClick={() => saveCommission(vendor.id)}>Save</Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingCommission(prev => {
                                  const next = { ...prev };
                                  delete next[vendor.id];
                                  return next;
                                })}>×</Button>
                              </div>
                            ) : (
                              <button
                                className="font-mono text-sm font-medium hover:text-primary hover:underline transition-colors"
                                onClick={() => setEditingCommission(prev => ({ ...prev, [vendor.id]: String(vendor.commissionRate ?? 10) }))}
                                title="Click to edit"
                              >
                                {vendor.commissionRate ?? 10}%
                              </button>
                            )}
                          </TableCell>
                          <TableCell>
                            {vendor.rating ? (
                              <span className="flex items-center gap-1 text-sm">
                                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                {vendor.rating}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={!!vendor.featured}
                              onCheckedChange={() => toggleFeatured(vendor.id, !!vendor.featured)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50 h-7 text-xs"
                              disabled={actioning === vendor.id}
                              onClick={() => suspendVendor(vendor.id)}
                            >
                              <Ban className="w-3 h-3 mr-1" />
                              {actioning === vendor.id ? "..." : "Suspend"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Admin Access Info */}
      <Card className="shadow-sm bg-muted/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-primary" />
            Platform Quick Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { label: "API Services", status: "Operational" },
              { label: "Database", status: "Operational" },
              { label: "Session Store", status: "Operational" },
            ].map(service => (
              <div key={service.label} className="flex justify-between items-center p-3 border rounded-lg bg-green-50/50">
                <span className="font-medium text-sm">{service.label}</span>
                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">{service.status}</Badge>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-background border rounded-lg text-sm text-muted-foreground">
            <strong className="text-foreground">Today's platform orders:</strong>{" "}
            {overviewLoading ? "..." : overview?.totalOrdersToday ?? 0}
            {" · "}
            <strong className="text-foreground">Pending approvals:</strong>{" "}
            {overviewLoading ? "..." : overview?.pendingVendorApprovals ?? 0}
          </div>
          <Button variant="outline" className="w-full mt-4">
            View Full Audit Log <ArrowUpRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
