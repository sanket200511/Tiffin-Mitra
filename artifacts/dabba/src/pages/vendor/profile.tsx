import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetMyVendorProfile, useUpdateVendor } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Store, MapPin, ChefHat, Image as ImageIcon } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Kitchen name is required"),
  description: z.string().optional(),
  city: z.string().min(2, "City is required"),
  address: z.string().min(10, "Provide a complete address"),
  cuisineType: z.string().min(2, "Primary cuisine type is required"),
  logoUrl: z.string().url().optional().or(z.literal("")),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  deliveryZones: z.string().optional(), // We'll parse this to an array
});

export default function VendorProfile() {
  const { toast } = useToast();
  
  const { data, isLoading } = useGetMyVendorProfile();
  const vendor = data?.vendor;

  const updateProfile = useUpdateVendor({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Profile Updated",
          description: "Your kitchen profile has been saved successfully.",
        });
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update profile.",
        });
      }
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      city: "",
      address: "",
      cuisineType: "",
      logoUrl: "",
      coverImageUrl: "",
      deliveryZones: "",
    },
  });

  useEffect(() => {
    if (vendor) {
      form.reset({
        name: vendor.name || "",
        description: vendor.description || "",
        city: vendor.city || "",
        address: vendor.address || "",
        cuisineType: vendor.cuisineType || "",
        logoUrl: vendor.logoUrl || "",
        coverImageUrl: vendor.coverImageUrl || "",
        deliveryZones: vendor.deliveryZones ? vendor.deliveryZones.join(", ") : "",
      });
    }
  }, [vendor, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!vendor?.id) return;
    
    // Parse comma-separated zones into array
    const zones = values.deliveryZones 
      ? values.deliveryZones.split(",").map(z => z.trim()).filter(z => z.length > 0)
      : [];

    updateProfile.mutate({ 
      vendorId: vendor.id,
      data: {
        ...values,
        logoUrl: values.logoUrl || undefined,
        coverImageUrl: values.coverImageUrl || undefined,
        deliveryZones: zones
      } 
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardContent className="p-6 space-y-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Kitchen Profile</h1>
        <p className="text-muted-foreground mt-1">Manage how your tiffin service appears to customers.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>This is your public identity on the platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kitchen Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input className="pl-9" {...field} />
                      </div>
                    </FormControl>
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
                    <FormControl>
                      <Textarea 
                        placeholder="Tell customers about your cooking style, specialities..." 
                        className="resize-none h-24" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="cuisineType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Cuisine</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <ChefHat className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input className="pl-9" placeholder="e.g. Punjabi, Maharashtrian" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kitchen Address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Textarea 
                          className="pl-9 min-h-[80px] resize-none" 
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery & Operations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="deliveryZones"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Zones</FormLabel>
                    <FormDescription>Enter localities you deliver to, separated by commas.</FormDescription>
                    <FormControl>
                      <Input placeholder="e.g. Andheri West, Juhu, Vile Parle" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo Image URL</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input className="pl-9" placeholder="https://..." {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="coverImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Image URL</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input className="pl-9" placeholder="https://..." {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end pt-4 pb-12">
            <Button type="submit" size="lg" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
