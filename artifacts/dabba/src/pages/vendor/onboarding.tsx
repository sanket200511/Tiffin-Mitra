import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateVendor } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ChefHat, MapPin, Store, FileCheck, Image as ImageIcon, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";

const step1Schema = z.object({
  name: z.string().min(2, "Kitchen name must be at least 2 characters"),
  description: z.string().min(10, "Please write at least 10 characters"),
  cuisineType: z.string().min(2, "Cuisine type is required"),
});

const step2Schema = z.object({
  city: z.string().min(2, "City is required"),
  address: z.string().min(10, "Full address is required"),
  deliveryZones: z.string().optional(),
  fssaiLicense: z.string().optional(),
});

const step3Schema = z.object({
  logoUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  coverImageUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
});

const fullSchema = step1Schema.merge(step2Schema).merge(step3Schema);
type FormValues = z.infer<typeof fullSchema>;

const STEPS = [
  { title: "Kitchen Identity", description: "Name and cuisine", icon: ChefHat },
  { title: "Location & Compliance", description: "Address and FSSAI", icon: MapPin },
  { title: "Branding", description: "Logo and cover image", icon: ImageIcon },
];

export default function VendorOnboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(fullSchema),
    mode: "onChange",
    defaultValues: {
      name: "", description: "", cuisineType: "",
      city: "", address: "", deliveryZones: "", fssaiLicense: "",
      logoUrl: "", coverImageUrl: "",
    },
  });

  const createVendor = useCreateVendor({
    mutation: {
      onSuccess: () => {
        setDone(true);
        setTimeout(() => setLocation("/vendor/dashboard"), 2000);
      },
      onError: () => {
        toast({ variant: "destructive", title: "Error", description: "Could not create your kitchen profile. Please try again." });
      }
    }
  });

  const stepSchemas = [step1Schema, step2Schema, step3Schema];

  const handleNext = async () => {
    const fields = Object.keys(stepSchemas[step].shape) as (keyof FormValues)[];
    const valid = await form.trigger(fields);
    if (valid) setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  const onSubmit = (values: FormValues) => {
    const zones = values.deliveryZones
      ? values.deliveryZones.split(",").map(z => z.trim()).filter(Boolean)
      : [];

    createVendor.mutate({
      data: {
        name: values.name,
        description: values.description,
        cuisineType: values.cuisineType,
        city: values.city,
        address: values.address,
        fssaiLicense: values.fssaiLicense || undefined,
      }
    });
  };

  if (done) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-muted/30 p-4">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-serif font-bold">You're all set!</h2>
          <p className="text-muted-foreground">Your kitchen profile has been submitted for review.<br />We'll approve it within 24 hours.</p>
          <p className="text-sm text-muted-foreground">Taking you to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-muted/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Store className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Set Up Your Kitchen</h1>
          <p className="text-muted-foreground mt-1">Just 3 quick steps to start serving customers</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between mb-6 px-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const completed = i < step;
            return (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-2 ${i < STEPS.length - 1 ? "flex-1" : ""}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
                    completed ? "bg-primary border-primary text-primary-foreground" :
                    active ? "border-primary text-primary bg-primary/10" :
                    "border-muted-foreground/30 text-muted-foreground/50"
                  }`}>
                    {completed ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <div className="hidden sm:block">
                    <p className={`text-xs font-semibold ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.title}</p>
                    <p className="text-[10px] text-muted-foreground">{s.description}</p>
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 transition-colors ${i < step ? "bg-primary" : "bg-muted-foreground/20"}`} />
                )}
              </div>
            );
          })}
        </div>

        <Progress value={((step) / STEPS.length) * 100} className="mb-6 h-1" />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card className="shadow-lg border-0 bg-card">
              <CardHeader>
                <CardTitle className="text-xl font-serif">{STEPS[step].title}</CardTitle>
                <CardDescription>{STEPS[step].description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Step 1 */}
                {step === 0 && (
                  <>
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kitchen Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input className="pl-9" placeholder="e.g. Priya's Home Kitchen" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="cuisineType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Cuisine</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <ChefHat className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input className="pl-9" placeholder="e.g. Punjabi, Maharashtrian, South Indian" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel>About Your Kitchen</FormLabel>
                        <FormDescription>Tell customers what makes your food special.</FormDescription>
                        <FormControl>
                          <Textarea className="resize-none h-28" placeholder="We cook authentic Punjabi home food using family recipes passed down for generations..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </>
                )}

                {/* Step 2 */}
                {step === 1 && (
                  <>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <FormField control={form.control} name="city" render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Mumbai" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="fssaiLicense" render={({ field }) => (
                        <FormItem>
                          <FormLabel>FSSAI License <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                          <FormControl>
                            <div className="relative">
                              <FileCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input className="pl-9" placeholder="14-digit license number" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kitchen Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                            <Textarea className="pl-9 resize-none h-20" placeholder="Flat 4, Shivaji Nagar, Andheri West, Mumbai - 400053" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="deliveryZones" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Areas <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                        <FormDescription>Localities you deliver to, separated by commas.</FormDescription>
                        <FormControl>
                          <Input placeholder="Andheri West, Juhu, Vile Parle" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </>
                )}

                {/* Step 3 */}
                {step === 2 && (
                  <>
                    <div className="p-4 bg-muted/40 rounded-lg text-sm text-muted-foreground mb-2">
                      Paste direct image URLs (from Imgur, Cloudinary, etc.). You can update these later from your Profile page.
                    </div>
                    <FormField control={form.control} name="logoUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo Image URL <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                        <FormControl>
                          <div className="relative">
                            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input className="pl-9" placeholder="https://i.imgur.com/your-logo.png" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="coverImageUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cover Image URL <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                        <FormControl>
                          <div className="relative">
                            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input className="pl-9" placeholder="https://i.imgur.com/your-cover.jpg" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    {(form.watch("coverImageUrl") || form.watch("logoUrl")) && (
                      <div className="relative rounded-xl overflow-hidden h-40 bg-muted border">
                        {form.watch("coverImageUrl") && (
                          <img src={form.watch("coverImageUrl")} alt="Cover preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                        )}
                        {form.watch("logoUrl") && (
                          <div className="absolute bottom-3 left-4 w-14 h-14 rounded-full border-2 border-background bg-card overflow-hidden shadow">
                            <img src={form.watch("logoUrl")} alt="Logo preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between mt-6">
              {step > 0 ? (
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              ) : <div />}

              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={handleNext}>
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={createVendor.isPending}>
                  {createVendor.isPending ? "Creating your kitchen..." : "Submit & Launch"}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
