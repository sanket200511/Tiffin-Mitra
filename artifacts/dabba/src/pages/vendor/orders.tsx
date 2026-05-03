import { useState } from "react";
import { useListOrders, useUpdateOrderStatus, useGetMyVendorProfile } from "@workspace/api-client-react";
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
  Bike
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
import { useToast } from "@/hooks/use-toast";

export default function VendorOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: profileData } = useGetMyVendorProfile();
  const vendorId = profileData?.vendor?.id;

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  
  const { data: ordersData, isLoading } = useListOrders({
    vendorId,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    date: dateFilter
  }, {
    query: { enabled: !!vendorId, queryKey: ["/api/orders", { vendorId, status: statusFilter, date: dateFilter }] }
  });

  const orders = ordersData?.orders || [];

  const updateStatus = useUpdateOrderStatus({
    mutation: {
      onSuccess: () => {
        toast({ title: "Order status updated" });
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/vendors/me/stats"] });
      }
    }
  });

  const handleStatusChange = (orderId: string, newStatus: any) => {
    updateStatus.mutate({ id: orderId, data: { status: newStatus } });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending': return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'Pending' };
      case 'accepted': return { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle2, label: 'Accepted' };
      case 'preparing': return { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: ChefHat, label: 'Preparing' };
      case 'packed': return { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Package, label: 'Packed' };
      case 'picked_up': return { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: Bike, label: 'Picked Up' };
      case 'delivered': return { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2, label: 'Delivered' };
      case 'cancelled': return { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle, label: 'Cancelled' };
      default: return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Clock, label: status };
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Order Pipeline</h1>
        <p className="text-muted-foreground mt-1">Manage today's preparation and delivery schedule.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="w-full sm:w-48">
          <Input 
            type="date" 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full"
          />
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
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="packed">Packed</SelectItem>
              <SelectItem value="picked_up">Picked Up</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search customer name or ID..." className="pl-9" />
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[100px]">Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Meal Type</TableHead>
              <TableHead>Delivery Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 ml-auto rounded-md" /></TableCell>
                </TableRow>
              ))
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <ShoppingBag className="w-10 h-10 text-muted-foreground/30" />
                    <p>No orders found for this date and filters.</p>
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
                      <div className="font-medium">{order.customerName || "Anonymous"}</div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {order.mealType || "Standard"}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate text-sm" title={order.deliveryAddress || ""}>
                        {order.deliveryAddress || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-medium border ${config.color} px-2.5 py-0.5 flex w-fit items-center gap-1.5`}>
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'accepted')} disabled={order.status === 'accepted' || order.status === 'cancelled'}>
                            Accept Order
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'preparing')} disabled={order.status === 'preparing' || order.status === 'cancelled'}>
                            Mark as Preparing
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'packed')} disabled={order.status === 'packed' || order.status === 'cancelled'}>
                            Mark as Packed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'picked_up')} disabled={order.status === 'picked_up' || order.status === 'cancelled'}>
                            Handed to Delivery
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'delivered')} disabled={order.status === 'delivered' || order.status === 'cancelled'}>
                            Mark as Delivered
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => handleStatusChange(order.id, 'cancelled')} disabled={order.status === 'cancelled' || order.status === 'delivered'}>
                            Cancel Order
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
