import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, ChefHat, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/layout/notification-bell";

export function Navbar() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const customerLinks = [
    { href: "/explore", label: "Explore Menus" },
    { href: "/peer-delivery", label: "Carry & Earn" },
    { href: "/my-subscriptions", label: "Subscriptions" },
    { href: "/orders", label: "Orders" },
    { href: "/wallet", label: "Wallet" },
    { href: "/profile", label: "Profile" },
  ];

  const publicLinks = [
    { href: "/explore", label: "Explore Menus" },
    { href: "/how-it-works", label: "How It Works" },
    { href: "/about", label: "About" },
  ];

  const links = isAuthenticated
    ? user?.role === "customer"
      ? customerLinks
      : user?.role === "vendor"
      ? [{ href: "/vendor/dashboard", label: "My Kitchen" }]
      : user?.role === "super_admin"
      ? [{ href: "/admin/overview", label: "Admin Panel" }]
      : publicLinks
    : publicLinks;

  const showNotificationBell = isAuthenticated && user?.role === "customer";

  const isRoot = location === "/";

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo + optional back button */}
        <div className="flex items-center gap-1 shrink-0">
          {!isRoot && (
            <Button
              variant="ghost"
              size="icon"
              className="mr-1 text-muted-foreground hover:text-foreground"
              onClick={() => window.history.back()}
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-serif text-2xl font-bold text-primary">Dabba</span>
          </Link>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors",
                location === link.href ? "text-primary" : "hover:text-primary"
              )}
            >
              {link.label}
            </Link>
          ))}
          {showNotificationBell && <NotificationBell />}
          {isAuthenticated ? (
            <Button variant="outline" size="sm" onClick={() => logout()} data-testid="button-logout">
              Log out
            </Button>
          ) : (
            <Button size="sm" onClick={login} data-testid="button-login">
              Log in
            </Button>
          )}
        </div>

        {/* Mobile: notification bell + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          {showNotificationBell && <NotificationBell />}
          {!isAuthenticated && (
            <Button size="sm" onClick={login} data-testid="button-login">
              Log in
            </Button>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0 flex flex-col">
              <div className="flex items-center justify-between p-5 border-b">
                <Link href="/" className="font-serif text-xl font-bold text-primary" onClick={() => setOpen(false)}>
                  Dabba
                </Link>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="flex-1 flex flex-col gap-1 p-4">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center px-3 py-3 rounded-md text-sm font-medium transition-colors",
                      location === link.href
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              {isAuthenticated && (
                <div className="p-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => { logout(); setOpen(false); }}
                    data-testid="button-logout"
                  >
                    Log out
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
