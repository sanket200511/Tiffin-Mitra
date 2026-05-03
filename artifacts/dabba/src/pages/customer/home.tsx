import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Star, Clock, ChefHat, CheckCircle2, CalendarDays, Bike, BookOpen, FileText, Package } from "lucide-react";
import { useListVendors } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: vendorsData, isLoading } = useListVendors();
  const vendors = vendorsData?.vendors || [];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-primary/5 py-20 md:py-32 overflow-hidden">
        {/* Decorative skewed panel */}
        <div className="absolute right-0 top-0 w-1/3 h-full bg-primary/10 -skew-x-12 transform rounded-l-[100px] hidden md:block" />

        <div className="container relative z-10">
          <div className="max-w-2xl space-y-6">
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-foreground leading-tight">
              The warmth of <span className="text-primary italic">ghar ka khana</span>, delivered.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Discover authentic home-cooked tiffins from your neighborhood's best chefs. Wholesome, hygienic, and full of love.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button asChild size="lg" className="h-12 px-8 text-base">
                <Link href="/explore">Explore Tiffins <ArrowRight className="ml-2 w-5 h-5" /></Link>
              </Button>
              <Button variant="outline" size="lg" className="h-12 px-8 text-base" asChild>
                <Link href="/role-select">Become a Partner</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Carry & Earn Feature Promotion */}
      <section className="py-14 border-y bg-gradient-to-r from-primary/5 via-background to-background">
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
                  <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-amber-600" /> Books & Notes</span>
                  <span className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-blue-600" /> Documents</span>
                  <span className="flex items-center gap-1.5"><Package className="w-4 h-4 text-gray-600" /> Parcels up to 5 kg</span>
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
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-serif font-bold">How Dabba Works</h2>
            <p className="text-muted-foreground">Simple, transparent, and built for your daily convenience.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
                <ChefHat className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold font-serif">1. Pick Your Chef</h3>
              <p className="text-muted-foreground">Browse rated home chefs in your area offering authentic regional cuisines.</p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
                <CalendarDays className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold font-serif">2. Choose a Plan</h3>
              <p className="text-muted-foreground">Subscribe to daily, weekly, or monthly tiffin plans. Pause or skip days easily.</p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold font-serif">3. Fresh Delivery</h3>
              <p className="text-muted-foreground">Get warm, freshly prepared food delivered to your home or office on time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Vendors */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="flex justify-between items-end mb-12">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-serif font-bold">Featured Kitchens</h2>
              <p className="text-muted-foreground">Highest rated tiffin services in your city</p>
            </div>
            <Button variant="ghost" asChild className="hidden sm:flex">
              <Link href="/explore">View All <ArrowRight className="ml-2 w-4 h-4" /></Link>
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="w-full h-48 rounded-xl" />
                  <Skeleton className="w-2/3 h-6" />
                  <Skeleton className="w-1/2 h-4" />
                </div>
              ))
            ) : vendors.slice(0, 3).map((vendor) => (
              <Link key={vendor.id} href={`/vendors/${vendor.id}`} className="group block">
                <div className="bg-card rounded-xl overflow-hidden border shadow-sm transition-all hover:shadow-md hover:border-primary/30">
                  <div className="h-48 bg-muted relative">
                    {vendor.coverImageUrl ? (
                      <img src={vendor.coverImageUrl} alt={vendor.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/20">
                        <ChefHat className="w-12 h-12" />
                      </div>
                    )}
                    {vendor.rating && (
                      <div className="absolute top-3 right-3 bg-background/90 backdrop-blur px-2 py-1 rounded-md text-sm font-medium flex items-center gap-1 shadow-sm">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        {vendor.rating}
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">{vendor.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{vendor.cuisineType} • {vendor.city}</p>
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

      {/* Trust Indicators */}
      <section className="py-20 bg-background">
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
              <div className="text-center space-y-6">
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
