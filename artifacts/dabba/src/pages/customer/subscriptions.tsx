import { useState } from "react";
import { Link } from "wouter";
import { 
  useListMySubscriptions, 
  useGetWalletBalance, 
  useUpdateCustomerSubscription,
  useSkipSubscriptionDay 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { 
  Calendar as CalendarIcon, 
  CreditCard, 
  PauseCircle, 
  PlayCircle, 
  XCircle, 
  ChefHat, 
  MapPin,
  Ban
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";

export default function MySubscriptions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: subsData, isLoading: subsLoading } = useListMySubscriptions();
  const subscriptions = subsData?.subscriptions || [];

  const { data: walletData, isLoading: walletLoading } = useGetWalletBalance();
  const wallet = walletData?.wallet;

  const updateSub = useUpdateCustomerSubscription({
    mutation: {
      onSuccess: () => {
        toast({ title: "Subscription updated successfully" });
        queryClient.invalidateQueries({ queryKey: ["/api/customers/me/subscriptions"] });
      }
    }
  });

  const skipDay = useSkipSubscriptionDay({
    mutation: {
      onSuccess: () => {
        toast({ title: "Delivery skipped successfully" });
        queryClient.invalidateQueries({ queryKey: ["/api/customers/me/subscriptions"] });
      }
    }
  });

  const handleStatusChange = (id: string, newStatus: "active" | "paused" | "cancelled") => {
    updateSub.mutate({ subscriptionId: id, data: { status: newStatus } });
  };

  return (
    <div className="container py-8 max-w-5xl min-h-screen space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold">My Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your tiffin subscriptions and wallet</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Wallet Card */}
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
              <div className="text-4xl font-bold font-serif mb-1">₹{wallet?.balance || 0}</div>
            )}
            <p className="text-sm text-primary-foreground/80 mt-4">
              Auto-deducted for daily deliveries
            </p>
          </CardContent>
          <CardFooter className="relative z-10 pt-0">
            <Button variant="secondary" size="sm" className="w-full bg-white text-primary hover:bg-white/90">
              Add Money
            </Button>
          </CardFooter>
        </Card>

        {/* Next Delivery Mini-card (mocked logic) */}
        <Card className="md:col-span-2 bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button variant="outline" asChild className="flex-1 h-auto py-4 flex flex-col gap-2">
              <Link href="/explore">
                <ChefHat className="w-6 h-6 text-primary" />
                <span>Find New Tiffins</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="flex-1 h-auto py-4 flex flex-col gap-2">
              <Link href="/orders">
                <CalendarIcon className="w-6 h-6 text-primary" />
                <span>Order History</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-serif font-bold">Active Subscriptions</h2>
        
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
            <h3 className="text-xl font-serif font-medium">No active subscriptions</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              You haven't subscribed to any tiffin service yet. Explore home chefs in your area to get started.
            </p>
            <Button asChild>
              <Link href="/explore">Explore Kitchens</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {subscriptions.map(sub => (
              <Card key={sub.id} className="overflow-hidden">
                <div className={`h-2 w-full ${sub.status === 'active' ? 'bg-green-500' : sub.status === 'paused' ? 'bg-amber-500' : 'bg-red-500'}`} />
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl font-serif mb-1">{sub.planName}</CardTitle>
                      <CardDescription className="flex items-center gap-1.5 text-base">
                        <ChefHat className="w-4 h-4" /> {sub.vendorName}
                      </CardDescription>
                    </div>
                    <Badge variant={sub.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                      {sub.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6 pb-6">
                  <div className="space-y-4">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Type</span>
                        <span className="font-medium capitalize">{sub.planType?.replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Period</span>
                        <span className="font-medium">{format(new Date(sub.startDate), "MMM d")} - {format(new Date(sub.endDate), "MMM d, yyyy")}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Delivery Slot</span>
                        <span className="font-medium">{sub.deliverySlot || "Not specified"}</span>
                      </div>
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
                      Select a date to skip delivery. You won't be charged for skipped days.
                    </p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full bg-background" disabled={sub.status !== 'active'}>
                          <Ban className="w-4 h-4 mr-2" /> Select Date to Skip
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Skip Delivery</DialogTitle>
                          <DialogDescription>
                            Pick a date to skip your tiffin. Must be selected at least 12 hours in advance.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 flex justify-center">
                          <Calendar
                            mode="single"
                            disabled={(date) => date < addDays(new Date(), 1) || date > new Date(sub.endDate)}
                            onSelect={(date) => {
                              if (date) {
                                skipDay.mutate({ subscriptionId: sub.id, data: { date: format(date, "yyyy-MM-dd") } });
                              }
                            }}
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/30 border-t gap-3 justify-end py-4">
                  {sub.status === 'active' ? (
                    <Button variant="secondary" size="sm" onClick={() => handleStatusChange(sub.id, "paused")}>
                      <PauseCircle className="w-4 h-4 mr-2" /> Pause Subscription
                    </Button>
                  ) : sub.status === 'paused' ? (
                    <Button variant="default" size="sm" onClick={() => handleStatusChange(sub.id, "active")}>
                      <PlayCircle className="w-4 h-4 mr-2" /> Resume Subscription
                    </Button>
                  ) : null}
                  
                  {sub.status !== 'cancelled' && sub.status !== 'expired' && (
                    <Button variant="destructive" size="sm" onClick={() => handleStatusChange(sub.id, "cancelled")}>
                      <XCircle className="w-4 h-4 mr-2" /> Cancel
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
