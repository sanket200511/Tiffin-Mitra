import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, Plus, IndianRupee,
  Gift, TrendingUp, AlertCircle, Copy, Check, Users, Share2, Zap,
} from "lucide-react";
import { useFeatures } from "@/lib/features";

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
  totalTransactions: number;
  transactions: {
    id: string;
    type: "credit" | "debit";
    amount: string;
    description: string;
    createdAt: string;
  }[];
};

type ReferralData = {
  referralCode: string | null;
  referredByCode: string | null;
  referrals: { id: string; createdAt: string; referrerReward: string | null; refereeName: string | null }[];
  totalEarned: number;
  count: number;
};

type WalletLimits = { minTopup: number; maxTopup: number };

const QUICK_AMOUNTS = [200, 500, 1000, 2000];

export default function CustomerWallet() {
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const features = useFeatures();

  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [applyCode, setApplyCode] = useState("");

  const { data, isLoading } = useQuery<{ wallet: WalletData }>({
    queryKey: ["/api/customers/wallet"],
    queryFn: async () => {
      const res = await fetch("/api/customers/wallet", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load wallet");
      return res.json();
    },
  });

  const { data: referralData, isLoading: referralLoading } = useQuery<ReferralData>({
    queryKey: ["/api/customers/me/referral"],
    queryFn: async () => {
      const res = await fetch("/api/customers/me/referral", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load referral data");
      return res.json();
    },
  });

  const { data: limitsData } = useQuery<WalletLimits>({
    queryKey: ["/api/customers/wallet/limits"],
    queryFn: async () => {
      const res = await fetch("/api/customers/wallet/limits");
      if (!res.ok) return { minTopup: 100, maxTopup: 100000 };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const minTopup = limitsData?.minTopup ?? 100;
  const maxTopup = limitsData?.maxTopup ?? 100000;

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

  const applyReferral = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/customers/me/referral/apply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to apply code");
      return body;
    },
    onSuccess: (data) => {
      toast({
        title: "Referral code applied!",
        description: `₹${data.refereeReward} has been credited to your wallet.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers/me/referral"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers/wallet"] });
      setApplyCode("");
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Could not apply code", description: err.message });
    },
  });

  const redeemPoints = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/customers/wallet/redeem-points", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Redemption failed");
      return body as { pointsRedeemed: number; creditAmount: number; remainingPoints: number };
    },
    onSuccess: (data) => {
      toast({
        title: "Points redeemed!",
        description: `${data.pointsRedeemed} pts → ₹${data.creditAmount.toFixed(2)} added to your wallet.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers/wallet"] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Could not redeem", description: err.message });
    },
  });

  const effectiveAmount = selectedAmount ?? (customAmount ? parseFloat(customAmount) : null);

  const handleTopup = () => {
    if (!effectiveAmount || effectiveAmount <= 0) return;
    if (effectiveAmount < minTopup) {
      toast({ variant: "destructive", title: "Amount too low", description: `Minimum top-up is ₹${minTopup.toLocaleString("en-IN")}.` });
      return;
    }
    if (effectiveAmount > maxTopup) {
      toast({ variant: "destructive", title: "Amount too high", description: `Maximum top-up is ₹${maxTopup.toLocaleString("en-IN")}.` });
      return;
    }
    topup.mutate(effectiveAmount);
  };

  const handleCopyCode = () => {
    if (referralData?.referralCode) {
      navigator.clipboard.writeText(referralData.referralCode).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
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
              <WalletIcon className="w-5 h-5" />
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

      {/* Loyalty points redemption */}
      {features.LOYALTY_REDEMPTION && (
        <Card className="shadow-sm border-amber-200/60 bg-amber-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-amber-500" /> Redeem Loyalty Points
            </CardTitle>
            <CardDescription>
              Convert your loyalty points into wallet credit. Rate: 10 pts = ₹1. Minimum 100 points.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (wallet?.loyaltyPoints ?? 0) < 100 ? (
              <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
                <Gift className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <p className="font-medium text-foreground">Keep earning!</p>
                  <p className="text-xs mt-0.5">
                    You have <strong>{wallet?.loyaltyPoints ?? 0} pts</strong>. Earn {100 - (wallet?.loyaltyPoints ?? 0)} more to unlock your first redemption.
                    You earn 1 point for every ₹10 spent on orders.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-white border border-amber-200 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">Redeemable value</p>
                  <p className="text-2xl font-bold font-serif text-amber-600">
                    ₹{(Math.floor((wallet?.loyaltyPoints ?? 0) / 10)).toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.floor((wallet?.loyaltyPoints ?? 0) / 10) * 10} of {wallet?.loyaltyPoints} pts usable
                  </p>
                </div>
                <Button
                  className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                  onClick={() => redeemPoints.mutate()}
                  disabled={redeemPoints.isPending}
                >
                  <Zap className="w-4 h-4 mr-1.5" />
                  {redeemPoints.isPending ? "Redeeming…" : "Redeem All"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
              placeholder={`Enter amount (₹${minTopup.toLocaleString("en-IN")} – ₹${maxTopup.toLocaleString("en-IN")})`}
              className="pl-9"
              min={minTopup}
              max={maxTopup}
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

      {/* Referral section */}
      <Card id="referral" className="shadow-sm border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Share2 className="w-5 h-5 text-primary" /> Refer &amp; Earn
          </CardTitle>
          <CardDescription>
            Share your referral code with friends. You earn ₹50 per successful referral — they get ₹25 to start!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {referralLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              {/* Your referral code */}
              {referralData?.referralCode && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Your referral code</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 font-mono font-bold text-xl tracking-widest text-primary text-center">
                      {referralData.referralCode}
                    </div>
                    <Button
                      size="icon"
                      variant="outline"
                      className="shrink-0 h-12 w-12"
                      onClick={handleCopyCode}
                    >
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/40 rounded-lg p-4 text-center">
                  <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold font-serif">{referralData?.count ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Friends referred</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-4 text-center">
                  <Gift className="w-5 h-5 mx-auto mb-1 text-green-600" />
                  <p className="text-2xl font-bold font-serif">
                    ₹{(referralData?.totalEarned ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-muted-foreground">Total earned</p>
                </div>
              </div>

              {/* Referral history */}
              {(referralData?.referrals?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Referral history</p>
                  <div className="space-y-2">
                    {referralData!.referrals.map(r => (
                      <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                        <div>
                          <span className="font-medium">{r.refereeName || "A friend"}</span>
                          <span className="text-muted-foreground text-xs ml-2">
                            {format(new Date(r.createdAt), "MMM d, yyyy")}
                          </span>
                        </div>
                        <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 font-semibold">
                          +₹{parseFloat(String(r.referrerReward ?? 0)).toFixed(0)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Apply someone's referral code */}
              {!referralData?.referredByCode && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm font-medium">Have a friend's referral code?</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter referral code"
                      className="font-mono uppercase"
                      value={applyCode}
                      onChange={e => setApplyCode(e.target.value.toUpperCase())}
                      maxLength={8}
                    />
                    <Button
                      variant="outline"
                      disabled={applyCode.length < 4 || applyReferral.isPending}
                      onClick={() => applyReferral.mutate(applyCode)}
                      className="shrink-0"
                    >
                      {applyReferral.isPending ? "Applying..." : "Apply"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">You can only apply a referral code once.</p>
                </div>
              )}

              {referralData?.referredByCode && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-green-50 border border-green-200 rounded-lg p-3">
                  <Check className="w-4 h-4 text-green-600 shrink-0" />
                  <span>You joined with referral code <strong className="font-mono text-green-700">{referralData.referredByCode}</strong> and received a welcome bonus!</span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Transaction history */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-primary" /> Transaction History
            </CardTitle>
            {wallet?.totalTransactions != null && wallet.totalTransactions > 100 && (
              <span className="text-xs text-muted-foreground">
                Showing last 100 of {wallet.totalTransactions}
              </span>
            )}
          </div>
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
              <WalletIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No transactions yet.</p>
              <p className="text-xs mt-1">Top up your wallet to get started.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {wallet.transactions.map((tx) => {
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
