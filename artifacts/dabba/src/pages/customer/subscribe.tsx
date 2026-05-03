import { useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, addDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarIcon, MapPin, Clock, IndianRupee, ArrowLeft,
  CheckCircle2, ChefHat, Wallet, AlertTriangle, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { useCreateCustomerSubscription, useListSubscriptionPlans, useGetMyCustomerProfile } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

const DELIVERY_SLOTS = [
  "12:00 PM – 1:00 PM",
  "1:00 PM – 2:00 PM",
  "7:30 PM – 8:30 PM",
  "8:30 PM – 9:30 PM",
];

const PLAN_TYPE_LABELS: Record<string, string> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  weekday: "month (weekdays only)",
  trial_3day: "3-day trial",
  trial_7day: "7-day trial",
  custom: "period",
};

const formSchema = z.object({
  startDate: z.date({ required_error: "Please select a start date." }),
  deliveryAddress: z.string().min(10, "Please provide a complete address (min 10 characters)."),
  deliverySlot: z.string().min(1, "Please select a delivery time slot."),
});

export default function Subscribe() {
  const [, params] = useRoute("/subscribe/:vendorId/:planId");
  const planId = params?.planId;
  const vendorId = params?.vendorId;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: profileData } = useGetMyCustomerProfile();
  const customer = profileData?.customer;

  const { data: plansData, isLoading: plansLoading } = useListSubscriptionPlans(vendorId ?? "", {
    query: { enabled: !!vendorId, queryKey: ["/api/vendors", vendorId, "plans"] }
  });
  const plan = plansData?.plans?.find(p => p.id === planId);

  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ["/api/customers/wallet"],
    queryFn: async () => {
      const res = await fetch("/api/customers/wallet", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ wallet: { balance: number } }>;
    },
  });

  const walletBalance = walletData?.wallet?.balance ?? 0;
  const planPrice = plan ? Number(plan.price) : 0;
  const hasEnoughBalance = walletBalance >= planPrice;
  const shortfall = planPrice - walletBalance;

  const createSubscription = useCreateCustomerSubscription({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Subscription started",
          description: "Your daily tiffin deliveries have been scheduled. Check 'My Subscriptions' to manage them.",
        });
        setLocation("/my-subscriptions");
      },
      onError: (error: any) => {
        const msg = error?.response?.data?.error || "Failed to create subscription. Please try again.";
        toast({ variant: "destructive", title: "Error", description: msg });
      }
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      deliveryAddress: "",
      deliverySlot: "",
    },
  });

  useEffect(() => {
    if (customer?.defaultDeliveryAddress) {
      form.setValue("deliveryAddress", customer.defaultDeliveryAddress, { shouldValidate: false });
    }
  }, [customer, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!planId || !vendorId) return;
    createSubscription.mutate({
      data: {
        planId,
        vendorId,
        startDate: format(values.startDate, "yyyy-MM-dd"),
        deliveryAddress: values.deliveryAddress,
        deliverySlot: values.deliverySlot,
      }
    });
  };

  return (
    <div className="container max-w-3xl py-8 min-h-screen">
      <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="mb-6 -ml-3">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-foreground">Complete Subscription</h1>
        <p className="text-muted-foreground mt-1">Provide delivery details to start your tiffin service.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Delivery Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                  <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP") : "Pick your first delivery date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < addDays(new Date(), 1) || date > addDays(new Date(), 30)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>First delivery must be at least 1 day from today.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="deliverySlot" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Delivery Time</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <SelectValue placeholder="Select a time slot" />
                            </div>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DELIVERY_SLOTS.map(slot => (
                            <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="deliveryAddress" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Delivery Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Textarea
                            placeholder="Flat/House No., Building, Street, Landmark, Area, City — PIN code"
                            className="resize-none h-24 pl-9"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>This address will be shared with the kitchen for delivery only.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Insufficient balance warning */}
                  {!walletLoading && plan && !hasEnoughBalance && (
                    <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-destructive">Insufficient wallet balance</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          You need ₹{planPrice.toFixed(0)} but your wallet has ₹{walletBalance.toFixed(0)}.
                          Top up ₹{shortfall.toFixed(0)} more to proceed.
                        </p>
                        <Button size="sm" variant="outline" asChild className="mt-2 h-7 text-xs gap-1.5 border-primary text-primary hover:bg-primary/5">
                          <Link href="/wallet">
                            <Plus className="w-3 h-3" /> Add ₹{Math.ceil(shortfall)} to Wallet
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={createSubscription.isPending || plansLoading || walletLoading || (!!plan && !hasEnoughBalance)}
                  >
                    {createSubscription.isPending
                      ? "Processing..."
                      : !hasEnoughBalance && plan
                      ? "Add Wallet Balance to Continue"
                      : `Confirm & Pay ₹${planPrice > 0 ? planPrice.toFixed(0) : "..."}`
                    }
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="md:col-span-1 space-y-4">
          {/* Wallet balance card */}
          <Card className={cn(
            "shadow-sm border",
            !walletLoading && plan
              ? hasEnoughBalance
                ? "border-green-200 bg-green-50"
                : "border-destructive/30 bg-destructive/5"
              : "border-border"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className={cn("w-4 h-4", hasEnoughBalance ? "text-green-600" : "text-destructive")} />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Wallet Balance</p>
              </div>
              {walletLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <div className="flex items-center justify-between">
                  <p className={cn("text-xl font-bold font-serif", hasEnoughBalance ? "text-green-700" : "text-destructive")}>
                    ₹{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                  {hasEnoughBalance
                    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                    : <AlertTriangle className="w-4 h-4 text-destructive" />
                  }
                </div>
              )}
              {!walletLoading && plan && (
                <p className={cn("text-xs mt-1", hasEnoughBalance ? "text-green-600" : "text-destructive")}>
                  {hasEnoughBalance
                    ? `Sufficient for this plan`
                    : `Need ₹${shortfall.toFixed(0)} more`
                  }
                </p>
              )}
            </CardContent>
          </Card>

          {/* Plan summary */}
          <Card className="bg-primary/5 border-primary/20 sticky top-24 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {plansLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              ) : plan ? (
                <>
                  <div>
                    <p className="font-bold text-xl font-serif">{plan.name}</p>
                    {plan.description && (
                      <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 text-primary">
                    <IndianRupee className="w-4 h-4" />
                    <span className="text-2xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">/ {PLAN_TYPE_LABELS[plan.planType] ?? plan.planType}</span>
                  </div>
                  {plan.mealTypes?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {plan.mealTypes.map(mt => (
                        <Badge key={mt} variant="secondary" className="capitalize text-xs">{mt}</Badge>
                      ))}
                    </div>
                  )}
                  <Separator />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Plan details unavailable.</p>
              )}

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <IndianRupee className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <p>Full plan amount is charged upfront from your Dabba Wallet.</p>
                </div>
                <div className="flex items-start gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <p>Skip any delivery at least 12 hours in advance — refunded to wallet.</p>
                </div>
                <div className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <p>Cancel anytime — undelivered days are refunded automatically.</p>
                </div>
              </div>

              <div className="pt-2 border-t">
                <Link
                  href={`/vendors/${vendorId}`}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ChefHat className="w-3.5 h-3.5" />
                  View kitchen details
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
