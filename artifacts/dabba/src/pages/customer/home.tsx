import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Clock, ChefHat, CheckCircle2, CalendarDays } from "lucide-react";
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
        <div className="absolute right-0 top-0 w-1/3 h-full bg-primary/10 -skew-x-12 transform translate-x-20 rounded-l-[100px] hidden md:block" />

        {/* Very faint tiffin watermark — background only */}
        <div className="absolute inset-0 flex items-center justify-end pr-4 md:pr-16 pointer-events-none select-none" aria-hidden="true">
          <svg
            viewBox="0 0 260 420"
            className="w-48 md:w-72 text-primary"
            style={{ opacity: 0.07 }}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Carrier rod */}
            <line x1="198" y1="55" x2="198" y2="368" strokeWidth="5" />
            {/* Handle loop */}
            <path d="M 178 58 Q 178 36 198 33 Q 218 36 218 58" strokeWidth="5" />
            {/* Handle knob */}
            <circle cx="198" cy="30" r="7" strokeWidth="4" />

            {/* Lid */}
            <rect x="54" y="64" width="140" height="30" rx="10" strokeWidth="4" />
            {/* Lid knob */}
            <rect x="112" y="48" width="28" height="20" rx="8" strokeWidth="3.5" />

            {/* Ring clip 1 */}
            <path d="M 188 108 Q 198 103 208 108 L 208 117 Q 198 122 188 117 Z" strokeWidth="3" fill="currentColor" />

            {/* Tier 1 */}
            <rect x="52" y="94" width="140" height="100" rx="11" strokeWidth="4" />
            <line x1="52" y1="108" x2="192" y2="108" strokeWidth="1.5" opacity="0.5" />
            <line x1="52" y1="186" x2="192" y2="186" strokeWidth="1.5" opacity="0.5" />

            {/* Ring clip 2 */}
            <path d="M 188 198 Q 198 193 208 198 L 208 207 Q 198 212 188 207 Z" strokeWidth="3" fill="currentColor" />

            {/* Tier 2 */}
            <rect x="52" y="190" width="140" height="96" rx="11" strokeWidth="4" />
            <line x1="52" y1="204" x2="192" y2="204" strokeWidth="1.5" opacity="0.5" />
            <line x1="52" y1="278" x2="192" y2="278" strokeWidth="1.5" opacity="0.5" />

            {/* Ring clip 3 */}
            <path d="M 188 286 Q 198 281 208 286 L 208 295 Q 198 300 188 295 Z" strokeWidth="3" fill="currentColor" />

            {/* Tier 3 */}
            <rect x="52" y="284" width="140" height="96" rx="11" strokeWidth="4" />
            <line x1="52" y1="298" x2="192" y2="298" strokeWidth="1.5" opacity="0.5" />
            <line x1="52" y1="372" x2="192" y2="372" strokeWidth="1.5" opacity="0.5" />

            {/* Base shadow */}
            <ellipse cx="122" cy="390" rx="64" ry="10" strokeWidth="3" />

            {/* Steam wisps */}
            <path d="M 98 60 Q 92 44 98 28 Q 104 12 98 0" strokeWidth="3" opacity="0.6" />
            <path d="M 122 56 Q 116 40 122 24 Q 128 8 122 -4" strokeWidth="3" opacity="0.6" />
            <path d="M 146 60 Q 152 44 146 28 Q 140 12 146 0" strokeWidth="3" opacity="0.6" />
          </svg>
        </div>

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
                    <div className="text-4xl font-bold font-serif mb-2">500+</div>
                    <div className="text-primary-foreground/80 font-medium">Home Chefs</div>
                  </div>
                  <div className="bg-primary-foreground/10 rounded-xl p-6">
                    <div className="text-4xl font-bold font-serif mb-2">10k+</div>
                    <div className="text-primary-foreground/80 font-medium">Happy Eaters</div>
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
