import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Wallet, ArrowDownLeft, ArrowUpRight, Plus, IndianRupee,
  Gift, TrendingUp, AlertCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

type WalletData = {
  balance: number;
  loyaltyPoints: number;
  transactions: {
    id: string;
    type: "credit" | "debit";
    amount: string;
    description: string;
    createdAt: string;
  }[];
};

const QUICK_AMOUNTS = [200, 500, 1000, 2000];

export default function CustomerWallet() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const { data, isLoading } = useQuery<{ wallet: WalletData }>({
    queryKey: ["/api/customers/wallet"],
    queryFn: async () => {
      const res = await fetch("/api/customers/wallet", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load wallet");
      return res.json();
    },
  });

  const topup = useMutation({
    mutationFn: async (amount: number) => {
      const res = await fetch("/api/customers/wallet/topup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any)?.error || "Top-up failed");
      }
      return res.json();
    },
    onSuccess: (_data, amount) => {
      toast({ title: "Wallet credited", description: `₹${amount} added to your Dabba Wallet.` });
      queryClient.invalidateQueries({ queryKey: ["/api/customers/wallet"] });
      setCustomAmount("");
      setSelectedAmount(null);
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Top-up failed", description: err.message });
    },
  });

  const effectiveAmount = selectedAmount ?? (customAmount ? parseFloat(customAmount) : null);

  const handleTopup = () => {
    if (!effectiveAmount || effectiveAmount <= 0) return;
    topup.mutate(effectiveAmount);
  };

  const wallet = data?.wallet;

  return (
    <div className="container max-w-3xl py-8 min-h-screen space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Dabba Wallet</h1>
        <p className="text-muted-foreground mt-1">Add money and track your spending on tiffin deliveries.</p>
      </div>

      {/* Balance + Loyalty */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="bg-primary text-primary-foreground shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4 opacity-80">
              <Wallet className="w-5 h-5" />
              <span className="text-sm font-medium">Available Balance</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-12 w-32 bg-primary-foreground/20" />
            ) : (
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold font-serif">
                  ₹{(wallet?.balance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <p className="text-xs opacity-70 mt-2">Auto-deducted daily for active subscriptions</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <Gift className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-medium">Loyalty Points</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-12 w-24" />
            ) : (
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold font-serif">{wallet?.loyaltyPoints ?? 0}</span>
                <span className="text-muted-foreground text-sm mb-1">pts</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">Earn 1 point per ₹10 spent</p>
          </CardContent>
        </Card>
      </div>

      {/* Top-up section */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" /> Add Money
          </CardTitle>
          <CardDescription>Funds go directly into your wallet and are used for daily tiffin deductions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Quick amounts */}
          <div>
            <p className="text-sm font-medium mb-3">Quick select</p>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => { setSelectedAmount(amt); setCustomAmount(""); }}
                  className={`
                    rounded-lg border py-3 text-sm font-semibold transition-all
                    ${selectedAmount === amt
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card hover:border-primary/50 hover:text-primary border-border"
                    }
                  `}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or enter amount</span>
            <Separator className="flex-1" />
          </div>

          {/* Custom amount */}
          <div className="relative">
            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="number"
              placeholder="Enter amount (₹50 – ₹50,000)"
              className="pl-9"
              min={50}
              max={50000}
              value={customAmount}
              onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
            />
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <p>This is a simulated top-up for demonstration purposes. In production this would connect to a payment gateway (Razorpay / UPI).</p>
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={!effectiveAmount || effectiveAmount <= 0 || topup.isPending}
            onClick={handleTopup}
          >
            {topup.isPending
              ? "Processing..."
              : effectiveAmount
              ? `Add ₹${effectiveAmount.toLocaleString("en-IN")} to Wallet`
              : "Add Money"
            }
          </Button>
        </CardContent>
      </Card>

      {/* Transaction history */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-primary" /> Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : !wallet?.transactions?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No transactions yet.</p>
              <p className="text-xs mt-1">Top up your wallet to get started.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {[...wallet.transactions].reverse().map((tx) => {
                const isCredit = tx.type === "credit";
                return (
                  <div key={tx.id} className="flex items-center gap-3 py-3 border-b last:border-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      isCredit ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
                    }`}>
                      {isCredit
                        ? <ArrowDownLeft className="w-4 h-4" />
                        : <ArrowUpRight className="w-4 h-4" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.createdAt), "dd MMM yyyy, h:mm a")}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`font-semibold shrink-0 ${
                        isCredit
                          ? "border-green-200 text-green-700 bg-green-50"
                          : "border-red-200 text-red-600 bg-red-50"
                      }`}
                    >
                      {isCredit ? "+" : "−"}₹{parseFloat(tx.amount).toFixed(0)}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
