import { useState } from "react";
import { Link } from "wouter";
import {
  useListMySubscriptions,
  useGetWalletBalance,
  useUpdateCustomerSubscription,
  useSkipSubscriptionDay
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format, addDays, isAfter, parseISO, differenceInDays } from "date-fns";
import {
  Calendar as CalendarIcon,
  CreditCard,
  PauseCircle,
  PlayCircle,
  XCircle,
  ChefHat,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Ban,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-green-500",
  paused:    "bg-amber-500",
  cancelled: "bg-red-500",
  expired:   "bg-gray-400",
};

export default function MySubscriptions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: subsData, isLoading: subsLoading } = useListMySubscriptions();
  type SubItem = NonNullable<typeof subsData>["subscriptions"][number] & { totalAmount?: string | null };
  const subscriptions = (subsData?.subscriptions ?? []) as SubItem[];

  const { data: walletData, isLoading: walletLoading } = useGetWalletBalance();
  const wallet = walletData?.wallet;

  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const updateSub = useUpdateCustomerSubscription({
    mutation: {
      onSuccess: () => {
        toast({ title: "Subscription updated" });
        queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error || "Failed to update subscription.";
        toast({ variant: "destructive", title: "Error", description: msg });
      }
    }
  });

  const skipDay = useSkipSubscriptionDay({
    mutation: {
      onSuccess: () => {
        toast({ title: "Delivery skipped", description: "You won't be charged for the skipped day." });
        queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error || "Could not skip delivery.";
        toast({ variant: "destructive", title: "Error", description: msg });
      }
    }
  });

  const handlePause  = (id: string) => updateSub.mutate({ subscriptionId: id, data: { status: "paused" } });
  const handleResume = (id: string) => updateSub.mutate({ subscriptionId: id, data: { status: "active" } });
  const handleCancel = (id: string) => {
    updateSub.mutate({ subscriptionId: id, data: { status: "cancelled" } });
    setCancelingId(null);
  };

  const activeCount = subscriptions.filter(s => s.status === "active").length;

  // Subscriptions expiring within 3 days
  const expiringSoon = subscriptions.filter(sub => {
    if (sub.status !== "active") return false;
    const daysLeft = differenceInDays(parseISO(sub.endDate), new Date());
    return daysLeft >= 0 && daysLeft <= 3;
  });

  return (
    <div className="container py-8 max-w-5xl min-h-screen space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="-ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold">My Subscriptions</h1>
          <p className="text-muted-foreground mt-0.5">Manage your tiffin subscriptions and wallet</p>
        </div>
      </div>

      {/* Expiry warnings */}
      {expiringSoon.length > 0 && (
        <div className="space-y-2">
          {expiringSoon.map(sub => {
            const daysLeft = differenceInDays(parseISO(sub.endDate), new Date());
            return (
              <Alert key={sub.id} className="border-amber-200 bg-amber-50 text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
                  <span>
                    <strong>{sub.planName || "Your subscription"}</strong> from{" "}
                    <strong>{sub.vendorName}</strong> expires{" "}
                    {daysLeft === 0 ? "today" : daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`}.
                  </span>
                  <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 shrink-0" asChild>
                    <Link href="/explore">Renew or Find New Tiffin</Link>
                  </Button>
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
      )}

      {/* Summary row */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 bg-primary text-primary-foreground border-none shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full translate-x-8 -translate-y-8 pointer-events-none" />
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-primary-foreground/90 flex items-center gap-2 text-lg">
              <CreditCard className="w-5 h-5" /> Wallet Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            {walletLoading ? (
              <Skeleton className="h-10 w-24 bg-white/20" />
            ) : (
              <div className="text-4xl font-bold font-serif mb-1">
                ₹{parseFloat(String(wallet?.balance ?? 0)).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </div>
            )}
            <p className="text-sm text-primary-foreground/80 mt-2">
              {wallet?.loyaltyPoints
                ? `${wallet.loyaltyPoints} loyalty points earned`
                : "Auto-deducted for daily deliveries"}
            </p>
          </CardContent>
          <CardFooter className="relative z-10 pt-0">
            <Button variant="secondary" size="sm" className="w-full bg-white text-primary hover:bg-white/90" asChild>
              <Link href="/wallet">Add Money</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <Button variant="outline" asChild className="flex-1 h-auto py-4 flex flex-col gap-2">
              <Link href="/explore">
                <ChefHat className="w-6 h-6 text-primary" />
                <span className="text-sm font-medium">Find New Tiffins</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="flex-1 h-auto py-4 flex flex-col gap-2">
              <Link href="/orders">
                <CalendarIcon className="w-6 h-6 text-primary" />
                <span className="text-sm font-medium">Order History</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Subscription list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-serif font-bold">
            Subscriptions
            {activeCount > 0 && (
              <Badge className="ml-2 text-xs">{activeCount} active</Badge>
            )}
          </h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/explore">
              Add Subscription <ArrowRight className="ml-1.5 w-4 h-4" />
            </Link>
          </Button>
        </div>

        {subsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="bg-card border border-dashed rounded-xl p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
              <ChefHat className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-serif font-medium">No subscriptions yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Explore home chefs in your area and subscribe to get fresh tiffin delivered daily.
            </p>
            <Button asChild>
              <Link href="/explore">Explore Kitchens</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {subscriptions.map(sub => {
              const isActive    = sub.status === "active";
              const isPaused    = sub.status === "paused";
              const isCancelled = sub.status === "cancelled" || sub.status === "expired";
              const daysLeft    = differenceInDays(parseISO(sub.endDate), new Date());
              const isExpiring  = isActive && daysLeft >= 0 && daysLeft <= 3;

              return (
                <Card key={sub.id} className={`overflow-hidden ${isExpiring ? "ring-1 ring-amber-300" : ""}`}>
                  <div className={`h-1.5 w-full ${STATUS_COLORS[sub.status] || "bg-gray-400"}`} />
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <CardTitle className="text-xl font-serif mb-1">
                          {sub.planName || "Subscription Plan"}
                          {isExpiring && (
                            <Badge variant="outline" className="ml-2 text-xs border-amber-300 text-amber-700 bg-amber-50">
                              Expires {daysLeft === 0 ? "today" : `in ${daysLeft}d`}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1.5 text-base">
                          <ChefHat className="w-4 h-4" /> {sub.vendorName || "Kitchen"}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={isActive ? "default" : "secondary"}
                        className="capitalize shrink-0"
                      >
                        {sub.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="grid md:grid-cols-2 gap-6 pb-6">
                    <div className="space-y-4">
                      <div className="text-sm space-y-2">
                        {sub.planType && (
                          <div className="flex justify-between border-b pb-2">
                            <span className="text-muted-foreground">Plan Type</span>
                            <span className="font-medium capitalize">{sub.planType.replace("_", " ")}</span>
                          </div>
                        )}
                        {(sub as any).totalAmount && parseFloat((sub as any).totalAmount) > 0 && (
                          <div className="flex justify-between border-b pb-2">
                            <span className="text-muted-foreground">Amount Paid</span>
                            <span className="font-medium text-green-700">
                              ₹{parseFloat((sub as any).totalAmount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between border-b pb-2">
                          <span className="text-muted-foreground">Period</span>
                          <span className="font-medium">
                            {format(parseISO(sub.startDate), "MMM d")} – {format(parseISO(sub.endDate), "MMM d, yyyy")}
                          </span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                          <span className="text-muted-foreground">Delivery Slot</span>
                          <span className="font-medium">{sub.deliverySlot || "Not specified"}</span>
                        </div>
                        {sub.skippedDays && sub.skippedDays.length > 0 && (
                          <div className="flex justify-between border-b pb-2">
                            <span className="text-muted-foreground">Skipped Days</span>
                            <span className="font-medium">{sub.skippedDays.length}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-start gap-2 bg-muted/50 p-3 rounded-lg text-sm">
                        <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground leading-snug">{sub.deliveryAddress}</span>
                      </div>
                    </div>

                    <div className="bg-primary/5 rounded-xl border border-primary/10 p-4">
                      <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-primary" /> Skip a Delivery
                      </h4>
                      <p className="text-xs text-muted-foreground mb-4">
                        Select a future date to skip. Must be at least 12 hours before scheduled delivery.
                        You won't be charged for skipped days.
                      </p>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full bg-background" disabled={!isActive}>
                            <Ban className="w-4 h-4 mr-2" /> Select Date to Skip
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Skip a Delivery</DialogTitle>
                            <DialogDescription>
                              Pick a date to skip your tiffin. Must be at least 12 hours before delivery.
                              Your wallet balance will not be deducted for that day.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4 flex justify-center">
                            <Calendar
                              mode="single"
                              disabled={(date) =>
                                !isAfter(date, addDays(new Date(), 0)) ||
                                isAfter(date, parseISO(sub.endDate)) ||
                                (sub.skippedDays ?? []).includes(format(date, "yyyy-MM-dd"))
                              }
                              modifiers={{
                                skipped: (sub.skippedDays ?? []).map(d => parseISO(d))
                              }}
                              modifiersStyles={{
                                skipped: { textDecoration: "line-through", opacity: 0.5 }
                              }}
                              onSelect={(date) => {
                                if (date) {
                                  skipDay.mutate({
                                    subscriptionId: sub.id,
                                    data: { date: format(date, "yyyy-MM-dd") }
                                  });
                                }
                              }}
                            />
                          </div>
                          <DialogFooter>
                            <p className="text-xs text-muted-foreground">
                              Already skipped: {sub.skippedDays?.length || 0} day(s)
                            </p>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>

                  {isCancelled && (
                    <CardFooter className="bg-muted/30 border-t gap-3 justify-end py-4">
                      <p className="text-xs text-muted-foreground mr-auto">
                        {sub.status === "expired" ? "This subscription has ended." : "This subscription was cancelled."}
                      </p>
                      {sub.vendorId && sub.planId && (
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/subscribe/${sub.vendorId}/${sub.planId}`}>
                            Subscribe Again
                          </Link>
                        </Button>
                      )}
                    </CardFooter>
                  )}
                  {!isCancelled && (
                    <CardFooter className="bg-muted/30 border-t gap-3 justify-end py-4">
                      {isExpiring && (
                        <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-50 mr-auto" asChild>
                          <Link href={sub.vendorId && sub.planId ? `/subscribe/${sub.vendorId}/${sub.planId}` : "/explore"}>
                            Renew Now
                          </Link>
                        </Button>
                      )}
                      {isActive && (
                        <Button variant="secondary" size="sm" onClick={() => handlePause(sub.id)} disabled={updateSub.isPending}>
                          <PauseCircle className="w-4 h-4 mr-2" /> Pause
                        </Button>
                      )}
                      {isPaused && (
                        <Button variant="default" size="sm" onClick={() => handleResume(sub.id)} disabled={updateSub.isPending}>
                          <PlayCircle className="w-4 h-4 mr-2" /> Resume
                        </Button>
                      )}
                      <AlertDialog open={cancelingId === sub.id} onOpenChange={(open) => setCancelingId(open ? sub.id : null)}>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" disabled={updateSub.isPending}>
                            <XCircle className="w-4 h-4 mr-2" /> Cancel
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertCircle className="w-5 h-5 text-destructive" />
                              Cancel Subscription?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Cancelling <strong>{sub.planName}</strong> from <strong>{sub.vendorName}</strong> will stop all future deliveries.
                              Any pending or accepted orders will be automatically cancelled and refunded to your wallet. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90"
                              onClick={() => handleCancel(sub.id)}
                            >
                              Yes, Cancel It
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardFooter>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
