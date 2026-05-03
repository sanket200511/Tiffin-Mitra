import { useState } from "react";
import { useListReviews, useGetMyVendorProfile } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, MessageSquare, TrendingUp, ThumbsUp, Reply, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export default function VendorReviews() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data: profileData, isLoading: profileLoading } = useGetMyVendorProfile();
  const vendorId = profileData?.vendor?.id;

  const { data: reviewsData, isLoading: reviewsLoading } = useListReviews(
    { vendorId },
    { query: { enabled: !!vendorId, queryKey: ["/api/reviews", vendorId] } }
  );

  const reviews = reviewsData?.reviews || [];
  const isLoading = profileLoading || reviewsLoading;

  const replyMutation = useMutation({
    mutationFn: async ({ reviewId, response }: { reviewId: string; response: string }) => {
      const res = await fetch(`/api/reviews/${reviewId}/response`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any)?.error || "Failed to submit reply");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Reply published", description: "Your response is now visible to customers." });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews", vendorId] });
      setReplyingTo(null);
      setReplyText("");
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Could not submit reply", description: err.message });
    }
  });

  const handleReply = (reviewId: string) => {
    if (!replyText.trim()) return;
    replyMutation.mutate({ reviewId, response: replyText.trim() });
  };

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length
    : 0;

  const ratingBuckets = [5, 4, 3, 2, 1].map(r => ({
    stars: r,
    count: reviews.filter(rev => rev.rating === r).length,
    pct: reviews.length > 0 ? (reviews.filter(rev => rev.rating === r).length / reviews.length) * 100 : 0,
  }));

  const positiveCount = reviews.filter(r => (r.rating ?? 0) >= 4).length;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Customer Reviews</h1>
        <p className="text-muted-foreground mt-1">What your customers are saying about your kitchen.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-6">
        <Card className="shadow-sm border-l-4 border-l-yellow-400">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            </div>
            {isLoading ? <Skeleton className="h-10 w-24" /> : (
              <>
                <div className="text-4xl font-bold">{reviews.length > 0 ? avgRating.toFixed(1) : "—"}</div>
                <StarRating rating={Math.round(avgRating)} />
              </>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Reviews</p>
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </div>
            {isLoading ? <Skeleton className="h-10 w-16" /> : (
              <div className="text-4xl font-bold">{reviews.length}</div>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Positive Reviews</p>
              <ThumbsUp className="h-4 w-4 text-green-500" />
            </div>
            {isLoading ? <Skeleton className="h-10 w-20" /> : (
              <>
                <div className="text-4xl font-bold">{positiveCount}</div>
                <p className="text-xs text-muted-foreground mt-1">4 stars and above</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Rating breakdown */}
        <Card className="shadow-sm lg:col-span-1">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Rating Breakdown
            </h3>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            ) : (
              <div className="space-y-3">
                {ratingBuckets.map(({ stars, count, pct }) => (
                  <div key={stars} className="flex items-center gap-3">
                    <span className="text-sm w-5 text-right font-medium">{stars}</span>
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm text-muted-foreground w-4 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review list */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))
          ) : reviews.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-xl border border-dashed shadow-sm">
              <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
              <h3 className="text-xl font-bold font-serif mb-2">No reviews yet</h3>
              <p className="text-muted-foreground text-sm">
                As customers receive and enjoy their tiffins, their reviews will appear here.
              </p>
            </div>
          ) : (
            reviews.map((review) => (
              <Card key={review.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                        {(review.customerName || "A")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{review.customerName || "Anonymous Customer"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StarRating rating={review.rating ?? 0} />
                      <Badge variant="outline" className={`text-xs ${
                        (review.rating ?? 0) >= 4 ? "border-green-300 text-green-700 bg-green-50" :
                        (review.rating ?? 0) >= 3 ? "border-yellow-300 text-yellow-700 bg-yellow-50" :
                        "border-red-300 text-red-700 bg-red-50"
                      }`}>
                        {review.rating}/5
                      </Badge>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-foreground/80 mt-4 leading-relaxed border-t pt-4">
                      "{review.comment}"
                    </p>
                  )}

                  {/* Existing vendor response */}
                  {(review as any).vendorResponse && replyingTo !== review.id && (
                    <div className="mt-4 border-t pt-4">
                      <div className="bg-primary/5 border border-primary/15 rounded-lg p-4">
                        <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
                          <Reply className="w-3 h-3" /> Your Response
                        </p>
                        <p className="text-sm text-foreground/80 leading-relaxed">{(review as any).vendorResponse}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-7 text-xs text-muted-foreground"
                        onClick={() => { setReplyingTo(review.id); setReplyText((review as any).vendorResponse || ""); }}
                      >
                        Edit Reply
                      </Button>
                    </div>
                  )}

                  {/* Reply form */}
                  {replyingTo === review.id ? (
                    <div className="mt-4 border-t pt-4 space-y-3">
                      <p className="text-xs font-semibold text-primary flex items-center gap-1">
                        <Reply className="w-3 h-3" /> Write your response
                      </p>
                      <Textarea
                        className="resize-none text-sm"
                        rows={3}
                        placeholder="Thank the customer, address their feedback..."
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        maxLength={600}
                        autoFocus
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => { setReplyingTo(null); setReplyText(""); }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          disabled={!replyText.trim() || replyMutation.isPending}
                          onClick={() => handleReply(review.id)}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          {replyMutation.isPending ? "Posting..." : "Post Reply"}
                        </Button>
                      </div>
                    </div>
                  ) : !(review as any).vendorResponse && (
                    <div className="mt-3 pt-3 border-t flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => { setReplyingTo(review.id); setReplyText(""); }}
                      >
                        <Reply className="w-3.5 h-3.5" /> Reply to Review
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
