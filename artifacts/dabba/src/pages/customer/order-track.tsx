import { useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, ChefHat, CheckCircle2, Clock, Package, Bike, Star,
  MapPin, Calendar, Loader2, AlertCircle, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────
type Order = {
  id: string;
  vendorId: string;
  vendorName?: string;
  customerName?: string;
  status: string;
  scheduledDate: string;
  mealType?: string | null;
  totalAmount: string | number;
  deliveryAddress?: string | null;
  specialInstructions?: string | null;
  updatedAt: string;
  createdAt: string;
};

// ─── Status pipeline definition ───────────────────────────────────────────────
const STAGES = [
  {
    key: "pending",
    label: "Order Placed",
    desc: "Your tiffin order is confirmed and waiting for the kitchen to accept.",
    icon: Clock,
  },
  {
    key: "accepted",
    label: "Accepted by Kitchen",
    desc: "The kitchen has confirmed your order and will start preparing soon.",
    icon: CheckCircle2,
  },
  {
    key: "preparing",
    label: "Preparing Your Tiffin",
    desc: "Fresh ingredients are being cooked just for you.",
    icon: ChefHat,
  },
  {
    key: "packed",
    label: "Packed & Ready",
    desc: "Your tiffin is packed and waiting for the delivery partner.",
    icon: Package,
  },
  {
    key: "picked_up",
    label: "Out for Delivery",
    desc: "Your tiffin is on its way! Should arrive within your delivery slot.",
    icon: Bike,
  },
  {
    key: "delivered",
    label: "Delivered",
    desc: "Your tiffin has been delivered. Enjoy your meal!",
    icon: Star,
  },
] as const;

const STAGE_KEYS = STAGES.map(s => s.key);

function getStageIndex(status: string) {
  const idx = STAGE_KEYS.indexOf(status as typeof STAGE_KEYS[number]);
  return idx === -1 ? 0 : idx;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function OrderTrack() {
  const [, params] = useRoute("/orders/:orderId/track");
  const orderId = params?.orderId;

  const { data, isLoading, isError, dataUpdatedAt, refetch } = useQuery({
    queryKey: ["/api/orders", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) throw new Error("Order not found");
      return res.json() as Promise<{ order: Order }>;
    },
    enabled: !!orderId,
    refetchInterval: (query) => {
      const status = query.state.data?.order?.status;
      // Stop polling once terminal state reached
      if (status === "delivered" || status === "cancelled") return false;
      return 5000;
    },
    staleTime: 0,
  });

  const order = data?.order;
  const isCancelled = order?.status === "cancelled";
  const isDelivered = order?.status === "delivered";
  const isTerminal = isCancelled || isDelivered;

  const currentStageIndex = order ? getStageIndex(order.status) : 0;

  return (
    <div className="container max-w-2xl py-8 min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" asChild className="-ml-2">
          <Link href="/orders"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-serif font-bold">Live Order Tracking</h1>
          {order && (
            <p className="text-sm text-muted-foreground">
              {order.vendorName} · {format(new Date(order.scheduledDate), "MMMM d, yyyy")}
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <AlertCircle className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">Could not load this order.</p>
            <Button variant="outline" asChild><Link href="/orders">Back to Orders</Link></Button>
          </CardContent>
        </Card>
      ) : order ? (
        <div className="space-y-6">
          {/* Order Summary Card */}
          <Card className="border-primary/20">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ChefHat className="w-4 h-4 text-primary" />
                    <span className="font-semibold">{order.vendorName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{format(new Date(order.scheduledDate), "EEEE, MMMM d")}</span>
                    {order.mealType && <Badge variant="secondary" className="capitalize text-xs">{order.mealType}</Badge>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">₹{parseFloat(String(order.totalAmount)).toFixed(0)}</div>
                  <div className="text-xs text-muted-foreground font-mono">#{order.id.substring(0, 8)}</div>
                </div>
              </div>
              {order.deliveryAddress && (
                <div className="mt-3 pt-3 border-t flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                  <span>{order.deliveryAddress}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cancelled State */}
          {isCancelled ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6 text-center space-y-2">
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
                <h3 className="font-semibold text-red-700">Order Cancelled</h3>
                <p className="text-sm text-red-600">This order was cancelled. If you were charged, a refund will be processed to your wallet.</p>
                <Button variant="outline" asChild className="mt-2">
                  <Link href="/explore">Order Again</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Live Status Pipeline */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-semibold">Order Status</h2>
                    <div className="flex items-center gap-2">
                      {!isTerminal && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          Updating live
                        </span>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()}>
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-0">
                    {STAGES.map((stage, idx) => {
                      const isCompleted = idx < currentStageIndex;
                      const isCurrent = idx === currentStageIndex;
                      const isUpcoming = idx > currentStageIndex;
                      const Icon = stage.icon;

                      return (
                        <div key={stage.key} className="flex gap-4">
                          {/* Timeline marker */}
                          <div className="flex flex-col items-center">
                            <div className={`
                              w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10 transition-all
                              ${isCompleted ? "bg-primary text-primary-foreground" : ""}
                              ${isCurrent ? "bg-primary/15 border-2 border-primary text-primary ring-4 ring-primary/10" : ""}
                              ${isUpcoming ? "bg-muted text-muted-foreground/40 border-2 border-muted" : ""}
                            `}>
                              {isCompleted ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : isCurrent ? (
                                <Icon className={`w-4 h-4 ${!isDelivered ? "animate-pulse" : ""}`} />
                              ) : (
                                <Icon className="w-4 h-4" />
                              )}
                            </div>
                            {idx < STAGES.length - 1 && (
                              <div className={`w-0.5 flex-1 my-1 min-h-[28px] transition-colors ${isCompleted ? "bg-primary" : "bg-border"}`} />
                            )}
                          </div>

                          {/* Content */}
                          <div className={`pb-6 flex-1 ${idx === STAGES.length - 1 ? "pb-0" : ""}`}>
                            <div className={`font-medium text-sm ${isUpcoming ? "text-muted-foreground/50" : isCompleted ? "text-foreground line-through decoration-primary/40" : "text-foreground"}`}>
                              {stage.label}
                              {isCurrent && !isDelivered && (
                                <span className="ml-2 inline-flex items-center gap-1 text-xs text-primary font-semibold">
                                  <Loader2 className="w-3 h-3 animate-spin" /> Current
                                </span>
                              )}
                              {isCurrent && isDelivered && (
                                <span className="ml-2 text-xs text-green-600 font-semibold">Done!</span>
                              )}
                            </div>
                            {(isCurrent || isCompleted) && (
                              <p className={`text-xs mt-0.5 ${isCompleted ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                                {stage.desc}
                              </p>
                            )}
                            {isCurrent && dataUpdatedAt > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Updated {formatDistanceToNow(new Date(order.updatedAt), { addSuffix: true })}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{Math.round(((currentStageIndex) / (STAGES.length - 1)) * 100)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700"
                    style={{ width: `${(currentStageIndex / (STAGES.length - 1)) * 100}%` }}
                  />
                </div>
              </div>

              {isDelivered && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Star className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-green-800">Delivered! Enjoy your meal.</p>
                      <p className="text-sm text-green-700">Rate your experience to help others discover great tiffins.</p>
                    </div>
                    <Button size="sm" asChild>
                      <Link href="/orders">Rate</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Last refreshed */}
          {!isTerminal && (
            <p className="text-center text-xs text-muted-foreground">
              Auto-refreshes every 5 seconds · Last updated {dataUpdatedAt > 0 ? formatDistanceToNow(dataUpdatedAt, { addSuffix: true }) : "just now"}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
