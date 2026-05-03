import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import {
  BookOpen, FileText, UtensilsCrossed, Pill, Gift, Package,
  MapPin, ArrowRight, Plus, Clock, IndianRupee, Weight,
  CheckCircle2, Truck, AlertCircle, Bike, RefreshCw, ArrowLeft,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
type P2PRequest = {
  id: string;
  requesterId: string;
  requesterName?: string | null;
  itemTitle: string;
  itemDescription?: string | null;
  itemCategory: string;
  estimatedWeightKg?: string | number | null;
  pickupLocality: string;
  pickupAddress?: string | null;
  dropoffLocality: string;
  dropoffAddress?: string | null;
  city: string;
  offeredPrice: string | number;
  preferredTime?: string | null;
  notes?: string | null;
  status: string;
  acceptedByUserId?: string | null;
  acceptorName?: string | null;
  createdAt: string;
};

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: "books", label: "Books & Notes", icon: BookOpen, color: "bg-amber-100 text-amber-700" },
  { value: "documents", label: "Documents", icon: FileText, color: "bg-blue-100 text-blue-700" },
  { value: "food", label: "Packed Food", icon: UtensilsCrossed, color: "bg-orange-100 text-orange-700" },
  { value: "medicine", label: "Medicine", icon: Pill, color: "bg-red-100 text-red-700" },
  { value: "gift", label: "Gift / Parcel", icon: Gift, color: "bg-pink-100 text-pink-700" },
  { value: "other", label: "Other", icon: Package, color: "bg-gray-100 text-gray-700" },
] as const;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Open", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  accepted: { label: "Carrier Found", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Bike },
  in_transit: { label: "In Transit", color: "bg-purple-100 text-purple-700 border-purple-200", icon: Truck },
  delivered: { label: "Delivered", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200", icon: AlertCircle },
};

function getCategoryConfig(value: string) {
  return CATEGORIES.find(c => c.value === value) ?? CATEGORIES[5];
}

// ─── Post Request Form Schema ─────────────────────────────────────────────────
const requestSchema = z.object({
  itemTitle: z.string().min(3, "Describe the item (min 3 characters)"),
  itemDescription: z.string().optional(),
  itemCategory: z.enum(["books", "documents", "food", "medicine", "gift", "other"]),
  estimatedWeightKg: z.number().min(0.1).max(5),
  pickupLocality: z.string().min(2, "Enter your pickup neighbourhood (e.g. Aundh)"),
  pickupAddress: z.string().min(10, "Enter full pickup address for the carrier"),
  dropoffLocality: z.string().min(2, "Enter the dropoff neighbourhood"),
  dropoffAddress: z.string().min(10, "Enter full dropoff address"),
  city: z.string().min(2, "Enter city"),
  offeredPrice: z.number().min(0),
  preferredTime: z.string().optional(),
  notes: z.string().optional(),
});

