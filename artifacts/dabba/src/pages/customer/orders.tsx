import { useState } from "react";
import { useListOrders, useCreateReview } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search, Filter, ShoppingBag, Clock, CheckCircle2, AlertCircle, Star, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type Order = {
  id: string;
  vendorId: string;
  vendorName?: string;
  scheduledDate: string;
  mealType?: string | null;
  totalAmount: string | number;
  status: string;
};

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          className="p-0.5 rounded transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          aria-label={`Rate ${star} stars`}
        >
          <Star
            className={`w-8 h-8 transition-colors ${
              star <= (hovered || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

const STATUS_CONFIG: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  pending: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock, label: "Pending" },
  accepted: { color: "bg-blue-100 text-blue-800 border-blue-200", icon: CheckCircle2, label: "Accepted" },
  preparing: { color: "bg-orange-100 text-orange-800 border-orange-200", icon: Clock, label: "Preparing" },
  packed: { color: "bg-purple-100 text-purple-800 border-purple-200", icon: CheckCircle2, label: "Packed" },
  picked_up: { color: "bg-indigo-100 text-indigo-800 border-indigo-200", icon: Clock, label: "Picked Up" },
  delivered: { color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2, label: "Delivered" },
  cancelled: { color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle, label: "Cancelled" },
};

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: ordersData, isLoading } = useListOrders({
    status: statusFilter !== "all" ? statusFilter as any : undefined
  });

  const rawOrders: Order[] = (ordersData?.orders as Order[]) || [];
  const orders = searchQuery.trim()
    ? rawOrders.filter(o =>
        o.vendorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : rawOrders;

  // Review dialog state
  const [reviewingOrder, setReviewingOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());

  const createReview = useCreateReview({
    mutation: {
      onSuccess: () => {
        toast({ title: "Review submitted", description: "Thank you for your feedback!" });
        if (reviewingOrder) setReviewed(prev => new Set([...prev, reviewingOrder.id]));
        setReviewingOrder(null);
        setRating(0);
        setComment("");
        queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error || "Could not submit review.";
        toast({ variant: "destructive", title: "Error", description: msg });
      }
    }
  });

  const handleReviewSubmit = () => {
    if (!reviewingOrder || rating === 0) return;
    createReview.mutate({
      data: {
        vendorId: reviewingOrder.vendorId,
        orderId: reviewingOrder.id,
        rating,
        comment: comment.trim() || undefined,
      }
    });
  };

  const openReviewDialog = (order: Order) => {
    setReviewingOrder(order);
    setRating(0);
    setComment("");
  };

  return (
    <div className="container py-8 max-w-5xl min-h-screen space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="-ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Order History</h1>
          <p className="text-muted-foreground mt-0.5">Track your daily deliveries and past orders</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by kitchen name or order ID..."
            className="pl-9"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[120px]">Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Kitchen</TableHead>
              <TableHead>Meal</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full max-w-[120px]" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <ShoppingBag className="w-10 h-10 text-muted-foreground/30" />
                    <p>No orders found.</p>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/explore">Explore Kitchens</Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
                const Icon = cfg.icon;
                const canReview = order.status === "delivered" && !reviewed.has(order.id);

                return (
                  <TableRow key={order.id} className="hover:bg-muted/20">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{order.id.substring(0, 8)}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{format(new Date(order.scheduledDate), "MMM d, yyyy")}</span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.vendorName || "Kitchen"}
                    </TableCell>
                    <TableCell className="capitalize">
                      {order.mealType || "Standard"}
                    </TableCell>
                    <TableCell className="font-medium">
                      ₹{parseFloat(String(order.totalAmount)).toFixed(0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize font-medium border ${cfg.color} px-2.5 py-0.5 flex w-fit items-center gap-1`}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canReview && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                          onClick={() => openReviewDialog(order)}
                        >
                          <Star className="w-3 h-3 mr-1" /> Rate
                        </Button>
                      )}
                      {order.status === "delivered" && reviewed.has(order.id) && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-500" /> Reviewed
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Leave Review Dialog */}
      <Dialog open={!!reviewingOrder} onOpenChange={(open) => { if (!open) setReviewingOrder(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Rate Your Experience</DialogTitle>
            <DialogDescription>
              How was your tiffin from <strong>{reviewingOrder?.vendorName}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-3">
              <p className="text-sm font-medium">Your Rating</p>
              <div className="flex flex-col items-center gap-2">
                <StarPicker value={rating} onChange={setRating} />
                {rating > 0 && (
                  <p className="text-sm font-semibold text-primary">{RATING_LABELS[rating]}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Comments <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Textarea
                placeholder="Tell others about the food quality, packaging, and delivery..."
                className="resize-none h-24"
                value={comment}
                onChange={e => setComment(e.target.value)}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">{comment.length}/500</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewingOrder(null)}>Cancel</Button>
            <Button
              onClick={handleReviewSubmit}
              disabled={rating === 0 || createReview.isPending}
            >
              {createReview.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
