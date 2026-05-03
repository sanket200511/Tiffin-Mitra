import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft, User, Phone, MapPin, Wallet, Gift, ShoppingBag, CalendarDays,
  TrendingUp, IndianRupee, Plus, Minus, CheckCircle2, XCircle, Clock,
  ChefHat, Package, Bike, AlertCircle, ArrowUpCircle, ArrowDownCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

type CustomerDetail = {
  customer: {
    id: string;
    name: string | null;
    phone: string | null;
    city: string | null;
    defaultDeliveryAddress: string | null;
    walletBalance: string | number;
    loyaltyPoints: number | null;
    createdAt: string;
  };
  subscriptions: Array<{
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    planType: string | null;
    planPrice: string | null;
    planId: string | null;
    vendorId: string | null;
    deliverySlot: string | null;
    deliveryAddress: string | null;
    walletBalance: string | null;
    createdAt: string;
    planName: string | null;
    vendorName: string | null;
    vendorCity: string | null;
  }>;
  orders: Array<{
    id: string;
    status: string;
    scheduledDate: string;
    totalAmount: string | number;
    mealType: string | null;
    vendorId: string | null;
  }>;
  transactions: Array<{
    id: string;
    type: string;
    amount: string | number;
    description: string | null;
    createdAt: string;
  }>;
  totalSpend: number;
};

const SUB_STATUS_COLORS: Record<string, string> = {
  active:    "bg-green-100 text-green-800 border-green-200",
  paused:    "bg-amber-100 text-amber-800 border-amber-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  expired:   "bg-gray-100 text-gray-700 border-gray-200",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800 border-yellow-200",
  accepted:  "bg-blue-100 text-blue-800 border-blue-200",
  preparing: "bg-orange-100 text-orange-800 border-orange-200",
  packed:    "bg-purple-100 text-purple-800 border-purple-200",
  picked_up: "bg-indigo-100 text-indigo-800 border-indigo-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const ORDER_STATUS_ICONS: Record<string, typeof Clock> = {
  pending:   Clock,
  accepted:  CheckCircle2,
  preparing: ChefHat,
  packed:    Package,
  picked_up: Bike,
  delivered: CheckCircle2,
  cancelled: XCircle,
};

