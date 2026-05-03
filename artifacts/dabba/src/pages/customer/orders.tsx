import { useState } from "react";
import { useListOrders } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Search, Filter, ShoppingBag, Clock, CheckCircle2, AlertCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { data: ordersData, isLoading } = useListOrders({
    status: statusFilter !== "all" ? statusFilter as any : undefined
  });

  const orders = ordersData?.orders || [];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'delivered': return { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 };
      case 'pending': return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock };
      case 'cancelled': return { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle };
      default: return { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock };
    }
  };

  return (
    <div className="container py-8 max-w-5xl min-h-screen space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Order History</h1>
        <p className="text-muted-foreground mt-1">Track your daily deliveries and past orders</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search orders..." className="pl-9" />
        </div>
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[120px]">Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Kitchen</TableHead>
              <TableHead>Meal</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                </TableRow>
              ))
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <ShoppingBag className="w-10 h-10 text-muted-foreground/30" />
                    <p>No orders found matching your filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const config = getStatusConfig(order.status);
                const Icon = config.icon;
                
                return (
                  <TableRow key={order.id} className="hover:bg-muted/20">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{order.id.substring(0, 8)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{format(new Date(order.scheduledDate), "MMM d, yyyy")}</div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.vendorName}
                    </TableCell>
                    <TableCell className="capitalize">
                      {order.mealType || "Standard"}
                    </TableCell>
                    <TableCell>
                      ₹{order.totalAmount}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize font-medium border ${config.color} px-2.5 py-0.5 flex w-fit items-center gap-1`}>
                        <Icon className="w-3 h-3" />
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
