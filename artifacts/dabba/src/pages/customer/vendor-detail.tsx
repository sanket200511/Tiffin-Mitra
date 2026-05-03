import { useRoute, Link } from "wouter";
import { 
  useGetVendor, 
  useListMenuItems, 
  useListSubscriptionPlans, 
  useListReviews 
} from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, MapPin, ChefHat, Info, Check, MessageSquare, UtensilsCrossed } from "lucide-react";

export default function VendorDetail() {
  const [, params] = useRoute("/vendors/:vendorId");
  const vendorId = params?.vendorId;

  const { data: vendorData, isLoading: vendorLoading } = useGetVendor(vendorId!, {
    query: { enabled: !!vendorId, queryKey: ["/api/vendors", vendorId] }
  });
  const vendor = vendorData?.vendor;

  const { data: menuData, isLoading: menuLoading } = useListMenuItems(vendorId!, undefined, {
    query: { enabled: !!vendorId, queryKey: ["/api/vendors", vendorId, "menu"] }
  });
  const menuItems = menuData?.menuItems || [];

  const { data: plansData, isLoading: plansLoading } = useListSubscriptionPlans(vendorId!, {
    query: { enabled: !!vendorId, queryKey: ["/api/vendors", vendorId, "plans"] }
  });
  const plans = plansData?.plans || [];

  const { data: reviewsData, isLoading: reviewsLoading } = useListReviews({ vendorId }, {
    query: { enabled: !!vendorId, queryKey: ["/api/reviews", { vendorId }] }
  });
  const reviews = reviewsData?.reviews || [];

  if (vendorLoading) {
    return (
      <div className="min-h-screen">
        <Skeleton className="w-full h-64 md:h-80" />
        <div className="container py-8 space-y-6">
          <Skeleton className="w-1/3 h-10" />
          <Skeleton className="w-1/4 h-6" />
          <Skeleton className="w-full h-12 mt-8" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="w-full h-48" />
            <Skeleton className="w-full h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return <div className="container py-20 text-center">Vendor not found</div>;
  }

  return (
    <div className="min-h-screen bg-muted/10 pb-20">
      {/* Cover Image & Header */}
      <div className="relative h-64 md:h-80 bg-muted">
        {vendor.coverImageUrl ? (
          <img src={vendor.coverImageUrl} alt={vendor.name} className="w-full h-full object-cover" loading="eager" decoding="async" />
        ) : (
          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
            <ChefHat className="w-20 h-20 text-primary/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full">
          <div className="container pb-6 md:pb-8 flex flex-col md:flex-row md:items-end gap-6">
            {vendor.logoUrl && (
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl border-4 border-background bg-card overflow-hidden shrink-0 shadow-lg -mb-12 md:-mb-16 z-10 hidden md:block">
                <img src={vendor.logoUrl} alt="Logo" className="w-full h-full object-cover" loading="lazy" decoding="async" />
              </div>
            )}
            <div className="text-white flex-1 space-y-2 z-10">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-serif font-bold">{vendor.name}</h1>
                {vendor.rating && (
                  <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white backdrop-blur border-none flex items-center gap-1 text-sm py-1">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    {vendor.rating} ({vendor.reviewCount} reviews)
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-white/90 text-sm md:text-base flex-wrap">
                <span className="flex items-center gap-1.5"><ChefHat className="w-4 h-4" /> {vendor.cuisineType}</span>
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {vendor.city}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mt-8 md:mt-16">
        <Tabs defaultValue="plans" className="space-y-8">
          <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 rounded-lg overflow-x-auto flex-nowrap">
            <TabsTrigger value="plans" className="text-base py-2.5 px-6 rounded-md">Subscription Plans</TabsTrigger>
            <TabsTrigger value="menu" className="text-base py-2.5 px-6 rounded-md">Menu items</TabsTrigger>
            <TabsTrigger value="about" className="text-base py-2.5 px-6 rounded-md">About & Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-6 outline-none focus-visible:ring-0">
            <div className="space-y-2">
              <h2 className="text-2xl font-serif font-bold">Choose a Plan</h2>
              <p className="text-muted-foreground">Subscribe to daily tiffin service from {vendor.name}</p>
            </div>
            
            {plansLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
              </div>
            ) : plans.length === 0 ? (
              <div className="bg-card p-8 rounded-xl border text-center">
                <p className="text-muted-foreground">No active plans available right now.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <Card key={plan.id} className="flex flex-col border-primary/20 hover:border-primary/50 transition-colors shadow-sm">
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="secondary" className="capitalize text-xs tracking-wider font-semibold bg-primary/10 text-primary">
                          {plan.planType.replace('_', ' ')}
                        </Badge>
                        {plan.dietType && (
                          <Badge variant="outline" className="capitalize border-muted-foreground/30 text-muted-foreground">
                            {plan.dietType.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-xl font-serif">{plan.name}</CardTitle>
                      <div className="mt-4 flex items-baseline gap-1 text-primary">
                        <span className="text-3xl font-bold">₹{plan.price}</span>
                        <span className="text-muted-foreground text-sm font-medium">
                          /{plan.planType === 'daily' ? 'day' : plan.planType.includes('trial') ? 'trial' : plan.planType}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      {plan.description && <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-primary" />
                          <span>Included: <span className="font-medium capitalize">{plan.mealTypes.join(', ')}</span></span>
                        </div>
                        {plan.mealsPerDay && (
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-primary" />
                            <span>{plan.mealsPerDay} meals per day</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-primary" />
                          <span>Free delivery</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full" size="lg" asChild>
                        <Link href={`/subscribe/${vendorId}/${plan.id}`}>Subscribe Now</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="menu" className="space-y-6 outline-none focus-visible:ring-0">
            <div className="space-y-2">
              <h2 className="text-2xl font-serif font-bold">Typical Menu</h2>
              <p className="text-muted-foreground">Browse the variety of dishes served by this kitchen</p>
            </div>
            
            {menuLoading ? (
              <div className="grid md:grid-cols-2 gap-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : menuItems.length === 0 ? (
              <div className="bg-card p-8 rounded-xl border text-center">
                <p className="text-muted-foreground">Menu details not available.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {menuItems.map((item) => (
                  <div key={item.id} className="bg-card border rounded-xl p-4 flex gap-4 shadow-sm hover:shadow-md transition-shadow">
                    {item.imageUrl ? (
                      <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-muted">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <UtensilsCrossed className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-lg leading-tight mb-1">{item.name}</h4>
                          <div className="flex gap-2 flex-wrap mb-2">
                            <Badge variant="outline" className="text-xs py-0 h-5 px-1.5 border-primary/20 text-primary bg-primary/5 capitalize">
                              {item.mealType}
                            </Badge>
                            <Badge variant="outline" className={`text-xs py-0 h-5 px-1.5 capitalize ${item.dietType === 'veg' ? 'border-green-500/30 text-green-700 bg-green-50' : 'border-red-500/30 text-red-700 bg-red-50'}`}>
                              {item.dietType.replace('_', ' ')}
                            </Badge>
                            {item.isFestivalSpecial && (
                              <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs py-0 h-5 px-1.5">Special</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-auto">{item.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="about" className="space-y-8 outline-none focus-visible:ring-0">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-1 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Info className="w-5 h-5 text-primary" /> Vendor Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <span className="text-muted-foreground block mb-1">Description</span>
                      <p className="leading-relaxed">{vendor.description || "No description provided."}</p>
                    </div>
                    {vendor.address && (
                      <div>
                        <span className="text-muted-foreground block mb-1">Location</span>
                        <p>{vendor.address}, {vendor.city}</p>
                      </div>
                    )}
                    {vendor.fssaiLicense && (
                      <div>
                        <span className="text-muted-foreground block mb-1">FSSAI License</span>
                        <p className="font-mono text-xs bg-muted px-2 py-1 rounded inline-block">{vendor.fssaiLicense}</p>
                      </div>
                    )}
                    {vendor.deliveryZones && vendor.deliveryZones.length > 0 && (
                      <div>
                        <span className="text-muted-foreground block mb-2">Delivery Zones</span>
                        <div className="flex flex-wrap gap-1.5">
                          {vendor.deliveryZones.map(zone => (
                            <Badge key={zone} variant="secondary" className="font-normal">{zone}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="md:col-span-2 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-2xl font-serif font-bold flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-primary" /> Customer Reviews
                  </h3>
                </div>
                
                {reviewsLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="bg-card p-8 rounded-xl border text-center">
                    <p className="text-muted-foreground">No reviews yet for this kitchen.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map(review => (
                      <Card key={review.id} className="shadow-sm">
                        <CardContent className="p-5">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-medium">{review.customerName || "Anonymous"}</p>
                              <p className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex bg-yellow-50 px-2 py-1 rounded border border-yellow-100">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                              ))}
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-sm text-foreground/90">{review.comment}</p>
                          )}
                          {review.tags && review.tags.length > 0 && (
                            <div className="flex gap-2 mt-3">
                              {review.tags.map(tag => (
                                <Badge key={tag} variant="outline" className="text-[10px] py-0">{tag}</Badge>
                              ))}
                            </div>
                          )}
                          {review.vendorResponse && (
                            <div className="mt-4 bg-muted/50 p-3 rounded-lg border-l-2 border-primary text-sm">
                              <p className="font-medium text-xs text-muted-foreground mb-1">Vendor Reply:</p>
                              <p>{review.vendorResponse}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

