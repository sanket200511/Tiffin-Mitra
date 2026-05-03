import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { useGetMyVendorProfile, useGetTodayOrderSummary } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  UtensilsCrossed,
  CalendarDays,
  ShoppingBag,
  BarChart3,
  Store,
  LogOut,
  Menu,
  Star,
  IndianRupee,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/vendor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendor/orders",    label: "Orders",    icon: ShoppingBag },
  { href: "/vendor/menu",      label: "Menu",      icon: UtensilsCrossed },
  { href: "/vendor/plans",     label: "Plans",     icon: CalendarDays },
  { href: "/vendor/earnings",  label: "Earnings",  icon: IndianRupee },
  { href: "/vendor/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/vendor/reviews",   label: "Reviews",   icon: Star },
  { href: "/vendor/profile",   label: "Profile",   icon: Store },
];

// ─── Live pending order count for the sidebar badge ───────────────────────────
function usePendingOrderCount() {
  const { data: profileData } = useGetMyVendorProfile();
  const vendorId = profileData?.vendor?.id;

  const { data } = useGetTodayOrderSummary(
    vendorId ? { vendorId } : undefined,
    {
      query: {
        queryKey: ["/api/orders/today-summary/sidebar", vendorId],
        enabled: !!vendorId,
        refetchInterval: 30_000,
        staleTime: 20_000,
      },
    },
  );
  return (data?.summary?.pendingCount ?? 0) as number;
}

// ─── Sidebar navigation ───────────────────────────────────────────────────────
function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const pendingCount = usePendingOrderCount();

  return (
    <>
      <div className="p-6 shrink-0">
        <Link href="/" className="font-serif text-2xl font-bold text-primary flex items-center gap-2" onClick={onNavigate}>
          Dabba
          <span className="text-sm font-sans text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Partner</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href;
          const isOrdersLink = item.href === "/vendor/orders";
          const showBadge = isOrdersLink && pendingCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
              {showBadge && (
                <span className="ml-auto min-w-[20px] h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold px-1 tabular-nums">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t shrink-0">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={logout}>
          <LogOut className="h-4 w-4 mr-2" />
          Log out
        </Button>
      </div>
    </>
  );
}

// ─── Sidebar shell ────────────────────────────────────────────────────────────
export function VendorSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 border-r bg-card flex-col h-full min-h-screen sticky top-0 shrink-0">
        <SidebarNav />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-4 bg-card border-b">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => window.history.back()}
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Link href="/" className="font-serif text-xl font-bold text-primary flex items-center gap-1.5">
            Dabba
            <span className="text-xs font-sans text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">Partner</span>
          </Link>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
