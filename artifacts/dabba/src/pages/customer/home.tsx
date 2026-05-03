import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Clock, ChefHat, CheckCircle2, CalendarDays } from "lucide-react";
import { useListVendors } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import gsap from "gsap";

export default function Home() {
  const heroRef = useRef<HTMLElement>(null);
  const { data: vendorsData, isLoading } = useListVendors();
  const vendors = vendorsData?.vendors || [];

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".hero-badge", { y: 16, opacity: 0, duration: 0.6 })
        .from(".hero-title", { y: 48, opacity: 0, duration: 0.9 }, "-=0.35")
        .from(".hero-sub", { y: 28, opacity: 0, duration: 0.75 }, "-=0.55")
        .from(".hero-cta", { y: 20, opacity: 0, duration: 0.65 }, "-=0.45")
        .from(".hero-trust", { y: 14, opacity: 0, duration: 0.5 }, "-=0.3");

      gsap.to(".tiffin-main-g", {
        y: -20,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(".tiffin-lid-g", {
        y: -6,
        duration: 2.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: 0.4,
      });

      gsap.to(".tiffin-sm1-g", {
        y: -14,
        duration: 3.3,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: 0.8,
      });

      gsap.to(".tiffin-sm2-g", {
        y: -10,
        duration: 2.8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: 1.4,
      });

      [".steam-a", ".steam-b", ".steam-c"].forEach((sel, i) => {
        gsap.fromTo(
          sel,
          { y: 0, opacity: 0.55 },
          { y: -32, opacity: 0, duration: 2.2, repeat: -1, ease: "power1.out", delay: i * 0.72 }
        );
      });

      gsap.to(".mandala-g", {
        rotation: 360,
        duration: 90,
        repeat: -1,
        ease: "none",
        svgOrigin: "220 255",
      });

      gsap.utils.toArray<Element>(".hero-particle").forEach((el, i) => {
        gsap.fromTo(
          el,
          { y: 0, opacity: 0.45 },
          { y: -(22 + i * 7), opacity: 0, duration: 2.6 + i * 0.22, repeat: -1, ease: "power1.out", delay: i * 0.48 }
        );
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── HERO ── */}
      <section
        ref={heroRef}
        className="relative bg-background overflow-hidden flex items-center min-h-screen"
      >
        {/* Right panel tint */}
        <div className="absolute right-0 top-0 w-1/2 h-full bg-primary/[0.04] hidden md:block" />
        <div className="absolute right-0 top-0 h-full border-l border-primary/10 hidden md:block" />

        {/* Animated illustration — right half */}
        <div className="hero-illustration absolute right-0 top-0 w-1/2 h-full hidden md:flex items-center justify-center pointer-events-none">
          <svg
            viewBox="0 0 440 600"
            className="w-full h-full text-primary"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* ── MANDALA background ring ── */}
            <g className="mandala-g" fill="none" stroke="currentColor">
              <circle cx="220" cy="255" r="175" strokeWidth="0.7" opacity="0.12" strokeDasharray="3 11" />
              <circle cx="220" cy="255" r="148" strokeWidth="0.7" opacity="0.1" strokeDasharray="2 9" />
              <circle cx="220" cy="255" r="120" strokeWidth="0.6" opacity="0.09" />
              <circle cx="220" cy="255" r="93" strokeWidth="0.6" opacity="0.1" strokeDasharray="1.5 7" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
                const rad = (deg * Math.PI) / 180;
                return (
                  <line
                    key={i}
                    x1={220 + 93 * Math.cos(rad)}
                    y1={255 + 93 * Math.sin(rad)}
                    x2={220 + 175 * Math.cos(rad)}
                    y2={255 + 175 * Math.sin(rad)}
                    strokeWidth="0.6"
                    opacity="0.08"
                  />
                );
              })}
            </g>

            {/* ── MAIN TIFFIN ── */}
            <g className="tiffin-main-g" stroke="currentColor" fill="currentColor" strokeLinecap="round" strokeLinejoin="round" opacity="0.75">

              {/* Carrier rod — right side */}
              <line x1="306" y1="95" x2="306" y2="385" strokeWidth="2.8" fill="none" />

              {/* Carrying handle loop */}
              <path
                d="M 284 98 Q 284 74 306 70 Q 328 74 328 98"
                fill="none"
                strokeWidth="2.5"
              />

              {/* Knob / hook bead at very top */}
              <circle cx="306" cy="67" r="5" fillOpacity="0.12" strokeWidth="1.5" />

              {/* ── LID (animated separately) ── */}
              <g className="tiffin-lid-g">
                <rect x="145" y="102" width="158" height="24" rx="8" fillOpacity="0.1" strokeWidth="1.8" />
                <rect x="207" y="86" width="30" height="19" rx="7" fillOpacity="0.12" strokeWidth="1.6" />
                <circle cx="222" cy="83" r="4.5" fillOpacity="0.15" strokeWidth="1.4" />
                {/* Lid highlight line */}
                <path d="M 155 107 Q 195 103 245 106" fill="none" strokeWidth="0.8" opacity="0.25" />
              </g>

              {/* ── Ring clip 1 (between lid and tier 1) ── */}
              <path d="M 296 140 Q 306 135 316 140 L 316 148 Q 306 152 296 148 Z" fill="currentColor" fillOpacity="0.08" strokeWidth="1.2" />

              {/* ── TIER 1 ── */}
              <g>
                <rect x="145" y="126" width="158" height="90" rx="9" fillOpacity="0.09" strokeWidth="1.9" />
                {/* Top groove */}
                <line x1="145" y1="137" x2="303" y2="137" strokeWidth="1" opacity="0.35" />
                {/* Bottom groove */}
                <line x1="145" y1="207" x2="303" y2="207" strokeWidth="1" opacity="0.35" />
                {/* Subtle inner dashed rect (food compartment) */}
                <rect x="158" y="140" width="132" height="63" rx="5" fill="none" strokeWidth="0.8" strokeDasharray="2 5" opacity="0.35" />
                {/* Shine line */}
                <path d="M 155 132 Q 190 128 240 131" fill="none" strokeWidth="1.1" opacity="0.35" />
              </g>

              {/* ── Ring clip 2 ── */}
              <path d="M 296 222 Q 306 217 316 222 L 316 230 Q 306 234 296 230 Z" fill="currentColor" fillOpacity="0.08" strokeWidth="1.2" />

              {/* ── TIER 2 ── */}
              <g>
                <rect x="145" y="216" width="158" height="86" rx="9" fillOpacity="0.09" strokeWidth="1.9" />
                <line x1="145" y1="226" x2="303" y2="226" strokeWidth="1" opacity="0.35" />
                <line x1="145" y1="294" x2="303" y2="294" strokeWidth="1" opacity="0.35" />
                <rect x="158" y="229" width="132" height="60" rx="5" fill="none" strokeWidth="0.8" strokeDasharray="2 5" opacity="0.35" />
                <path d="M 155 222 Q 190 218 240 221" fill="none" strokeWidth="1.1" opacity="0.35" />
              </g>

              {/* ── Ring clip 3 ── */}
              <path d="M 296 305 Q 306 300 316 305 L 316 313 Q 306 317 296 313 Z" fill="currentColor" fillOpacity="0.08" strokeWidth="1.2" />

              {/* ── TIER 3 (base) ── */}
              <g>
                <rect x="145" y="302" width="158" height="86" rx="9" fillOpacity="0.09" strokeWidth="1.9" />
                <line x1="145" y1="312" x2="303" y2="312" strokeWidth="1" opacity="0.35" />
                <line x1="145" y1="380" x2="303" y2="380" strokeWidth="1" opacity="0.35" />
                <rect x="158" y="315" width="132" height="60" rx="5" fill="none" strokeWidth="0.8" strokeDasharray="2 5" opacity="0.35" />
                <path d="M 155 308 Q 190 304 240 307" fill="none" strokeWidth="1.1" opacity="0.35" />
              </g>

              {/* Base shadow ellipse */}
              <ellipse cx="224" cy="400" rx="76" ry="10" fill="currentColor" fillOpacity="0.07" stroke="none" />
            </g>

            {/* ── STEAM wisps above lid ── */}
            <g fill="none" strokeLinecap="round" stroke="currentColor" strokeWidth="2.2">
              <path className="steam-a" d="M 188 98 Q 182 80 188 62 Q 194 44 188 28" opacity="0.45" />
              <path className="steam-b" d="M 218 94 Q 212 76 218 58 Q 224 40 218 24" opacity="0.45" />
              <path className="steam-c" d="M 248 98 Q 254 80 248 62 Q 242 44 248 28" opacity="0.45" />
            </g>

            {/* ── SMALL TIFFIN 1 — top-right corner, faint ── */}
            <g className="tiffin-sm1-g" opacity="0.28" stroke="currentColor" fill="none" strokeWidth="1.1" strokeLinecap="round">
              <line x1="378" y1="68" x2="378" y2="210" />
              <path d="M 366 70 Q 366 58 378 56 Q 390 58 390 70" />
              <rect x="330" y="74" width="94" height="16" rx="5" />
              <rect x="330" y="90" width="94" height="52" rx="6" />
              <line x1="330" y1="130" x2="424" y2="130" strokeWidth="0.6" />
              <rect x="330" y="142" width="94" height="52" rx="6" />
              <ellipse cx="377" cy="202" rx="42" ry="6" fill="currentColor" fillOpacity="0.08" stroke="none" />
            </g>

            {/* ── SMALL TIFFIN 2 — bottom-left, very faint ── */}
            <g className="tiffin-sm2-g" opacity="0.2" stroke="currentColor" fill="none" strokeWidth="0.9" strokeLinecap="round">
              <line x1="66" y1="415" x2="66" y2="545" />
              <path d="M 55 417 Q 55 407 66 405 Q 77 407 77 417" />
              <rect x="22" y="421" width="90" height="14" rx="5" />
              <rect x="22" y="435" width="90" height="48" rx="6" />
              <line x1="22" y1="470" x2="112" y2="470" strokeWidth="0.5" />
              <rect x="22" y="483" width="90" height="48" rx="6" />
              <ellipse cx="67" cy="538" rx="40" ry="5" fill="currentColor" fillOpacity="0.06" stroke="none" />
            </g>

            {/* ── Floating particles (spice dots) ── */}
            <circle className="hero-particle" cx="108" cy="340" r="4.5" fill="currentColor" fillOpacity="0.22" stroke="none" />
            <circle className="hero-particle" cx="350" cy="430" r="3.5" fill="currentColor" fillOpacity="0.18" stroke="none" />
            <circle className="hero-particle" cx="82" cy="185" r="3" fill="currentColor" fillOpacity="0.16" stroke="none" />
            <circle className="hero-particle" cx="385" cy="210" r="2.5" fill="currentColor" fillOpacity="0.2" stroke="none" />
            <circle className="hero-particle" cx="138" cy="488" r="2" fill="currentColor" fillOpacity="0.25" stroke="none" />
            <circle className="hero-particle" cx="318" cy="502" r="3" fill="currentColor" fillOpacity="0.17" stroke="none" />

            {/* ── Leaf accents ── */}
            <g fill="currentColor" stroke="none" opacity="0.1">
              <path d="M 74 152 Q 56 124 82 110 Q 104 122 74 152 Z" />
              <line x1="74" y1="152" x2="82" y2="110" stroke="currentColor" strokeWidth="0.7" fill="none" opacity="0.5" />
              <path d="M 378 460 Q 398 432 372 418 Q 352 432 378 460 Z" />
              <line x1="378" y1="460" x2="372" y2="418" stroke="currentColor" strokeWidth="0.7" fill="none" opacity="0.5" />
            </g>
          </svg>
        </div>

        {/* ── HERO TEXT CONTENT ── */}
        <div className="container relative z-10">
          <div className="max-w-lg space-y-4 py-12">
            {/* Badge */}
            <div className="hero-badge inline-flex items-center gap-2.5 text-sm font-medium text-primary bg-primary/8 border border-primary/20 rounded-full px-4 py-1.5">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
              Home-cooked meals, delivered fresh
            </div>

            {/* Headline */}
            <h1 className="hero-title text-4xl md:text-5xl font-serif font-bold text-foreground leading-[1.12] tracking-tight">
              The warmth of{" "}
              <span className="text-primary italic">ghar ka khana</span>, delivered.
            </h1>

            {/* Sub */}
            <p className="hero-sub text-lg md:text-xl text-muted-foreground leading-relaxed">
              Discover authentic home-cooked tiffins from your neighbourhood's best home chefs — wholesome, hygienic, and full of love.
            </p>

            {/* CTA */}
            <div className="hero-cta flex flex-col sm:flex-row gap-3 pt-2">
              <Button asChild size="lg" className="h-12 px-8 text-base shadow-sm">
                <Link href="/explore">
                  Explore Tiffins <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="h-12 px-8 text-base" asChild>
                <Link href="/role-select">Become a Partner</Link>
              </Button>
            </div>

            {/* Trust strip */}
            <div className="hero-trust flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground pt-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                FSSAI registered kitchens
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                500+ home chefs
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                Pause anytime
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
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

      {/* ── FEATURED VENDORS ── */}
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
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="w-full h-48 rounded-xl" />
                    <Skeleton className="w-2/3 h-6" />
                    <Skeleton className="w-1/2 h-4" />
                  </div>
                ))
              : vendors.slice(0, 3).map((vendor) => (
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

      {/* ── WHY DABBA ── */}
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
