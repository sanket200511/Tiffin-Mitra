import { useState } from "react";
import { useListSubscriptionPlans, useCreateSubscriptionPlan, useUpdateSubscriptionPlan, useDeleteSubscriptionPlan, useGetMyVendorProfile } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit, Trash2, CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  planType: z.enum(["daily", "weekly", "monthly", "weekday", "trial_3day", "trial_7day", "custom"]),
  price: z.coerce.number().min(1, "Price required"),
  mealTypes: z.array(z.string()).min(1, "Select at least one meal type"),
  dietType: z.enum(["veg", "non_veg", "jain", "diabetic_friendly"]).optional(),
  mealsPerDay: z.coerce.number().min(1).default(1),
  isActive: z.boolean().default(true),
});

export default function VendorPlans() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: profileData } = useGetMyVendorProfile();
  const vendorId = profileData?.vendor?.id;

  const { data: plansData, isLoading } = useListSubscriptionPlans(vendorId!, {
    query: { enabled: !!vendorId, queryKey: ["/api/vendors", vendorId, "plans"] }
  });
  const plans = plansData?.plans || [];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      planType: "monthly",
      price: 0,
      mealTypes: ["lunch"],
      dietType: "veg",
      mealsPerDay: 1,
      isActive: true,
    },
  });

  const createPlan = useCreateSubscriptionPlan({
    mutation: {
      onSuccess: () => {
        toast({ title: "Plan created" });
        queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendorId, "plans"] });
        setIsDialogOpen(false);
      }
    }
  });

  const updatePlan = useUpdateSubscriptionPlan({
    mutation: {
      onSuccess: () => {
        toast({ title: "Plan updated" });
        queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendorId, "plans"] });
        setIsDialogOpen(false);
      }
    }
  });

  const deletePlan = useDeleteSubscriptionPlan({
    mutation: {
      onSuccess: () => {
        toast({ title: "Plan deleted" });
        queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendorId, "plans"] });
      }
    }
  });

  const handleOpenNew = () => {
    setEditingPlan(null);
    form.reset({
      name: "", description: "", planType: "monthly", price: 0, mealTypes: ["lunch"], dietType: "veg", mealsPerDay: 1, isActive: true
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (plan: any) => {
    setEditingPlan(plan);
    form.reset({
      name: plan.name,
      description: plan.description || "",
      planType: plan.planType,
      price: plan.price,
      mealTypes: plan.mealTypes,
      dietType: plan.dietType || "veg",
      mealsPerDay: plan.mealsPerDay || 1,
      isActive: plan.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (editingPlan) {
      updatePlan.mutate({ id: editingPlan.id, data: values });
    } else {
      createPlan.mutate({ data: values });
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Subscription Plans</h1>
          <p className="text-muted-foreground mt-1">Create and manage your tiffin service packages.</p>
        </div>
        <Button onClick={handleOpenNew}>
          <Plus className="w-4 h-4 mr-2" /> Create Plan
        </Button>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed shadow-sm">
          <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold font-serif mb-2">No plans created</h3>
          <p className="text-muted-foreground mb-6">Define your subscription offerings to get customers.</p>
          <Button onClick={handleOpenNew} variant="outline">Create First Plan</Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className={`flex flex-col shadow-sm transition-all ${!plan.isActive ? 'opacity-70' : ''}`}>
              <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex justify-between items-start">
                  <Badge variant="secondary" className="uppercase tracking-wider text-[10px] text-primary bg-primary/10">
                    {plan.planType.replace('_', ' ')}
                  </Badge>
                  {!plan.isActive && <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
                </div>
                <CardTitle className="text-xl font-serif pt-2">{plan.name}</CardTitle>
                <div className="text-2xl font-bold text-foreground mt-1">
                  ₹{plan.price} <span className="text-sm font-normal text-muted-foreground">/ {plan.planType === 'daily' ? 'day' : 'plan'}</span>
                </div>
              </CardHeader>
              <CardContent className="py-4 flex-1">
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{plan.description || "No description."}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Includes:</span>
                    <span className="font-medium capitalize">{plan.mealTypes.join(', ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Diet:</span>
                    <span className="font-medium capitalize">{plan.dietType?.replace('_', ' ') || 'Any'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Meals/day:</span>
                    <span className="font-medium">{plan.mealsPerDay}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t gap-2 bg-muted/10">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenEdit(plan)}>
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-destructive hover:text-destructive" onClick={() => deletePlan.mutate({ id: plan.id })}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Create Subscription Plan"}</DialogTitle>
            <DialogDescription>
              Set pricing and rules for this tiffin package.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl><Input placeholder="e.g. Executive Lunch Monthly" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea className="resize-none h-20" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="planType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan Duration</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="weekday">Weekday (Mon-Fri)</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="trial_3day">3-Day Trial</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Price (₹)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dietType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Diet Specifics</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="veg">Pure Veg</SelectItem>
                          <SelectItem value="non_veg">Non-Veg</SelectItem>
                          <SelectItem value="jain">Jain</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mealsPerDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meals Per Day</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 mt-2 bg-muted/30">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription className="text-xs">Allow new customers to subscribe</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={createPlan.isPending || updatePlan.isPending} className="w-full">
                  {(createPlan.isPending || updatePlan.isPending) ? "Saving..." : "Save Plan"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
