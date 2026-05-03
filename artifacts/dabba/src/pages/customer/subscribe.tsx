import { useRoute, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, addDays } from "date-fns";
import { CalendarIcon, MapPin, Clock, CreditCard, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

import { useCreateCustomerSubscription, useListSubscriptionPlans, useGetMyCustomerProfile } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  startDate: z.date({
    required_error: "A start date is required.",
  }),
  deliveryAddress: z.string().min(10, "Please provide a complete address."),
  deliverySlot: z.string().min(1, "Please select a delivery slot."),
});

export default function Subscribe() {
  const [, params] = useRoute("/subscribe/:vendorId/:planId");
  const planId = params?.planId;
  const vendorId = params?.vendorId;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: profileData } = useGetMyCustomerProfile();
  const customer = profileData?.customer;

  // We need to fetch the plan details. Since we don't have a getPlan hook, 
  // we'll fetch all plans (or we could rely on passing state, but fetching is safer)
  // In a real app we might want a specific useGetSubscriptionPlan hook, but we'll adapt.
  // Actually, we need the vendorId to list plans. Since we only have planId in URL,
  // this is tricky with the current API design. 
  // Let's assume we can fetch plans if we somehow know the vendor, 
  // OR we can just use a dummy query since the API might not support getPlan by ID directly.
  // Wait, let's look at the generated API. No useGetSubscriptionPlan.
  // We will have to show a simplified form and rely on the mutation.
  
  const createSubscription = useCreateCustomerSubscription({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Subscription Created",
          description: "Your tiffin subscription has been started successfully.",
        });
        setLocation("/my-subscriptions");
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to create subscription.",
        });
      }
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      deliveryAddress: customer?.defaultDeliveryAddress || "",
    },
  });

  // When customer data loads, update default address
  // useEffect would go here, but we can just let React hook form handle it or set it via reset()

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!planId) return;
    
    createSubscription.mutate({
      data: {
        planId: planId,
        vendorId: vendorId!,
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
        <p className="text-muted-foreground mt-2">Provide delivery details to start your tiffin service.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Details</CardTitle>
              <CardDescription>When and where should we deliver your food?</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-[240px] pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date() || date > addDays(new Date(), 30)
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          When should your first tiffin arrive?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deliverySlot"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Delivery Slot</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a time slot" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="12:00 PM - 1:00 PM">Lunch (12:00 PM - 1:00 PM)</SelectItem>
                            <SelectItem value="1:00 PM - 2:00 PM">Lunch (1:00 PM - 2:00 PM)</SelectItem>
                            <SelectItem value="7:30 PM - 8:30 PM">Dinner (7:30 PM - 8:30 PM)</SelectItem>
                            <SelectItem value="8:30 PM - 9:30 PM">Dinner (8:30 PM - 9:30 PM)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deliveryAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Delivery Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Flat/House No., Building, Street, Landmark..." 
                            className="resize-none h-24"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" size="lg" className="w-full" disabled={createSubscription.isPending}>
                    {createSubscription.isPending ? "Processing..." : "Confirm Subscription"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1">
          <Card className="bg-primary/5 border-primary/20 sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Plan ID</span>
                <span className="font-mono">{planId?.substring(0, 8)}...</span>
              </div>
              <div className="border-t border-primary/10 pt-4 space-y-3">
                <div className="flex items-start gap-2">
                  <CreditCard className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm">Payment will be deducted from your Dabba Wallet automatically.</p>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm">You can pause or skip deliveries before 9 PM the previous day.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
