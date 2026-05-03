import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState } from "react";
import { User, Phone, MapPin, Wallet, Gift, ChevronRight, Navigation, Loader2, CheckCircle2, Copy, Share2, Users, IndianRupee } from "lucide-react";

import { useGetMyCustomerProfile, useUpdateMyCustomerProfile } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Enter a valid phone number").max(15),
  city: z.string().min(2, "City is required"),
  landmark: z.string().optional(),
  defaultDeliveryAddress: z.string().min(10, "Provide a complete address"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type ReferralStats = {
  referralCode: string | null;
  referredByCode: string | null;
  referrals: { id: string; refereeName: string | null; referrerReward: string; createdAt: string }[];
  totalEarned: number;
  count: number;
};

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [locating, setLocating] = useState(false);
  const [locationFixed, setLocationFixed] = useState(false);
  const [applyCodeOpen, setApplyCodeOpen] = useState(false);
  const [codeInput, setCodeInput] = useState("");

  const { data, isLoading } = useGetMyCustomerProfile();
  const customer = data?.customer;

  const { data: referralData } = useQuery<ReferralStats>({
    queryKey: ["/api/customers/me/referral"],
    queryFn: async () => {
      const res = await fetch("/api/customers/me/referral", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<ReferralStats>;
    },
  });

  const applyCode = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/customers/me/referral/apply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = await res.json() as { ok?: boolean; refereeReward?: number; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Failed");
      return body;
    },
    onSuccess: (body) => {
      toast({ title: "Code applied!", description: `₹${body.refereeReward} has been added to your wallet.` });
      setApplyCodeOpen(false);
      setCodeInput("");
      void qc.invalidateQueries({ queryKey: ["/api/customers/me/referral"] });
      void qc.invalidateQueries({ queryKey: ["/api/customers/wallet"] });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Could not apply code", description: err.message });
    },
  });

  const updateProfile = useUpdateMyCustomerProfile({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Profile Updated",
          description: "Your profile details have been saved successfully.",
        });
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update profile. Please try again.",
        });
      },
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      city: "",
      landmark: "",
      defaultDeliveryAddress: "",
      latitude: undefined,
      longitude: undefined,
    },
  });

  const { data: walletData } = useQuery({
    queryKey: ["/api/customers/wallet"],
    queryFn: async () => {
      const res = await fetch("/api/customers/wallet", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ wallet: { balance: number; loyaltyPoints: number } }>;
    },
  });

  useEffect(() => {
    if (customer) {
      form.reset({
        name: customer.name || user?.firstName || "",
        phone: customer.phone || "",
        city: customer.city || "",
        landmark: (customer as { landmark?: string }).landmark || "",
        defaultDeliveryAddress: customer.defaultDeliveryAddress || "",
        latitude: customer.latitude ?? undefined,
        longitude: customer.longitude ?? undefined,
      });
      if (customer.latitude && customer.longitude) {
        setLocationFixed(true);
      }
    }
  }, [customer, user, form]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Not supported", description: "Your browser does not support location detection." });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        form.setValue("latitude", latitude, { shouldDirty: true });
        form.setValue("longitude", longitude, { shouldDirty: true });
        setLocationFixed(true);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } },
          );
          if (res.ok) {
            const geo = await res.json() as {
              address?: {
                road?: string;
                suburb?: string;
                city?: string;
                state_district?: string;
                state?: string;
                postcode?: string;
              };
              display_name?: string;
            };
            const addr = geo.address;
            if (addr) {
              const parts = [addr.road, addr.suburb, addr.state_district, addr.state, addr.postcode].filter(Boolean);
              if (parts.length > 0) form.setValue("defaultDeliveryAddress", parts.join(", "), { shouldDirty: true });
              if (addr.city || addr.state_district) form.setValue("city", addr.city || addr.state_district || "", { shouldDirty: true });
            }
          }
        } catch {
        }

        setLocating(false);
        toast({ title: "Location detected", description: "Your address has been auto-filled. Review and save." });
      },
      (err) => {
        setLocating(false);
        const messages: Record<number, string> = {
          1: "Location access was denied. Please allow location permission in your browser settings and try again.",
          2: "We couldn't detect your location. Please check your GPS signal and try again, or enter your address manually.",
          3: "Location detection timed out. Please try again in a moment.",
        };
        toast({ variant: "destructive", title: "Location error", description: messages[err.code] || "Unknown error." });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const onSubmit = (values: FormValues) => {
    updateProfile.mutate({ data: values });
  };

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-8 min-h-screen space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardContent className="p-6 space-y-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const lat = form.watch("latitude");
  const lng = form.watch("longitude");

  return (
    <div className="container max-w-2xl py-8 min-h-screen space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">My Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your personal information and delivery details</p>
      </div>

      <Link href="/wallet">
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-primary/20 bg-primary/5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dabba Wallet</p>
              <p className="text-2xl font-bold font-serif text-foreground">
                ₹{(walletData?.wallet?.balance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                <Gift className="w-3 h-3 text-amber-500" />
                {walletData?.wallet?.loyaltyPoints ?? 0} loyalty points
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm text-primary font-medium shrink-0">
              Add Money <ChevronRight className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Referral Card */}
      <Card className="border-green-200 bg-gradient-to-br from-green-50/60 to-emerald-50/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-5 h-5 text-green-600" />
            Refer &amp; Earn
          </CardTitle>
          <CardDescription>
            Share your code — your friend gets <span className="font-semibold text-foreground">₹25</span>,
            you earn <span className="font-semibold text-foreground">₹50</span> when they join.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Code display */}
          {referralData?.referralCode && (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white border border-green-200 rounded-lg px-4 py-3 text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Your referral code</p>
                <p className="text-2xl font-mono font-bold tracking-widest text-green-700">
                  {referralData.referralCode}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-green-200 h-9"
                  onClick={() => {
                    void navigator.clipboard.writeText(referralData.referralCode ?? "");
                    toast({ title: "Copied!", description: "Referral code copied to clipboard." });
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-green-200 h-9"
                  onClick={() => {
                    const link = `${window.location.origin}/?ref=${referralData.referralCode}`;
                    if (navigator.share) {
                      void navigator.share({ title: "Join Dabba!", text: `Use my code ${referralData.referralCode} to get ₹25 off your first order!`, url: link });
                    } else {
                      void navigator.clipboard.writeText(link);
                      toast({ title: "Link copied!", description: "Share it with your friends." });
                    }
                  }}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </Button>
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/70 border border-green-100 rounded-lg p-3 text-center">
              <p className="text-xl font-bold font-serif text-green-700">{referralData?.count ?? 0}</p>
              <p className="text-xs text-muted-foreground">Friends referred</p>
            </div>
            <div className="bg-white/70 border border-green-100 rounded-lg p-3 text-center">
              <p className="text-xl font-bold font-serif text-green-700 flex items-center justify-center gap-0.5">
                <IndianRupee className="w-4 h-4" />
                {(referralData?.totalEarned ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground">Total earned</p>
            </div>
          </div>

          {/* Apply someone else's code */}
          {!referralData?.referredByCode ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground w-full"
              onClick={() => setApplyCodeOpen(true)}
            >
              Have a friend's code? Apply it here
            </Button>
          ) : (
            <p className="text-xs text-center text-muted-foreground">
              You joined with code <span className="font-mono font-semibold">{referralData.referredByCode}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Apply code dialog */}
      <Dialog open={applyCodeOpen} onOpenChange={setApplyCodeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Apply a referral code</DialogTitle>
            <DialogDescription>
              Enter your friend's code to get ₹25 added to your wallet instantly.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="e.g. ABC123"
            value={codeInput}
            onChange={e => setCodeInput(e.target.value.toUpperCase())}
            className="font-mono text-center text-lg tracking-widest"
            maxLength={10}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyCodeOpen(false)}>Cancel</Button>
            <Button
              onClick={() => applyCode.mutate(codeInput)}
              disabled={codeInput.trim().length < 4 || applyCode.isPending}
            >
              {applyCode.isPending ? "Applying..." : "Apply Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="space-y-1.5">
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your contact and delivery details here.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              <div className="bg-card p-4 rounded-xl flex items-center gap-3 border shadow-sm">
                <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">{user?.email || "Account Email"}</p>
                  <p className="text-xs text-muted-foreground">Your account email (cannot be changed here)</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input className="pl-9 h-11 rounded-xl" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input className="pl-9 h-11 rounded-xl" placeholder="+91" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input className="h-11 rounded-xl" placeholder="e.g. Nagpur" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium leading-none">Delivery Address</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDetectLocation}
                    disabled={locating}
                    className="gap-2 text-xs h-9 rounded-xl"
                  >
                    {locating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : locationFixed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Navigation className="w-3.5 h-3.5" />
                    )}
                    {locating ? "Detecting..." : locationFixed ? "Location pinned" : "Use my location"}
                  </Button>
                </div>

                {locationFixed && lat && lng && (
                  <a
                    href={`https://www.google.com/maps?q=${lat},${lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-primary hover:underline bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5"
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {lat.toFixed(5)}, {lng.toFixed(5)} — View on Google Maps
                    </span>
                    <Badge variant="outline" className="ml-auto text-[10px] shrink-0 border-green-500 text-green-600">GPS pinned</Badge>
                  </a>
                )}

                <FormField
                  control={form.control}
                  name="defaultDeliveryAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Textarea
                            className="pl-9 min-h-[100px] resize-none rounded-xl"
                            placeholder="House / flat number, street name, area..."
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="landmark"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Landmark <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <FormControl>
                      <Input className="h-11 rounded-xl" placeholder="e.g. Near Papadkar Kirana Store, opposite blue gate..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
