import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Heart, Users, ChefHat, ArrowRight, Leaf, Shield } from "lucide-react";
import { useListVendors } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

const values = [
  {
    icon: Heart,
    title: "Food is love",
    description:
      "We believe the best food comes from people who cook with intention — not factories. Every kitchen on Dabba is someone's passion project.",
  },
  {
    icon: Users,
    title: "Community first",
    description:
      "Dabba is a marketplace, not a restaurant. We exist to empower local home chefs and connect them with people who appreciate real home cooking.",
  },
  {
    icon: Leaf,
    title: "Fresh, always",
    description:
      "No reheated meals, no two-day-old food. Our kitchens cook fresh every day, for every delivery. That's a non-negotiable standard on Dabba.",
  },
  {
    icon: Shield,
    title: "Trust is earned",
    description:
      "Every vendor is manually reviewed and FSSAI-verified before going live. We'd rather have fewer, better kitchens than hundreds of mediocre ones.",
  },
];

const team = [
  { name: "Priya Sharma", role: "Co-founder & CEO", city: "Mumbai" },
  { name: "Arjun Mehta", role: "Co-founder & CTO", city: "Bengaluru" },
  { name: "Sunita Rao", role: "Head of Operations", city: "Pune" },
];

export default function About() {
  const { data: vendorsData, isLoading: vendorsLoading } = useListVendors();
  const vendorCount = vendorsData?.vendors?.length ?? 0;

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>About Us — Dabba</title>
        <meta name="description" content="Dabba is a tiffin subscription platform connecting home cooks with people who love ghar ka khana. Learn our story and mission." />
        <meta property="og:title" content="About Us — Dabba" />
        <meta property="og:description" content="Dabba is a tiffin subscription platform connecting home cooks with people who love ghar ka khana. Learn our story and mission." />
      </Helmet>
      {/* Hero */}
      <section className="bg-primary/5 py-16 md:py-24 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-1/3 h-full bg-primary/10 -skew-x-12 transform translate-x-20 rounded-l-[100px] hidden md:block" />
        <div className="container relative z-10 max-w-3xl">
          <p className="text-primary font-medium mb-3 tracking-wide uppercase text-sm">Our story</p>
          <h1 className="text-4xl md:text-6xl font-serif font-bold leading-tight mb-6">
            We built Dabba because nobody should eat bad food every day.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Dabba started with a simple observation: millions of working professionals in Indian cities eat outside every single day — and most of that food is either unhealthy, overpriced, or both. Meanwhile, thousands of home cooks were making far better food and had no platform to reach them.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-14 bg-background">
        <div className="container max-w-4xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">The mission</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Dabba's mission is to make home-cooked food accessible to every working professional in India — at a price that's fair, from a kitchen that cares.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                We do this by building a platform that makes it effortless for home chefs to run a subscription-based tiffin service, and equally effortless for customers to discover, subscribe, and manage their daily meals.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We're starting in metro cities and expanding to Tier-2 India — because great home cooking doesn't only happen in Mumbai.
              </p>
            </div>
            <div className="bg-primary/5 rounded-2xl p-8 space-y-6 border border-primary/10">
              <div>
                {vendorsLoading ? (
                  <Skeleton className="h-14 w-24 mb-2" />
                ) : (
                  <div className="text-5xl font-bold font-serif text-primary mb-2">
                    {vendorCount > 0 ? `${vendorCount}` : "Growing"}
                  </div>
                )}
                <div className="text-muted-foreground font-medium">Home kitchens live on the platform</div>
              </div>
              <div>
                <div className="text-5xl font-bold font-serif text-primary mb-2">Daily</div>
                <div className="text-muted-foreground font-medium">Fresh tiffins cooked and delivered</div>
              </div>
              <div>
                <div className="text-5xl font-bold font-serif text-primary mb-2">Zero</div>
                <div className="text-muted-foreground font-medium">Reheated meals — ever</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-14 bg-muted/30">
        <div className="container max-w-4xl">
          <h2 className="text-3xl font-serif font-bold text-center mb-12">What we believe in</h2>
          <div className="grid sm:grid-cols-2 gap-8">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <div key={i} className="bg-card border rounded-2xl p-6 shadow-sm">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 font-serif">{v.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{v.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* For vendors */}
      <section className="py-14 bg-background">
        <div className="container max-w-4xl">
          <div className="bg-primary text-primary-foreground rounded-2xl p-8 md:p-12 flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 space-y-4">
              <div className="w-14 h-14 bg-primary-foreground/10 rounded-xl flex items-center justify-center">
                <ChefHat className="w-7 h-7" />
              </div>
              <h2 className="text-3xl font-serif font-bold">Do you cook for a living?</h2>
              <p className="text-primary-foreground/80 leading-relaxed">
                Join Dabba as a vendor. Set your own menu, prices, and delivery zones. We handle payments, subscriptions, and customer management. You just cook.
              </p>
            </div>
            <div className="shrink-0">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/role-select">
                  Become a Partner <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