// ─── API Helpers ──────────────────────────────────────────────────────────────
async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Request Card ─────────────────────────────────────────────────────────────
function RequestCard({
  request,
  currentUserId,
  onAccept,
  onStatusUpdate,
  isFullDetail = false,
}: {
  request: P2PRequest;
  currentUserId?: string;
  onAccept?: (id: string) => void;
  onStatusUpdate?: (id: string, status: string) => void;
  isFullDetail?: boolean;
}) {
  const cat = getCategoryConfig(request.itemCategory);
  const CatIcon = cat.icon;
  const statusCfg = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.open;
  const StatusIcon = statusCfg.icon;

  const isRequester = currentUserId === request.requesterId;
  const isCarrier = currentUserId === request.acceptedByUserId;
  const price = parseFloat(String(request.offeredPrice));

  return (
    <Card className="hover:shadow-md transition-shadow group">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${cat.color}`}>
            <CatIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-base truncate">{request.itemTitle}</h3>
              <Badge variant="outline" className={`shrink-0 text-xs border ${statusCfg.color} flex items-center gap-1`}>
                <StatusIcon className="w-3 h-3" />
                {statusCfg.label}
              </Badge>
            </div>

            {request.itemDescription && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{request.itemDescription}</p>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="font-medium text-foreground">{request.pickupLocality}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium text-foreground">{request.dropoffLocality}</span>
              <span className="text-muted-foreground">· {request.city}</span>
            </div>

            {isFullDetail && (request.pickupAddress || request.dropoffAddress) && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm mb-3 space-y-1">
                {request.pickupAddress && (
                  <div><span className="font-medium">Pickup: </span>{request.pickupAddress}</div>
                )}
                {request.dropoffAddress && (
                  <div><span className="font-medium">Dropoff: </span>{request.dropoffAddress}</div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <Weight className="w-3 h-3" />
                {parseFloat(String(request.estimatedWeightKg ?? 0.5)).toFixed(1)} kg
              </span>
              {request.preferredTime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {request.preferredTime}
                </span>
              )}
              <span className="flex items-center gap-1">
                <IndianRupee className="w-3 h-3" />
                {price === 0 ? "Free / Favour" : `₹${price}`}
              </span>
              <span className="ml-auto">
                By {request.requesterName || "Community Member"} · {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap">
              {request.status === "open" && !isRequester && onAccept && (
                <Button size="sm" onClick={() => onAccept(request.id)} className="flex-1">
                  <Bike className="w-4 h-4 mr-1.5" /> I'll Carry This
                </Button>
              )}
              {request.status === "open" && isRequester && (
                <Button size="sm" variant="destructive" onClick={() => onStatusUpdate?.(request.id, "cancelled")}>
                  Cancel Request
                </Button>
              )}
              {isCarrier && request.status === "accepted" && (
                <Button size="sm" onClick={() => onStatusUpdate?.(request.id, "in_transit")}>
                  <Truck className="w-4 h-4 mr-1.5" /> Mark Picked Up
                </Button>
              )}
              {isCarrier && request.status === "in_transit" && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onStatusUpdate?.(request.id, "delivered")}>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Mark Delivered
                </Button>
              )}
              {isRequester && request.status === "accepted" && (
                <Button size="sm" variant="destructive" onClick={() => onStatusUpdate?.(request.id, "cancelled")}>
                  Cancel
                </Button>
              )}
              {request.status === "accepted" && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Bike className="w-3 h-3" /> {request.acceptorName || "Carrier"} has accepted
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Post Request Dialog ──────────────────────────────────────────────────────
function PostRequestDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated, login } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      itemCategory: "books",
      estimatedWeightKg: 0.5,
      offeredPrice: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof requestSchema>) =>
      apiFetch("/api/peer-deliveries", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({ title: "Request posted!", description: "Community carriers will see your request and can accept it." });
      queryClient.invalidateQueries({ queryKey: ["/api/peer-deliveries"] });
      setOpen(false);
      form.reset();
      onSuccess();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  if (!isAuthenticated) {
    return (
      <Button onClick={login} size="lg">
        <Plus className="w-4 h-4 mr-2" /> Post a Request
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus className="w-4 h-4 mr-2" /> Post a Request
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Request a Delivery</DialogTitle>
          <DialogDescription>
            Describe what you need delivered and someone in your community will carry it for you.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
            <FormField control={form.control} name="itemTitle" render={({ field }) => (
              <FormItem>
                <FormLabel>What needs to be delivered?</FormLabel>
                <FormControl><Input placeholder="e.g. Operating Systems textbook, Lab report" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="itemCategory" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2"><c.icon className="w-3.5 h-3.5" />{c.label}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="estimatedWeightKg" render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight (kg)</FormLabel>
                  <Select onValueChange={v => field.onChange(parseFloat(v))} defaultValue={String(field.value)}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="0.25">Less than 0.5 kg</SelectItem>
                      <SelectItem value="0.5">0.5 – 1 kg</SelectItem>
                      <SelectItem value="1.5">1 – 2 kg</SelectItem>
                      <SelectItem value="3">2 – 4 kg</SelectItem>
                      <SelectItem value="5">4 – 5 kg</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="itemDescription" render={({ field }) => (
              <FormItem>
                <FormLabel>Description <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                <FormControl><Textarea placeholder="Add any details the carrier should know..." className="resize-none h-16" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl><Input placeholder="e.g. Pune" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="preferredTime" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Time <span className="text-muted-foreground font-normal">(opt.)</span></FormLabel>
                  <FormControl><Input placeholder="e.g. After 4 PM" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="bg-muted/50 p-3 rounded-lg space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pickup details</p>
              <FormField control={form.control} name="pickupLocality" render={({ field }) => (
                <FormItem>
                  <FormLabel>Pickup Neighbourhood</FormLabel>
                  <FormControl><Input placeholder="e.g. Aundh, FC Road, COEP Campus" {...field} /></FormControl>
                  <FormDescription className="text-xs">Shown publicly to attract carriers</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="pickupAddress" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Pickup Address</FormLabel>
                  <FormControl><Input placeholder="Building, street, landmark" {...field} /></FormControl>
                  <FormDescription className="text-xs">Shared only with your accepted carrier</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="bg-muted/50 p-3 rounded-lg space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dropoff details</p>
              <FormField control={form.control} name="dropoffLocality" render={({ field }) => (
                <FormItem>
                  <FormLabel>Dropoff Neighbourhood</FormLabel>
                  <FormControl><Input placeholder="e.g. Baner, Hinjewadi" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dropoffAddress" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Dropoff Address</FormLabel>
                  <FormControl><Input placeholder="Building, street, landmark" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="offeredPrice" render={({ field }) => (
              <FormItem>
                <FormLabel>Offer Amount (₹)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" min={0} className="pl-8" placeholder="0 for free / favour" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                  </div>
                </FormControl>
                <FormDescription>Enter 0 if you want it as a community favour</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Posting..." : "Post Request"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PeerDelivery() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cityFilter, setCityFilter] = useState("");
  const [activeTab, setActiveTab] = useState("marketplace");

  const { data: marketplaceData, isLoading: marketLoading, refetch } = useQuery({
    queryKey: ["/api/peer-deliveries", { city: cityFilter }],
    queryFn: () => apiFetch(`/api/peer-deliveries${cityFilter ? `?city=${encodeURIComponent(cityFilter)}` : ""}`),
    refetchInterval: 15000,
  });

  const { data: mineData, isLoading: mineLoading } = useQuery({
    queryKey: ["/api/peer-deliveries/mine"],
    queryFn: () => apiFetch("/api/peer-deliveries/mine"),
    enabled: isAuthenticated,
    refetchInterval: 10000,
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/peer-deliveries/${id}/accept`, { method: "PATCH" }),
    onSuccess: () => {
      toast({ title: "Request accepted!", description: "Check 'I'm Carrying' for pickup details." });
      queryClient.invalidateQueries({ queryKey: ["/api/peer-deliveries"] });
      setActiveTab("carrying");
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/api/peer-deliveries/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      toast({ title: "Status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/peer-deliveries"] });
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  const requests: P2PRequest[] = marketplaceData?.requests || [];
  const posted: P2PRequest[] = mineData?.posted || [];
  const carrying: P2PRequest[] = mineData?.carrying || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
        <div className="container py-10 md:py-14 max-w-5xl">
          <div className="flex items-start gap-3 mb-6">
            <Button variant="ghost" size="sm" asChild className="-ml-3">
              <Link href="/"><ArrowLeft className="w-4 h-4 mr-1" /> Home</Link>
            </Button>
          </div>
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-primary/15 rounded-2xl flex items-center justify-center">
                  <Bike className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-serif font-bold">Carry & Earn</h1>
                  <p className="text-muted-foreground">Community peer delivery for students & office workers</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-amber-600" /> Share books & notes</span>
                <span className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-blue-600" /> Send documents</span>
                <span className="flex items-center gap-1.5"><Package className="w-4 h-4 text-gray-600" /> Light packages up to 5 kg</span>
              </div>
            </div>
            <PostRequestDialog onSuccess={() => setActiveTab("my-requests")} />
          </div>
        </div>
      </div>

      <div className="container py-8 max-w-5xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="marketplace">
                Marketplace {requests.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{requests.length}</Badge>}
              </TabsTrigger>
              {isAuthenticated && (
                <>
                  <TabsTrigger value="my-requests">
                    My Requests {posted.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{posted.length}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="carrying">
                    I'm Carrying {carrying.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{carrying.length}</Badge>}
                  </TabsTrigger>
                </>
              )}
            </TabsList>
            <Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* ── Marketplace ── */}
          <TabsContent value="marketplace">
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1 max-w-xs">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by city..."
                  className="pl-9"
                  value={cityFilter}
                  onChange={e => setCityFilter(e.target.value)}
                />
              </div>
            </div>

            {marketLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <Bike className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <h3 className="font-serif text-xl">No open requests right now</h3>
                <p className="text-muted-foreground">Be the first to post a delivery request in your community!</p>
                <PostRequestDialog onSuccess={() => setActiveTab("my-requests")} />
              </div>
            ) : (
              <div className="grid gap-4">
                {requests.map(req => (
                  <RequestCard
                    key={req.id}
                    request={req}
                    currentUserId={user?.id}
                    onAccept={id => acceptMutation.mutate(id)}
                    onStatusUpdate={(id, status) => statusMutation.mutate({ id, status })}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── My Requests ── */}
          <TabsContent value="my-requests">
            {mineLoading ? (
              <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div>
            ) : posted.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <Package className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <h3 className="font-serif text-xl">No requests posted yet</h3>
                <p className="text-muted-foreground">Need something delivered? Post a request and a community carrier will pick it up.</p>
                <PostRequestDialog onSuccess={() => {}} />
              </div>
            ) : (
              <div className="grid gap-4">
                {posted.map(req => (
                  <RequestCard
                    key={req.id}
                    request={req}
                    currentUserId={user?.id}
                    isFullDetail
                    onStatusUpdate={(id, status) => statusMutation.mutate({ id, status })}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── I'm Carrying ── */}
          <TabsContent value="carrying">
            {mineLoading ? (
              <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div>
            ) : carrying.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <Bike className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <h3 className="font-serif text-xl">Not carrying anything yet</h3>
                <p className="text-muted-foreground">Browse the marketplace and accept a delivery request to earn or help someone out.</p>
                <Button onClick={() => setActiveTab("marketplace")}>Browse Marketplace</Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {carrying.map(req => (
                  <RequestCard
                    key={req.id}
                    request={req}
                    currentUserId={user?.id}
                    isFullDetail
                    onStatusUpdate={(id, status) => statusMutation.mutate({ id, status })}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
