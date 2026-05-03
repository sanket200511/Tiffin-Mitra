import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChefHat, CalendarDays, Clock, Wallet, PauseCircle, Star, ArrowRight, CheckCircle2, Gift } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: ChefHat,
    title: "Browse Home Kitchens",
    description:
      "Explore FSSAI-registered home chefs near you. Filter by cuisine, diet type, city, or ratings. Every kitchen is verified before going live on Dabba.",
  },
  {
    number: "02",
    icon: CalendarDays,
    title: "Pick a Subscription Plan",
    description:
      "Choose a plan that fits your lifestyle — daily, weekday, weekly, or monthly. Many kitchens also offer 3-day and 7-day trial packs so you can try before you commit.",
  },
  {
    number: "03",
    icon: Wallet,
    title: "Top Up Your Dabba Wallet",
    description:
      "Add money to your Dabba Wallet once. Deliveries are auto-deducted each day — no need to pay per order. Leftover balance rolls over, never expires.",
  },
  {
    number: "04",
    icon: Clock,
    title: "Fresh Tiffin at Your Door",
    description:
      "Your chef prepares fresh food every morning. Deliveries arrive at your chosen slot — whether that's your home, PG, or office desk.",
  },
  {
    number: "05",
    icon: PauseCircle,
    title: "Pause, Skip, or Cancel Anytime",
    description:
      "Going out of town? Skip a day or pause your subscription entirely. No lock-ins, no penalties. You stay in full control of your tiffin.",
  },
  {
    number: "06",
    icon: Star,
    title: "Rate & Review",
    description:
      "After each week, leave a review for your chef. Your feedback helps maintain quality across the platform and helps other customers make great choices.",
  },
  {
    number: "07",
    icon: Gift,
    title: "Refer Friends & Earn",
    description:
      "Share your unique Dabba referral code with friends. When they join and subscribe, you earn ₹50 added instantly to your wallet — they get ₹25 as a welcome bonus.",
  },
];

const faqs = [
  {
    q: "Is there a minimum subscription period?",
    a: "No. You can start with a 3-day trial and decide from there. There are no minimums or lock-ins.",
  },
  {
    q: "What if I don't like the food?",
    a: "You can cancel any subscription after the current delivery cycle. Your wallet balance is always refundable.",
  },
  {
    q: "Are the kitchens verified?",
    a: "Yes. Every vendor on Dabba is FSSAI-registered and goes through a manual review before their listing goes live.",
  },
  {
    q: "Can I subscribe to multiple kitchens?",
    a: "Absolutely. Many customers subscribe to one kitchen for lunch and another for dinner.",
  },
  {
    q: "What areas do you serve?",
    a: "Dabba is expanding city by city. Check the Explore page to see kitchens active in your area.",
  },
  {
    q: "Is there a referral program?",
    a: "Yes! Every Dabba customer gets a unique referral code. Share it with a friend — when they join and make their first subscription, you earn ₹50 in your wallet and they get ₹25 as a welcome bonus. Find your code under Wallet → Refer & Earn.",
  },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen">
      <Helmet>
        <title>How It Works — Dabba</title>
        <meta name="description" content="Subscribe to fresh home-cooked tiffins in 3 simple steps. Browse kitchens, choose a plan, and get ghar ka khana delivered daily — no lock-ins." />
        <meta property="og:title" content="How It Works — Dabba" />
        <meta property="og:description" content="Subscribe to fresh home-cooked tiffins in 3 simple steps. Browse kitchens, choose a plan, and get ghar ka khana delivered daily — no lock-ins." />
      </Helmet>
      {/* Hero */}
      <section className="bg-primary/5 py-20 md:py-28 overflow-hidden relative">
        <div className="absolute right-0 top-0 w-1/3 h-full bg-primary/10 -skew-x-12 transform translate-x-20 rounded-l-[100px] hidden md:block" />
        <div className="container relative z-10 max-w-3xl">
          <p className="text-primary font-medium mb-3 tracking-wide uppercase text-sm">How it works</p>
          <h1 className="text-4xl md:text-6xl font-serif font-bold leading-tight mb-6">
            Ghar ka khana, delivered in seven simple steps.
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Dabba connects you to home kitchens that cook the way your mother did — with real ingredients, real care, and no shortcuts.
          </p>
          <Button asChild size="lg">
            <Link href="/explore">Start Exploring <ArrowRight className="ml-2 w-5 h-5" /></Link>
          </Button>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 bg-background">
        <div className="container max-w-4xl">
          <div className="space-y-16">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex gap-8 items-start">
                  <div className="shrink-0 flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="w-7 h-7" />
                    </div>
                    {i < steps.length - 1 && (
                      <div className="w-px h-12 bg-border" />
                    )}
                  </div>
                  <div className="pt-2">
                    <span className="text-xs font-bold tracking-widest text-primary/50 uppercase">{step.number}</span>
                    <h3 className="text-2xl font-serif font-bold mt-1 mb-3">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed text-base max-w-xl">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Dabba */}
      <section className="py-20 bg-muted/30">
        <div className="container max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-12">Why Dabba is different</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              "Home-style cooking, not restaurant mass production",
              "Flexible plans — no weekly minimums",
              "Wallet-based auto-deduction, no daily payment friction",
              "Transparent chef profiles with real ratings",
              "Skip or pause with one tap, no call needed",
              "Only FSSAI-licensed kitchens on the platform",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-card border rounded-xl p-4 shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-background">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-serif font-bold text-center mb-12">Common questions</h2>
          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="border rounded-xl p-6 bg-card shadow-sm">
                <h3 className="font-semibold text-base mb-2">{faq.q}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container max-w-2xl text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-serif font-bold">Ready for your first tiffin?</h2>
          <p className="text-primary-foreground/80 text-lg">
            No commitment needed. Start with a trial plan and taste the difference.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/explore">Explore Kitchens</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
              <Link href="/role-select">Become a Vendor</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