export default function AdminCustomerDetail() {
  const { customerId } = useParams<{ customerId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [walletOpen, setWalletOpen]   = useState(false);
  const [walletType, setWalletType]   = useState<"credit" | "debit">("credit");
  const [walletAmount, setWalletAmount] = useState("");
  const [walletDesc, setWalletDesc]   = useState("");

  const { data, isLoading, isError } = useQuery<CustomerDetail>({
    queryKey: ["/api/customers", customerId],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${customerId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load customer");
      return res.json();
    },
    enabled: !!customerId,
  });

  const walletMutation = useMutation({
    mutationFn: async ({ amount, type, description }: { amount: number; type: "credit" | "debit"; description: string }) => {
      const res = await fetch(`/api/customers/${customerId}/wallet-credit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, type, description }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: `Wallet ${walletType === "credit" ? "credited" : "debited"} successfully` });
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers", "admin"] });
      setWalletOpen(false);
      setWalletAmount("");
      setWalletDesc("");
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const handleWalletSubmit = () => {
    const amount = parseFloat(walletAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: "destructive", title: "Invalid amount" });
      return;
    }
    walletMutation.mutate({ amount, type: walletType, description: walletDesc || `Admin ${walletType} of ₹${amount}` });
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto text-center py-24">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Customer not found</h2>
        <Button variant="outline" asChild><Link href="/admin/customers">Back to Customers</Link></Button>
      </div>
    );
  }

  const { customer, subscriptions, orders, transactions, totalSpend } = data;
  const walletBalance = parseFloat(String(customer.walletBalance ?? 0));
  const activeSubs = subscriptions.filter(s => s.status === "active").length;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="-ml-2">
          <Link href="/admin/customers"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-serif font-bold text-foreground">
            {customer.name || "Unnamed Customer"}
          </h1>
          <p className="text-muted-foreground mt-0.5 flex items-center gap-3 text-sm">
            {customer.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{customer.phone}</span>}
            {customer.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{customer.city}</span>}
            <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />Joined {format(new Date(customer.createdAt), "MMM d, yyyy")}</span>
          </p>
        </div>
        <Button size="sm" onClick={() => { setWalletType("credit"); setWalletOpen(true); }}>
          <Wallet className="w-4 h-4 mr-2" /> Adjust Wallet
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardContent className="p-5">
            <div className="flex items-center justify-between pb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Wallet Balance</p>
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">₹{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground mt-1">
              <Gift className="inline w-3 h-3 mr-0.5 text-amber-500" />
              {customer.loyaltyPoints ?? 0} loyalty pts
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-green-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between pb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Spend</p>
              <IndianRupee className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold">₹{totalSpend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
            <p className="text-xs text-muted-foreground mt-1">{orders.length} orders total</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between pb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subscriptions</p>
              <ChefHat className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{subscriptions.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{activeSubs} active</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-purple-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between pb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Wallet Txns</p>
              <TrendingUp className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">{transactions.length}</p>
            <p className="text-xs text-muted-foreground mt-1">last 30 transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Delivery address */}
      {customer.defaultDeliveryAddress && (
        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-start gap-3">
            <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Default Delivery Address</p>
              <p className="text-sm">{customer.defaultDeliveryAddress}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscriptions */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Subscriptions</CardTitle>
          <CardDescription>{subscriptions.length} total subscription{subscriptions.length !== 1 ? "s" : ""}</CardDescription>
        </CardHeader>
        {subscriptions.length === 0 ? (
          <CardContent>
            <p className="text-sm text-muted-foreground py-6 text-center">No subscriptions yet.</p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Kitchen / Plan</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Slot</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map(sub => (
                  <TableRow key={sub.id} className="hover:bg-muted/20">
                    <TableCell>
                      <p className="font-medium text-sm">{sub.vendorName || "—"}</p>
                      <p className="text-xs text-muted-foreground">{sub.planName || "—"}</p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(sub.startDate), "MMM d")} – {format(new Date(sub.endDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{sub.deliverySlot || "—"}</TableCell>
                    <TableCell className="font-medium text-sm">
                      {sub.planPrice ? `₹${parseFloat(sub.planPrice).toFixed(0)}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs border ${SUB_STATUS_COLORS[sub.status] ?? ""} capitalize`}>
                        {sub.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Recent Orders */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recent Orders</CardTitle>
          <CardDescription>Last {orders.length} orders</CardDescription>
        </CardHeader>
        {orders.length === 0 ? (
          <CardContent>
            <p className="text-sm text-muted-foreground py-6 text-center">No orders yet.</p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[520px]">
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Date</TableHead>
                  <TableHead>Meal</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map(order => {
                  const cfg = ORDER_STATUS_COLORS[order.status] ?? ORDER_STATUS_COLORS.pending;
                  const Icon = ORDER_STATUS_ICONS[order.status] ?? Clock;
                  return (
                    <TableRow key={order.id} className="hover:bg-muted/20">
                      <TableCell className="text-sm">{format(new Date(order.scheduledDate), "MMM d, yyyy")}</TableCell>
                      <TableCell className="capitalize text-sm">{order.mealType || "Standard"}</TableCell>
                      <TableCell className="font-medium text-sm">
                        ₹{parseFloat(String(order.totalAmount)).toFixed(0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs border ${cfg} flex w-fit items-center gap-1`}>
                          <Icon className="w-3 h-3" />
                          <span className="capitalize">{order.status.replace("_", " ")}</span>
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Wallet Transactions */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Wallet Transactions</CardTitle>
          <CardDescription>Last {transactions.length} transactions</CardDescription>
        </CardHeader>
        {transactions.length === 0 ? (
          <CardContent>
            <p className="text-sm text-muted-foreground py-6 text-center">No transactions yet.</p>
          </CardContent>
        ) : (
          <ScrollArea className="max-h-[360px]">
            <div className="divide-y">
              {transactions.map((txn, idx) => {
                const isCredit = txn.type === "credit";
                return (
                  <div key={txn.id}>
                    <div className="flex items-center gap-4 px-6 py-3 hover:bg-muted/30 transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isCredit ? "bg-green-100" : "bg-red-100"}`}>
                        {isCredit
                          ? <ArrowUpCircle className="w-4 h-4 text-green-600" />
                          : <ArrowDownCircle className="w-4 h-4 text-red-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{txn.description || (isCredit ? "Credit" : "Debit")}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(txn.createdAt), "dd MMM yyyy, h:mm a")}
                        </p>
                      </div>
                      <p className={`text-sm font-bold shrink-0 ${isCredit ? "text-green-600" : "text-red-600"}`}>
                        {isCredit ? "+" : "−"}₹{parseFloat(String(txn.amount)).toFixed(2)}
                      </p>
                    </div>
                    {idx < transactions.length - 1 && <Separator className="mx-6" />}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </Card>

      {/* Wallet adjustment dialog */}
      <Dialog open={walletOpen} onOpenChange={(open) => { if (!open) setWalletOpen(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Adjust Wallet Balance</DialogTitle>
            <DialogDescription>
              Customer: <strong>{customer.name || "Unknown"}</strong><br />
              Current balance: <strong>₹{walletBalance.toFixed(2)}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-4">
            <div className="space-y-1.5">
              <Label>Operation</Label>
              <div className="flex gap-2">
                <Button type="button" variant={walletType === "credit" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setWalletType("credit")}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Credit
                </Button>
                <Button type="button" variant={walletType === "debit" ? "destructive" : "outline"} size="sm" className="flex-1" onClick={() => setWalletType("debit")}>
                  <Minus className="w-3.5 h-3.5 mr-1" /> Debit
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amt">Amount (₹)</Label>
              <Input id="amt" type="number" min={1} placeholder="Enter amount" value={walletAmount} onChange={e => setWalletAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Reason <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea id="desc" placeholder="e.g. Goodwill refund for late delivery..." className="resize-none h-16" value={walletDesc} onChange={e => setWalletDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWalletOpen(false)}>Cancel</Button>
            <Button
              variant={walletType === "debit" ? "destructive" : "default"}
              disabled={walletMutation.isPending || !walletAmount || parseFloat(walletAmount) <= 0}
              onClick={handleWalletSubmit}
            >
              {walletMutation.isPending ? "Saving..." : `${walletType === "credit" ? "Credit" : "Debit"} Wallet`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
