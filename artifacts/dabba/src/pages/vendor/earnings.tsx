import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetVendorStats, useGetVendorRevenueTrend, useGetMyVendorProfile } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  IndianRupee, TrendingUp, Percent, Wallet, ArrowDownRight, ArrowUpRight, ArrowLeft,
  Plus, Clock, CheckCircle2, XCircle, Loader2, AlertCircle,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type PayoutRequest = {
  id: string;
  amount: string;
  upiId: string | null;
  bankAccount: string | null;
  ifscCode: string | null;
  accountName: string | null;
  notes: string | null;
  status: "pending" | "processing" | "paid" | "rejected";
  adminNotes: string | null;
  processedAt: string | null;
  createdAt: string;
};

const PAYOUT_STATUS: Record<string, { label: string; color: string; icon: any }> = {
  pending:    { label: "Pending",    color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-800 border-blue-200",       icon: Loader2 },
  paid:       { label: "Paid",       color: "bg-green-100 text-green-800 border-green-200",    icon: CheckCircle2 },
  rejected:   { label: "Rejected",   color: "bg-red-100 text-red-800 border-red-200",          icon: XCircle },
};

// ─── Payout request dialog ────────────────────────────────────────────────────
function RequestPayoutDialog({ netEarnings }: { netEarnings: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "bank">("upi");
  const [upiId, setUpiId] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/payouts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          upiId: paymentMethod === "upi" ? upiId : undefined,
          bankAccount: paymentMethod === "bank" ? bankAccount : undefined,
          ifscCode: paymentMethod === "bank" ? ifscCode : undefined,
          accountName: paymentMethod === "bank" ? accountName : undefined,
          notes,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error || "Failed to submit payout request");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Payout request submitted", description: "We'll review and process it within 3 business days." });
      queryClient.invalidateQueries({ queryKey: ["/api/payouts/mine"] });
      setOpen(false);
      setAmount(""); setUpiId(""); setBankAccount(""); setIfscCode(""); setAccountName(""); setNotes("");
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const amtNum = parseFloat(amount) || 0;
  const isValidAmount = amtNum > 0 && amtNum <= netEarnings;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={netEarnings <= 0}>
          <Plus className="w-4 h-4 mr-2" /> Request Payout
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">Request a Payout</DialogTitle>
          <DialogDescription>
            Your net earnings available for withdrawal: <strong>₹{netEarnings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong>.
            Payouts are processed within 3 business days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="payout-amount">Amount (₹)</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="payout-amount"
                type="number"
                min={1}
                max={netEarnings}
                step={100}
                className="pl-8"
                placeholder="Enter amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
            {amtNum > netEarnings && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Exceeds available net earnings.
              </p>
            )}
          </div>

          {/* Payment method */}
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <div className="flex gap-2">
              <Button type="button" variant={paymentMethod === "upi" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setPaymentMethod("upi")}>
                UPI
              </Button>
              <Button type="button" variant={paymentMethod === "bank" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setPaymentMethod("bank")}>
                Bank Transfer
              </Button>
            </div>
          </div>

          {paymentMethod === "upi" ? (
            <div className="space-y-1.5">
              <Label htmlFor="upi-id">UPI ID</Label>
              <Input id="upi-id" placeholder="yourname@upi" value={upiId} onChange={e => setUpiId(e.target.value)} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="account-name">Account Holder Name</Label>
                <Input id="account-name" placeholder="As per bank records" value={accountName} onChange={e => setAccountName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bank-account">Account Number</Label>
                <Input id="bank-account" placeholder="Bank account number" value={bankAccount} onChange={e => setBankAccount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ifsc">IFSC Code</Label>
                <Input id="ifsc" placeholder="e.g. SBIN0001234" value={ifscCode} onChange={e => setIfscCode(e.target.value)} />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea id="notes" placeholder="Any notes for the finance team..." className="resize-none h-16" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !isValidAmount || (paymentMethod === "upi" ? !upiId.trim() : !bankAccount.trim() || !ifscCode.trim())}
          >
            {mutation.isPending ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function VendorEarnings() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  const { data: profileData, isLoading: profileLoading } = useGetMyVendorProfile();
  const vendor   = profileData?.vendor;
  const vendorId = vendor?.id;
  const commissionRate = vendor?.commissionRate ? parseFloat(String(vendor.commissionRate)) : 10;

  const { data: statsData, isLoading: statsLoading } = useGetVendorStats(vendorId ?? "", {
    query: { enabled: !!vendorId, queryKey: ["/api/vendors/stats", vendorId] }
  });
  const stats = statsData?.stats;

  const { data: trendData, isLoading: trendLoading } = useGetVendorRevenueTrend(vendorId ?? "", { period }, {
    query: { enabled: !!vendorId, queryKey: ["/api/analytics/vendor/revenue/earnings", vendorId, { period }] }
  });
  const trend = trendData?.trend || [];

  const { data: payoutsData, isLoading: payoutsLoading } = useQuery({
    queryKey: ["/api/payouts/mine"],
    queryFn: () => fetch("/api/payouts", { credentials: "include" }).then(r => r.json()),
    enabled: !!vendorId,
  });
  const payouts: PayoutRequest[] = payoutsData?.payouts || [];

  const isLoading = profileLoading || statsLoading;

  const grossRevenue    = stats?.totalRevenue ?? 0;
  const commissionAmount = grossRevenue * (commissionRate / 100);
  const netEarnings     = grossRevenue - commissionAmount;
  const monthlyGross    = stats?.monthlyRevenue ?? 0;
  const monthlyNet      = monthlyGross * (1 - commissionRate / 100);

  const totalPaidOut    = payouts.filter(p => p.status === "paid").reduce((s, p) => s + parseFloat(p.amount), 0);
  const pendingPayout   = payouts.filter(p => p.status === "pending" || p.status === "processing").reduce((s, p) => s + parseFloat(p.amount), 0);
  const availableToWithdraw = Math.max(0, netEarnings - totalPaidOut - pendingPayout);

  const chartData = trend.map(point => ({
    displayDate: format(parseISO(point.date), "MMM d"),
    Gross: parseFloat(point.revenue.toFixed(2)),
    Net: parseFloat((point.revenue * (1 - commissionRate / 100)).toFixed(2)),
  }));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild className="lg:hidden shrink-0">
          <a href="/vendor/dashboard"><ArrowLeft className="w-5 h-5" /></a>
        </Button>
        <div className="flex-1 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Earnings</h1>
            <p className="text-muted-foreground mt-1">Your revenue, commission deductions, and net payouts.</p>
          </div>
          {vendor && (
            <Badge variant="outline" className="shrink-0 text-sm px-3 py-1.5 bg-slate-100 text-slate-700 border-slate-200">
              {commissionRate}% commission
            </Badge>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-sm border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Gross Revenue</p>
              <IndianRupee className="h-4 w-4 text-green-500" />
            </div>
            {isLoading ? <Skeleton className="h-8 w-28" /> : (
              <>
                <div className="text-3xl font-bold">₹{grossRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                <p className="text-xs text-muted-foreground mt-1">All time (all orders)</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-red-400">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Platform Commission</p>
              <Percent className="h-4 w-4 text-red-400" />
            </div>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <>
                <div className="text-3xl font-bold text-red-500">₹{commissionAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowDownRight className="w-3 h-3 text-red-400" />
                  <p className="text-xs text-muted-foreground">{commissionRate}% of gross</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Net Earnings</p>
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            {isLoading ? <Skeleton className="h-8 w-28" /> : (
              <>
                <div className="text-3xl font-bold text-primary">₹{netEarnings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="w-3 h-3 text-green-500" />
                  <p className="text-xs text-muted-foreground">{(100 - commissionRate)}% retained</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">This Month (Net)</p>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <>
                <div className="text-3xl font-bold">₹{monthlyNet.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                <p className="text-xs text-muted-foreground mt-1">After {commissionRate}% platform fee</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Gross vs Net Revenue</CardTitle>
            <CardDescription>Daily comparison of what you earn vs what you keep after platform commission</CardDescription>
          </div>
          <div className="w-36">
            <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : chartData.length === 0 || chartData.every(d => d.Gross === 0) ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-2">
              <TrendingUp className="w-10 h-10 opacity-20" />
              <p>No revenue data yet for this period.</p>
            </div>
          ) : (
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                    formatter={(value: number, name: string) => [`₹${value.toFixed(0)}`, name]}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="Gross" stroke="#94a3b8" strokeWidth={2} fill="url(#grossGrad)" />
                  <Area type="monotone" dataKey="Net" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#netGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Withdrawal summary */}
        <Card className="shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Withdrawal Summary</CardTitle>
            <CardDescription>Track your payout history</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </>
            ) : (
              <>
                <div className="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-sm font-medium text-green-800">Total Paid Out</span>
                  <span className="font-bold text-green-700">₹{totalPaidOut.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <span className="text-sm font-medium text-yellow-800">In Progress</span>
                  <span className="font-bold text-yellow-700">₹{pendingPayout.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <span className="text-sm font-medium text-primary">Available to Withdraw</span>
                  <span className="font-bold text-primary">₹{availableToWithdraw.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="pt-2">
                  <RequestPayoutDialog netEarnings={availableToWithdraw} />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Payout request history */}
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Payout Requests</CardTitle>
            <CardDescription>History of your withdrawal requests</CardDescription>
          </CardHeader>
          <CardContent>
            {payoutsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : payouts.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <Wallet className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No payout requests yet.</p>
                <p className="text-xs mt-1">Click "Request Payout" when you're ready to withdraw.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payouts.map(p => {
                  const cfg = PAYOUT_STATUS[p.status] ?? PAYOUT_STATUS.pending;
                  const Icon = cfg.icon;
                  return (
                    <div key={p.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/20">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">₹{parseFloat(p.amount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                          <Badge variant="outline" className={`text-xs border ${cfg.color} shrink-0`}>{cfg.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p.upiId ? `UPI: ${p.upiId}` : p.bankAccount ? `Bank: ••••${p.bankAccount.slice(-4)}` : "Payment details on file"}
                          {" · "}
                          {format(new Date(p.createdAt), "dd MMM yyyy")}
                        </p>
                        {p.adminNotes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">Admin: {p.adminNotes}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
