import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Users, Search, Wallet, CalendarDays, ShoppingBag, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type AdminCustomer = {
  id: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  walletBalance: string | number;
  loyaltyPoints: number | null;
  createdAt: string;
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalOrders: number;
  totalSpend: number;
};

export default function AdminCustomers() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["/api/customers", "admin"],
    queryFn: async () => {
      const res = await fetch("/api/customers", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json() as Promise<{ customers: AdminCustomer[] }>;
    },
  });

  const customers = data?.customers || [];

  const filtered = search.trim()
    ? customers.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.city?.toLowerCase().includes(search.toLowerCase())
      )
    : customers;

  const totalActive = customers.filter(c => c.activeSubscriptions > 0).length;
  const totalGMV = customers.reduce((sum, c) => sum + c.totalSpend, 0);
  const avgWallet = customers.length > 0
    ? customers.reduce((sum, c) => sum + parseFloat(String(c.walletBalance || 0)), 0) / customers.length
    : 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Customers</h1>
        <p className="text-muted-foreground mt-1">All registered customers and their account activity.</p>
      </div>

      {/* KPI row */}
      <div className="grid sm:grid-cols-3 gap-6">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-3xl font-bold">{customers.length}</div>
                <p className="text-xs text-muted-foreground mt-1">{totalActive} with active subscriptions</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Customer GMV</p>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <>
                <div className="text-3xl font-bold">₹{totalGMV.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                <p className="text-xs text-muted-foreground mt-1">Total spend across all customers</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Avg. Wallet Balance</p>
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-3xl font-bold">₹{avgWallet.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                <p className="text-xs text-muted-foreground mt-1">Average credit balance</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name or city..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card className="shadow-sm overflow-hidden overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Customer</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Wallet</TableHead>
              <TableHead>Active Subs</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Total Spend</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full max-w-[100px]" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  {search ? "No customers match your search." : "No customers registered yet."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(customer => (
                <TableRow key={customer.id} className="hover:bg-muted/20">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                        {(customer.name || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{customer.name || "Unnamed"}</p>
                        {customer.phone && <p className="text-xs text-muted-foreground">{customer.phone}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{customer.city || <span className="text-muted-foreground/50">—</span>}</TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">
                      ₹{parseFloat(String(customer.walletBalance || 0)).toFixed(0)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {customer.activeSubscriptions > 0 ? (
                      <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700 text-xs">
                        {customer.activeSubscriptions} active
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm">{customer.totalOrders}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    ₹{customer.totalSpend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {format(new Date(customer.createdAt), "MMM d, yyyy")}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
