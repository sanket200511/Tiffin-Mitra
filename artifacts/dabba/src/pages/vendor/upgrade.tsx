import { Link } from "wouter";
import { useGetMyVendorProfile } from "@workspace/api-client-react";
import { TierBadge } from "@/components/ui/tier-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Check, X, Crown, Layers3, Zap, Mail, ArrowLeft, Lock,
  BarChart3, UtensilsCrossed, CalendarDays, Headphones, Users, TrendingUp,
} from "lucide-react";
import { useFeatures } from "@/lib/features";

type PlanFeature = {
  label: string;
  basic: boolean | string;
  pro: boolean | string;
  enterprise: boolean | string;
  icon: React.ElementType;
};

const FEATURES_TABLE: PlanFeature[] = [
  { label: "Subscription plans",      basic: "Up to 3",       pro: "Unlimited",     enterprise: "Unlimited",     icon: CalendarDays },
  { label: "Menu items",              basic: "Up to 20",       pro: "Unlimited",     enterprise: "Unlimited",     icon: UtensilsCrossed },
  { label: "Basic analytics",         basic: true,             pro: true,            enterprise: true,            icon: BarChart3 },
  { label: "Advanced analytics",      basic: false,            pro: true,            enterprise: true,            icon: TrendingUp },
  { label: "Customer reviews",        basic: true,             pro: true,            enterprise: true,            icon: Users },
  { label: "Commission rate",         basic: "Platform rate",  pro: "Reduced rate",  enterprise: "Negotiated",    icon: TrendingUp },
  { label: "Priority support",        basic: false,            pro: true,            enterprise: true,            icon: Headphones },
  { label: "Featured listing",        basic: false,            pro: true,            enterprise: true,            icon: Crown },
  { label: "Dedicated account manager", basic: false,          pro: false,           enterprise: true,            icon: Users },
];

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="w-4 h-4 text-green-600 mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />;
  return <span className="text-xs font-medium text-center block">{value}</span>;
}

const getPlans = (features: any) => [
  {
    tier: "basic" as const,
    label: "Basic",
    icon: Zap,
    price: "Free",
    priceNote: "Always free",
    description: "Everything you need to get started on Dabba.",
    color: "text-slate-600",
    bg: "bg-slate-50 border-slate-200",
    cta: "Your current plan",
    ctaDisabled: true,
  },
  {
    tier: "pro" as const,
    label: "Pro",
    icon: Crown,
    price: features.VENDOR_PRO_TIERS ? "Contact us" : "Coming Soon",
    priceNote: features.VENDOR_PRO_TIERS ? "per month" : "Currently free for all",
    description: "Unlock unlimited plans, advanced analytics and a featured listing.",
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    cta: features.VENDOR_PRO_TIERS ? "Upgrade to Pro" : "Join Waitlist",
    ctaDisabled: false,
    highlight: true,
  },
  {
    tier: "enterprise" as const,
    label: "Enterprise",
    icon: Layers3,
    price: "Custom",
    priceNote: "tailored pricing",
    description: "For large kitchen operations with custom needs.",
    color: "text-violet-600",
    bg: "bg-violet-50 border-violet-200",
    cta: "Contact Us",
    ctaDisabled: false,
  },
];

