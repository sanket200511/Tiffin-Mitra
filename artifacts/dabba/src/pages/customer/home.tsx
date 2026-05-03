import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowRight, Star, ChefHat, CheckCircle2, CalendarDays,
  Bike, BookOpen, FileText, Package, CreditCard,
  AlertTriangle, ShoppingBag, Clock, Gift,
} from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import {
  useListVendors,
  useGetWalletBalance,
  useListMySubscriptions,
  useListOrders,
  useGetMyCustomerProfile,
} from "@workspace/api-client-react";
import { format, differenceInDays, parseISO } from "date-fns";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const ORDER_STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  preparing: "bg-orange-100 text-orange-800",
  packed: "bg-purple-100 text-purple-800",
  picked_up: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  preparing: "Preparing",
  packed: "Packed",
  picked_up: "Picked Up",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function CustomerDashboard() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: profileData, isLoading: profileLoading } = useGetMyCustomerProfile();
  const customer = profileData?.customer;

  const { data: walletData, isLoading: walletLoading } = useGetWalletBalance();
  const balance = Number(walletData?.wallet?.balance ?? 0);
  const loyaltyPoints = walletData?.wallet?.loyaltyPoints ?? 0;

  const { data: subsData, isLoading: subsLoading } = useListMySubscriptions();
  const subscriptions = subsData?.subscriptions ?? [];
  const activeSubs = subscriptions.filter(s => s.status === "active");

  const { data: todayOrdersData, isLoading: ordersLoading } = useListOrders(
    { date: today },
    { query: { queryKey: ["/api/orders", "today-dashboard", today] } },
  );
  const todayOrders = todayOrdersData?.orders ?? [];
  const pendingOrders = todayOrders.filter(o => o.status !== "cancelled");
  const deliveredToday = todayOrders.filter(o => o.status === "delivered").length;

  const LOW_BALANCE = 200;
  const isLowBalance = !walletLoading && balance < LOW_BALANCE;

  const expiringSoon = subscriptions.filter(sub => {
    if (sub.status !== "active") return false;
    const daysLeft = differenceInDays(parseISO(sub.endDate), new Date());
    return daysLeft >= 0 && daysLeft <= 3;
  });

  const displayName = customer?.name || (user as any)?.name || "there";
  const firstName = displayName.split(" ")[0];

  return (
    <div className="container py-8 md:py-12 max-w-5xl space-y-8 min-h-[70vh]">

      {/* Greeting */}
      <div>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
        <h1 className="text-3xl md:text-4xl font-serif font-bold mt-1">
          {getGreeting()}, {firstName}
        </h1>
      </div>

      {/* Low balance warning */}
      {isLowBalance && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Your wallet balance is low:{" "}
              <strong>₹{balance.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong>.
              Top up to keep your tiffin deliveries running uninterrupted.
            </span>
            <Button
              size="sm"
              variant="outline"
              asChild
              className="shrink-0 border-amber-300 hover:bg-amber-100 text-amber-800"
            >
              <Link href="/wallet">Add Funds</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Expiring subscription warnings */}
      {expiringSoon.length > 0 && (
        <div className="space-y-2">
          {expiringSoon.map(sub => {
            const daysLeft = differenceInDays(parseISO(sub.endDate), new Date());
            return (
              <Alert key={sub.id} className="border-orange-200 bg-orange-50 text-orange-900">
                <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0" />
                <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                  <span>
                    <strong>{sub.planName || "Your subscription"}</strong> from{" "}
                    <strong>{sub.vendorName}</strong> expires{" "}
                    {daysLeft === 0 ? "today" : daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`}.
                    Renew to keep your daily tiffin coming.
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="shrink-0 border-orange-300 hover:bg-orange-100 text-orange-800"
                  >
                    <Link href={sub.vendorId && sub.planId ? `/subscribe/${sub.vendorId}/${sub.planId}` : "/explore"}>
                      Renew Now
                    </Link>
                  </Button>
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-4">

        {/* Wallet card */}
        <Card className="bg-primary text-primary-foreground border-none shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 w-28 h-28 bg-white/10 rounded-full translate-x-6 -translate-y-6 pointer-events-none" />
          <CardContent className="p-5 relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4 text-primary-foreground/80" />
              <span className="text-sm text-primary-foreground/80 font-medium">Wallet Balance</span>
            </div>
            {walletLoading ? (
              <Skeleton className="h-9 w-28 bg-white/20" />
            ) : (
              <div className="text-3xl font-bold font-serif">
                ₹{balance.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </div>
            )}
            {loyaltyPoints > 0 && (
              <p className="text-xs text-primary-foreground/70 mt-1">{loyaltyPoints} loyalty pts</p>
            )}
            <Link
              href="/wallet"
              className="mt-3 inline-flex items-center gap-1 text-xs text-primary-foreground/80 hover:text-primary-foreground transition-colors"
            >
              Manage wallet <ArrowRight className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Active subscriptions */}
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-medium">Active Plans</span>
            </div>
            {subsLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <div className="text-3xl font-bold font-serif">{activeSubs.length}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {subscriptions.length > 0
                ? `${subscriptions.length} total subscription${subscriptions.length !== 1 ? "s" : ""}`
                : "No subscriptions yet"}
            </p>
            <Link
              href="/my-subscriptions"
              className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Today's deliveries */}
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-medium">Today's Deliveries</span>
            </div>
            {ordersLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <div className="text-3xl font-bold font-serif">{pendingOrders.length}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {deliveredToday > 0
                ? `${deliveredToday} already delivered`
                : "scheduled for today"}
            </p>
            <Link
              href="/orders"
              className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all orders <ArrowRight className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Today's orders list */}
      {(ordersLoading || todayOrders.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-serif font-bold">Today's Deliveries</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/orders">
                All orders <ArrowRight className="ml-1 w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>

          <div className="space-y-3">
            {ordersLoading
              ? Array.from({ length: 2 }).map((_, i) => (
                  <Card key={i} className="shadow-sm">
                    <CardContent className="p-4">
                      <Skeleton className="h-12 w-full" />
                    </CardContent>
                  </Card>
                ))
              : todayOrders.slice(0, 5).map(order => (
                  <Card key={order.id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                        <ChefHat className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{order.vendorName || "Kitchen"}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.mealType
                            ? order.mealType.charAt(0).toUpperCase() + order.mealType.slice(1)
                            : "Tiffin"}{" "}
                          · ₹{Number(order.totalAmount).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge
                          className={`${ORDER_STATUS_BADGE[order.status] || "bg-gray-100 text-gray-800"} border-0 text-xs font-medium`}
                        >
                          {ORDER_STATUS_LABEL[order.status] || order.status}
                        </Badge>
                        {order.status !== "delivered" && order.status !== "cancelled" && (
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/orders/${order.id}/track`}>Track</Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
          </div>
        </div>
      )}

      {/* Active subscriptions list */}
      {(subsLoading || activeSubs.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-serif font-bold">Active Subscriptions</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/my-subscriptions">
                Manage <ArrowRight className="ml-1 w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {subsLoading
              ? Array.from({ length: 2 }).map((_, i) => (
                  <Card key={i} className="shadow-sm">
                    <CardContent className="p-4">
                      <Skeleton className="h-14 w-full" />
                    </CardContent>
                  </Card>
                ))
              : activeSubs.slice(0, 4).map(sub => (
                  <Card key={sub.id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                        <ChefHat className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{sub.vendorName || "Kitchen"}</p>
                        <p className="text-xs text-muted-foreground truncate">{sub.planName}</p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    </CardContent>
                  </Card>
                ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!subsLoading && !ordersLoading && activeSubs.length === 0 && todayOrders.length === 0 && (
        <Card className="shadow-sm border-dashed">
          <CardContent className="p-10 flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <ChefHat className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-serif font-semibold mb-1">Start your tiffin journey</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Discover home kitchens near you and subscribe to wholesome daily tiffins.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/explore">
                Explore Kitchens <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-xl font-serif font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {[
            { label: "Explore Kitchens", icon: ChefHat, href: "/explore", color: "text-primary bg-primary/10" },
            { label: "My Orders", icon: ShoppingBag, href: "/orders", color: "text-blue-600 bg-blue-50" },
            { label: "My Wallet", icon: CreditCard, href: "/wallet", color: "text-green-600 bg-green-50" },
            { label: "Refer & Earn", icon: Gift, href: "/wallet#referral", color: "text-amber-600 bg-amber-50" },
            { label: "Peer Delivery", icon: Bike, href: "/peer-delivery", color: "text-purple-600 bg-purple-50" },
          ].map(({ label, icon: Icon, href, color }) => (
            <Link key={href} href={href} className="block">
              <Card className="shadow-sm hover:shadow-md transition-all hover:border-primary/30 h-full cursor-pointer">
                <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium leading-tight">{label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Marketing home page (guests + non-customer roles) ────────────────────────

function MarketingHome() {
  const { data: vendorsData, isLoading } = useListVendors();
  const vendors = vendorsData?.vendors || [];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
      <section className="relative bg-primary/5 py-14 md:py-24 overflow-hidden">
        <div className="absolute right-0 top-0 w-1/3 h-full bg-primary/10 -skew-x-12 transform rounded-l-[100px] hidden md:block" />
        <div className="container relative z-10">
          <div className="max-w-2xl space-y-6">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold text-foreground leading-tight">
              The warmth of <span className="text-primary italic">ghar ka khana</span>, delivered.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Discover authentic home-cooked tiffins from your neighborhood's best chefs. Wholesome, hygienic, and full of love.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button asChild size="lg" className="h-12 px-8 text-base">
                <Link href="/explore">
                  Explore Tiffins <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="h-12 px-8 text-base" asChild>
                <Link href="/role-select">Become a Partner</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Carry & Earn */}
      <section className="py-10 border-y bg-gradient-to-r from-primary/5 via-background to-background">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className="bg-card rounded-2xl border shadow-sm p-7 md:p-10 flex flex-col md:flex-row gap-8 items-center">
              <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                <Bike className="w-10 h-10 text-primary" />
              </div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full mb-3">
                  New Feature
                </div>
                <h2 className="text-2xl md:text-3xl font-serif font-bold mb-2">
                  Carry &amp; Earn — Community Delivery
                </h2>
                <p className="text-muted-foreground mb-5 max-w-xl">
                  Need a textbook, document, or small package delivered nearby? Post a request
                  and someone already heading that way on their bike carries it for you —
                  a small earn for them, big convenience for you.
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-amber-600" /> Books &amp; Notes
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" /> Documents
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-gray-600" /> Parcels up to 5 kg
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href="/peer-delivery">
                      Send a Package <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/peer-delivery">Carry &amp; Earn</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 bg-background">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-4">
            <h2 className="text-3xl md:text-4xl font-serif font-bold">How Dabba Works</h2>
            <p className="text-muted-foreground">Simple, transparent, and built for your daily convenience.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { num: "1", icon: ChefHat, title: "Pick Your Chef", desc: "Browse rated home chefs in your area offering authentic regional cuisines." },
              { num: "2", icon: CalendarDays, title: "Choose a Plan", desc: "Subscribe to daily, weekly, or monthly tiffin plans. Pause or skip days easily." },
              { num: "3", icon: Clock, title: "Fresh Delivery", desc: "Get warm, freshly prepared food delivered to your home or office on time." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
                  <Icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold font-serif">{title}</h3>
                <p className="text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Vendors */}
      <section className="py-14 bg-muted/30">
        <div className="container">
          <div className="flex justify-between items-end mb-8">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-serif font-bold">Featured Kitchens</h2>
              <p className="text-muted-foreground">Highest rated tiffin services in your city</p>
            </div>
            <Button variant="ghost" asChild className="hidden sm:flex">
              <Link href="/explore">
                View All <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="w-full h-48 rounded-xl" />
                    <Skeleton className="w-2/3 h-6" />
                    <Skeleton className="w-1/2 h-4" />
                  </div>
                ))
              : [...vendors]
                  .filter(v => (v as any).status === "approved" || !(v as any).status)
                  .sort((a, b) => {
                    const aFeat = (a as any).featured ? 1 : 0;
                    const bFeat = (b as any).featured ? 1 : 0;
                    if (bFeat !== aFeat) return bFeat - aFeat;
                    return parseFloat(String(b.rating ?? 0)) - parseFloat(String(a.rating ?? 0));
                  })
                  .slice(0, 3)
                  .map(vendor => (
                  <Link key={vendor.id} href={`/vendors/${vendor.id}`} className="group block">
                    <div className="bg-card rounded-xl overflow-hidden border shadow-sm transition-all hover:shadow-md hover:border-primary/30">
                      <div className="h-48 bg-muted relative">
                        {vendor.coverImageUrl ? (
                          <img
                            src={vendor.coverImageUrl}
                            alt={vendor.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/20">
                            <ChefHat className="w-12 h-12" />
                          </div>
                        )}
                        {vendor.rating && (
                          <div className="absolute top-3 right-3 bg-background/90 backdrop-blur px-2 py-1 rounded-md text-sm font-medium flex items-center gap-1 shadow-sm">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            {parseFloat(String(vendor.rating)).toFixed(1)}
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                          {vendor.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {vendor.cuisineType} · {vendor.city}
                        </p>
                        <div className="flex items-center text-sm font-medium text-primary">
                          View Menu <ArrowRight className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
          </div>
          <Button variant="outline" className="w-full mt-8 sm:hidden" asChild>
            <Link href="/explore">View All Vendors</Link>
          </Button>
        </div>
      </section>

      {/* Trust / Why Dabba */}
      <section className="py-14 bg-background">
        <div className="container">
          <div className="bg-primary text-primary-foreground rounded-2xl p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-serif font-bold">Why choose Dabba?</h2>
                <ul className="space-y-4">
                  {[
                    "FSSAI registered home kitchens",
                    "No minimum order commitment required",
                    "Flexible pause and skip options",
                    "Hygiene and quality guaranteed",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5" />
                      <span className="text-lg">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-center">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-primary-foreground/10 rounded-xl p-6">
                    <div className="text-4xl font-bold font-serif mb-2">
                      {vendors.length > 0 ? `${vendors.length}+` : "—"}
                    </div>
                    <div className="text-primary-foreground/80 font-medium">Home Kitchens</div>
                  </div>
                  <div className="bg-primary-foreground/10 rounded-xl p-6">
                    <div className="text-4xl font-bold font-serif mb-2">Fresh</div>
                    <div className="text-primary-foreground/80 font-medium">Daily Deliveries</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  if (isAuthenticated && (user as any)?.role === "customer") {
    return <CustomerDashboard />;
  }

  return <MarketingHome />;
}
