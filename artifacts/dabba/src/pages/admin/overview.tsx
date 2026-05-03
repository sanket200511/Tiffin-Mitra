import { useGetPlatformOverview, useListVendors } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, Store, Users, ShoppingBag, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function AdminOverview() {
  const { data: overviewData, isLoading: overviewLoading } = useGetPlatformOverview();
  const overview = overviewData?.overview;

  const { data: vendorsData, isLoading: vendorsLoading } = useListVendors();
  const vendors = vendorsData?.vendors || [];

  // Filter pending vendors
  const pendingVendors = vendors.filter(v => v.status === 'pending');

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
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Total GMV</p>
              <IndianRupee className="h-4 w-4 text-green-500" />
            </div>
            {overviewLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-3xl font-bold">₹{overview?.platformGMV?.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Kitchens</p>
              <Store className="h-4 w-4 text-orange-500" />
            </div>
            {overviewLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-3xl font-bold">{overview?.totalVendors || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">{overview?.activeVendors || 0} active</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            {overviewLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-3xl font-bold">{overview?.totalCustomers || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Active Subs</p>
              <ShoppingBag className="h-4 w-4 text-purple-500" />
            </div>
            {overviewLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-3xl font-bold">{overview?.activeSubscriptions || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>Kitchens Awaiting Approval</CardTitle>
          </CardHeader>
          <CardContent>
            {vendorsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
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
                    <TableHead>Applied</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingVendors.map(vendor => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">{vendor.name}</TableCell>
                      <TableCell>{vendor.city}</TableCell>
                      <TableCell>{format(new Date(vendor.createdAt), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline">Review</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 border rounded-lg bg-green-50/50">
              <span className="font-medium text-sm">API Services</span>
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Operational</Badge>
            </div>
            <div className="flex justify-between items-center p-3 border rounded-lg bg-green-50/50">
              <span className="font-medium text-sm">Payment Gateway</span>
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Operational</Badge>
            </div>
            <div className="flex justify-between items-center p-3 border rounded-lg bg-green-50/50">
              <span className="font-medium text-sm">Notification Service</span>
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Operational</Badge>
            </div>
            
            <div className="pt-4">
              <Button variant="outline" className="w-full">
                View System Logs <ArrowUpRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