export default function VendorUpgrade() {
  const { data: profileData, isLoading } = useGetMyVendorProfile();
  const features = useFeatures();
  const PLANS = getPlans(features);
  
  const vendor = profileData?.vendor;
  const currentTier = vendor?.subscriptionTier ?? "basic";

  const supportEmail = "support@dabba.in";
  const mailtoSubject = encodeURIComponent("Dabba Pro Plan Inquiry");
  const mailtoBody = (tier: string) =>
    encodeURIComponent(
      `Hi Dabba team,\n\nI'm interested in upgrading my kitchen "${vendor?.name ?? ""}" to the ${tier} plan.\n\nPlease reach out with more details.\n\nThanks`,
    );

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Back */}
      <Link href="/vendor/plans" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Plans
      </Link>

      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        {isLoading ? (
          <Skeleton className="h-6 w-32 mx-auto" />
        ) : (
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">Current plan:</span>
            <TierBadge tier={currentTier} />
          </div>
        )}
        <h1 className="text-3xl font-serif font-bold text-foreground">
          Grow your kitchen with Dabba Pro
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Unlock unlimited subscription plans, advanced analytics, and a featured
          listing so more customers discover your kitchen.
          {!features.VENDOR_PRO_TIERS && (
            <span className="block mt-2 text-primary font-medium">
              Pro features are currently free for all kitchens while we are in early access.
            </span>
          )}
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-5">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = plan.tier === currentTier;
          return (
            <Card
              key={plan.tier}
              className={`relative flex flex-col ${plan.highlight ? "ring-2 ring-amber-400 shadow-lg" : "shadow-sm"}`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-amber-500 text-white text-xs px-3 shadow">Most Popular</Badge>
                </div>
              )}
              <CardHeader className={`rounded-t-lg border-b ${plan.bg}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${plan.bg} border mb-2`}>
                  <Icon className={`w-5 h-5 ${plan.color}`} />
                </div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {plan.label}
                  {isCurrent && <Badge variant="outline" className="text-xs">Current</Badge>}
                </CardTitle>
                <CardDescription className="text-sm">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-5 flex-1">
                <div className="mb-5">
                  <span className="text-2xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground ml-2">{plan.priceNote}</span>
                </div>
                <ul className="space-y-2">
                  {FEATURES_TABLE.slice(0, 5).map((f) => {
                    const val = f[plan.tier];
                    return (
                      <li key={f.label} className="flex items-center gap-2 text-sm">
                        {val === true ? (
                          <Check className="w-4 h-4 text-green-600 shrink-0" />
                        ) : val === false ? (
                          <Lock className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                        ) : (
                          <Check className="w-4 h-4 text-green-600 shrink-0" />
                        )}
                        <span className={val === false ? "text-muted-foreground/60" : ""}>
                          {val === true ? f.label : val === false ? f.label : `${f.label}: ${val}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
              <CardFooter className="pt-4 border-t">
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    {plan.cta}
                  </Button>
                ) : (
                  <a
                    href={`mailto:${supportEmail}?subject=${mailtoSubject}&body=${mailtoBody(plan.label)}`}
                    className="w-full"
                  >
                    <Button
                      className={`w-full ${plan.highlight ? "" : "variant-outline"}`}
                      variant={plan.highlight ? "default" : "outline"}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      {plan.cta}
                    </Button>
                  </a>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Full feature comparison */}
      <Card className="shadow-sm overflow-x-auto">
        <CardHeader>
          <CardTitle className="text-base">Full Feature Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="border-b">
                <th className="text-left pb-3 font-medium text-muted-foreground w-1/2">Feature</th>
                <th className="text-center pb-3 font-medium">Basic</th>
                <th className="text-center pb-3 font-medium text-amber-700">Pro</th>
                <th className="text-center pb-3 font-medium text-violet-700">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {FEATURES_TABLE.map((f) => {
                const FIcon = f.icon;
                return (
                  <tr key={f.label} className="hover:bg-muted/30">
                    <td className="py-3 flex items-center gap-2 text-foreground">
                      <FIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      {f.label}
                    </td>
                    <td className="py-3 text-center"><FeatureCell value={f.basic} /></td>
                    <td className="py-3 text-center"><FeatureCell value={f.pro} /></td>
                    <td className="py-3 text-center"><FeatureCell value={f.enterprise} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Contact CTA */}
      <div className="text-center py-8 bg-muted/30 rounded-xl border border-dashed space-y-3">
        <h3 className="text-lg font-serif font-semibold">Questions about upgrading?</h3>
        <p className="text-muted-foreground text-sm">
          Our team will help you find the right plan for your kitchen.
        </p>
        <a href={`mailto:${supportEmail}`}>
          <Button variant="outline" className="gap-2">
            <Mail className="w-4 h-4" />
            Email Us
          </Button>
        </a>
      </div>
    </div>
  );
}
