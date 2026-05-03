import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Users, Search, Wallet, CalendarDays, ShoppingBag, TrendingUp, Plus, Minus, Eye, Download } from "lucide-react";
import { Link } from "wouter";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

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
  const [walletDialog, setWalletDialog] = useState<AdminCustomer | null>(null);
  const [walletAmount, setWalletAmount] = useState("");
  const [walletType, setWalletType] = useState<"credit" | "debit">("credit");
  const [walletDesc, setWalletDesc] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/customers", "admin"],
    queryFn: async () => {
      const res = await fetch("/api/customers", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json() as Promise<{ customers: AdminCustomer[] }>;
    },
  });

  const walletMutation = useMutation({
    mutationFn: async ({ customerId, amount, type, description }: {
      customerId: string;
      amount: number;
      type: "credit" | "debit";
      description: string;
    }) => {
      const res = await fetch(`/api/customers/${customerId}/wallet-credit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, type, description }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error || "Failed to update wallet");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: `Wallet ${walletType === "credit" ? "credited" : "debited"} successfully` });
      queryClient.invalidateQueries({ queryKey: ["/api/customers", "admin"] });
      setWalletDialog(null);
      setWalletAmount("");
      setWalletDesc("");
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const handleWalletSubmit = () => {
    if (!walletDialog) return;
    const amount = parseFloat(walletAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: "destructive", title: "Invalid amount" });
      return;
    }
    walletMutation.mutate({
      customerId: walletDialog.id,
      amount,
      type: walletType,
      description: walletDesc || `Admin ${walletType} of ₹${amount}`,
    });
  };

  const customers = data?.customers || [];

  const filtered = search.trim()
    ? customers.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.city?.toLowerCase().includes(search.toLowerCase())
      )
    : customers;

  function exportCSV(list: AdminCustomer[]) {
    const headers = ["Name", "Phone", "City", "Wallet Balance", "Loyalty Points", "Active Subs", "Total Orders", "Total Spend", "Joined"];
    const rows = list.map(c => [
      c.name ?? "",
      c.phone ?? "",
      c.city ?? "",
      parseFloat(String(c.walletBalance || 0)).toFixed(2),
      String(c.loyaltyPoints ?? 0),
      String(c.activeSubscriptions),
      String(c.totalOrders),
      c.totalSpend.toFixed(2),
      format(new Date(c.createdAt), "dd MMM yyyy"),
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalActive = customers.filter(c => c.activeSubscriptions > 0).length;
  const totalGMV    = customers.reduce((sum, c) => sum + c.totalSpend, 0);
  const avgWallet   = customers.length > 0
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

      {/* Search + Export */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-10 shrink-0"
          disabled={filtered.length === 0}
          onClick={() => exportCSV(filtered)}
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <Card className="shadow-sm overflow-hidden overflow-x-auto">
        <Table className="min-w-[780px]">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Customer</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Wallet</TableHead>
              <TableHead>Active Subs</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Total Spend</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full max-w-[100px]" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-40 text-center text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  {search ? "No customers match your search." : "No customers registered yet."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(customer => (
                <TableRow key={customer.id} className="hover:bg-muted/20">
                  <TableCell>
                    <Link href={`/admin/customers/${customer.id}`} className="flex items-center gap-3 hover:text-primary transition-colors group/name">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                        {(customer.name || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm group-hover/name:underline">{customer.name || "Unnamed"}</p>
                        {customer.phone && <p className="text-xs text-muted-foreground">{customer.phone}</p>}
                      </div>
                    </Link>
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
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                        <Link href={`/admin/customers/${customer.id}`}>
                          <Eye className="w-3 h-3 mr-1" /> View
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          setWalletDialog(customer);
                          setWalletType("credit");
                          setWalletAmount("");
                          setWalletDesc("");
                        }}
                      >
                        <Wallet className="w-3 h-3 mr-1" /> Wallet
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Wallet credit/debit dialog */}
      <Dialog open={!!walletDialog} onOpenChange={(open) => { if (!open) setWalletDialog(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Adjust Wallet Balance</DialogTitle>
            <DialogDescription>
              Customer: <strong>{walletDialog?.name || "Unknown"}</strong><br />
              Current balance: <strong>₹{parseFloat(String(walletDialog?.walletBalance ?? 0)).toFixed(2)}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-4">
            {/* Credit / Debit toggle */}
            <div className="space-y-1.5">
              <Label>Operation</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={walletType === "credit" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setWalletType("credit")}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Credit
                </Button>
                <Button
                  type="button"
                  variant={walletType === "debit" ? "destructive" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setWalletType("debit")}
                >
                  <Minus className="w-3.5 h-3.5 mr-1" /> Debit
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wallet-amount">Amount (₹)</Label>
              <Input
                id="wallet-amount"
                type="number"
                min={1}
                placeholder="Enter amount"
                value={walletAmount}
                onChange={e => setWalletAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wallet-desc">
                Reason <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="wallet-desc"
                placeholder="e.g. Goodwill refund for delivery issue on 3 May..."
                className="resize-none h-16"
                value={walletDesc}
                onChange={e => setWalletDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWalletDialog(null)}>Cancel</Button>
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
