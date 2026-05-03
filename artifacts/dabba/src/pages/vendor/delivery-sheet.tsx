import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Printer, Phone, MapPin, CalendarDays, RefreshCw,
  CheckCircle2, Clock, ChefHat, PackageCheck, Bike, XCircle,
  ClipboardList, ChevronDown,
} from "lucide-react";

import { useGetMyVendorProfile } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
type Delivery = {
  orderId: string;
  status: string;
  scheduledDate: string;
  mealType?: string | null;
  totalAmount: string;
  deliveryAddress?: string | null;
  specialInstructions?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  deliverySlot?: string | null;
  planName?: string | null;
};

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:    { label: "Pending",    color: "bg-amber-100 text-amber-700 border-amber-200",  icon: Clock },
  accepted:   { label: "Accepted",   color: "bg-blue-100 text-blue-700 border-blue-200",    icon: CheckCircle2 },
  preparing:  { label: "Preparing",  color: "bg-purple-100 text-purple-700 border-purple-200", icon: ChefHat },
  packed:     { label: "Packed",     color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: PackageCheck },
  picked_up:  { label: "Picked Up",  color: "bg-cyan-100 text-cyan-700 border-cyan-200",    icon: Bike },
  delivered:  { label: "Delivered",  color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  cancelled:  { label: "Cancelled",  color: "bg-red-100 text-red-700 border-red-200",       icon: XCircle },
};

const NEXT_STATUS: Record<string, string | null> = {
  pending:   "accepted",
  accepted:  "preparing",
  preparing: "packed",
  packed:    "picked_up",
  picked_up: "delivered",
  delivered: null,
  cancelled: null,
};

const NEXT_LABEL: Record<string, string> = {
  pending:   "Accept",
  accepted:  "Mark Preparing",
  preparing: "Mark Packed",
  packed:    "Mark Picked Up",
  picked_up: "Mark Delivered",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayLocal() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function groupBySlot(deliveries: Delivery[]): Record<string, Delivery[]> {
  const map: Record<string, Delivery[]> = {};
  for (const d of deliveries) {
    const slot = d.deliverySlot || "Unspecified Slot";
    if (!map[slot]) map[slot] = [];
    map[slot].push(d);
  }
  return map;
}

// ─── Delivery row ─────────────────────────────────────────────────────────────
function DeliveryRow({ delivery, vendorId, onAdvanced }: {
  delivery: Delivery;
  vendorId: string;
  onAdvanced: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const cfg = STATUS_CFG[delivery.status] ?? STATUS_CFG.pending;
  const Icon = cfg.icon;
  const nextStatus = NEXT_STATUS[delivery.status];

  const advance = useMutation({
    mutationFn: async () => {
      if (!nextStatus) return;
      const res = await fetch(`/api/orders/${delivery.orderId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [`/api/vendors/${vendorId}/delivery-sheet`] });
      onAdvanced();
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Could not update order status." });
    },
  });

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 border rounded-xl bg-card hover:shadow-sm transition-shadow print:border print:rounded-none print:p-3">
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{delivery.customerName || "Customer"}</span>
          {delivery.customerPhone && (
            <a
              href={`tel:${delivery.customerPhone}`}
              className="flex items-center gap-1 text-xs text-primary hover:underline print:no-underline"
            >
              <Phone className="w-3 h-3" />
              {delivery.customerPhone}
            </a>
          )}
          <Badge variant="outline" className={`text-[11px] px-2 py-0.5 flex items-center gap-1 ${cfg.color}`}>
            <Icon className="w-3 h-3" />
            {cfg.label}
          </Badge>
        </div>

        <div className="flex items-start gap-1 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
          <span className="line-clamp-2">{delivery.deliveryAddress || "Address not provided"}</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {delivery.mealType && (
            <span className="capitalize font-medium text-foreground">{delivery.mealType}</span>
          )}
          {delivery.planName && (
            <span className="text-muted-foreground">{delivery.planName}</span>
          )}
          <span className="font-medium text-foreground">
            ₹{parseFloat(delivery.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {delivery.specialInstructions && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            Note: {delivery.specialInstructions}
          </p>
        )}
      </div>

      {nextStatus && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 text-xs h-8 print:hidden"
          onClick={() => advance.mutate()}
          disabled={advance.isPending}
        >
          {advance.isPending ? "..." : NEXT_LABEL[delivery.status]}
        </Button>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function VendorDeliverySheet() {
  const today = todayLocal();
  const [date, setDate] = useState(today);
  const [refresh, setRefresh] = useState(0);

  const { data: profileData } = useGetMyVendorProfile();
  const vendorId = profileData?.vendor?.id;

  const { data, isLoading } = useQuery({
    queryKey: [`/api/vendors/${vendorId}/delivery-sheet`, date, refresh],
    queryFn: async () => {
      if (!vendorId) return { deliveries: [] as Delivery[], date, total: 0 };
      const res = await fetch(`/api/vendors/${vendorId}/delivery-sheet?date=${date}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ deliveries: Delivery[]; date: string; total: number }>;
    },
    enabled: !!vendorId,
  });

  const deliveries = data?.deliveries ?? [];
  const grouped = groupBySlot(deliveries);
  const slots = Object.keys(grouped).sort();

  const byStatus = deliveries.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pending   = (byStatus.pending ?? 0) + (byStatus.accepted ?? 0) + (byStatus.preparing ?? 0) + (byStatus.packed ?? 0) + (byStatus.picked_up ?? 0);
  const delivered = byStatus.delivered ?? 0;
  const cancelled = byStatus.cancelled ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 print:p-0 print:max-w-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Delivery Sheet
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">All deliveries for a given day at a glance</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              value={date}
              max={new Date(Date.now() + 7 * 86400_000).toISOString().split("T")[0]}
              onChange={e => setDate(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setRefresh(r => r + 1)} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-3.5 h-3.5" />
            Print
          </Button>
        </div>
      </div>

      {/* Print header (only shows when printing) */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Delivery Sheet</h1>
        <p className="text-sm text-gray-600">
          {format(new Date(date + "T00:00:00"), "EEEE, d MMMM yyyy")}
          {profileData?.vendor?.name ? ` — ${profileData.vendor.name}` : ""}
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
        {[
          { label: "Total",     value: deliveries.length, color: "text-foreground" },
          { label: "Active",    value: pending,            color: "text-amber-600" },
          { label: "Delivered", value: delivered,          color: "text-green-600" },
          { label: "Cancelled", value: cancelled,          color: "text-red-500" },
        ].map(stat => (
          <Card key={stat.label} className="text-center">
            <CardContent className="p-4">
              <p className={`text-2xl font-bold font-serif ${stat.color}`}>{isLoading ? "—" : stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : deliveries.length === 0 ? (
        <Card>
          <CardContent className="p-16 text-center">
            <ClipboardList className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">No deliveries scheduled</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {date === today ? "No orders for today." : `No orders on ${format(new Date(date + "T00:00:00"), "d MMM yyyy")}.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {slots.map(slot => (
            <div key={slot}>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm capitalize">{slot}</h2>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {grouped[slot].length} {grouped[slot].length === 1 ? "delivery" : "deliveries"}
                </span>
              </div>
              <div className="space-y-2">
                {grouped[slot].map(d => (
                  <DeliveryRow
                    key={d.orderId}
                    delivery={d}
                    vendorId={vendorId ?? ""}
                    onAdvanced={() => setRefresh(r => r + 1)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
