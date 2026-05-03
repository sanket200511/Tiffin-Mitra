import { useState } from "react";
import { useGetPlatformOverview, useListVendors, useUpdateVendor } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, Store, Users, ShoppingBag, ArrowUpRight, Star, Percent, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";

const TIER_COLORS: Record<string, string> = {
  basic: "bg-slate-100 text-slate-700 border-slate-200",
  pro: "bg-blue-100 text-blue-700 border-blue-200",
  enterprise: "bg-purple-100 text-purple-700 border-purple-200",
};

export default function AdminOverview() {
  const { data: overviewData, isLoading: overviewLoading } = useGetPlatformOverview();
  const overview = overviewData?.overview;

  const { data: vendorsData, isLoading: vendorsLoading, refetch: refetchVendors } = useListVendors();
  const vendors = vendorsData?.vendors || [];
  const { mutate: updateVendor } = useUpdateVendor();

  const [tab, setTab] = useState<"pending" | "all">("pending");

  const pendingVendors = vendors.filter(v => v.status === "pending");
  const approvedVendors = vendors.filter(v => v.status === "approved");

  function toggleFeatured(vendorId: string, current: boolean) {
    updateVendor(
      { vendorId, data: { featured: !current } as never },
      { onSuccess: () => refetchVendors() }
    );
  }

  function approveVendor(vendorId: string) {
    updateVendor(
      { vendorId, data: { status: "approved" } as never },
      { onSuccess: () => refetchVendors() }
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
                <p className="text-xs text-muted-foreground mt-1">{overview?.activeVendors || 0} active · {overview?.featuredVendors || 0} featured</p>
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
                Pending {pendingVendors.length > 0 && <span className="ml-1.5 bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{pendingVendors.length}</span>}
              </Button>
              <Button
                size="sm"
                variant={tab === "all" ? "default" : "outline"}
                onClick={() => setTab("all")}
              >
                All Active
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
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingVendors.map(vendor => (
                      <TableRow key={vendor.id}>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell>{vendor.city}</TableCell>
                        <TableCell>{vendor.cuisineType}</TableCell>
                        <TableCell>{format(new Date(vendor.createdAt), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => approveVendor(vendor.id)}>Approve</Button>
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
                      <TableHead>Commission</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Featured</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedVendors.map(vendor => (
                      <TableRow key={vendor.id}>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell>{vendor.city}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={TIER_COLORS[vendor.subscriptionTier] || TIER_COLORS.basic}>
                            {vendor.subscriptionTier}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm font-medium">{vendor.commissionRate ?? 10}%</span>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* System Status */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            {["API Services", "Payment Gateway", "Notification Service"].map(service => (
              <div key={service} className="flex justify-between items-center p-3 border rounded-lg bg-green-50/50">
                <span className="font-medium text-sm">{service}</span>
                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Operational</Badge>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-2">
            View System Logs <ArrowUpRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
