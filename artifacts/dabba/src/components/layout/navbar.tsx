import { useAuth } from "@workspace/replit-auth-web";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { user, isAuthenticated, login, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-serif text-2xl font-bold text-primary">Dabba</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/explore" className="text-sm font-medium hover:text-primary transition-colors">
            Explore Menus
          </Link>
          {isAuthenticated ? (
            <>
              {user?.role === "customer" && (
                <>
                  <Link href="/my-subscriptions" className="text-sm font-medium hover:text-primary transition-colors">
                    Subscriptions
                  </Link>
                  <Link href="/orders" className="text-sm font-medium hover:text-primary transition-colors">
                    Orders
                  </Link>
                  <Link href="/profile" className="text-sm font-medium hover:text-primary transition-colors">
                    Profile
                  </Link>
                </>
              )}
              {user?.role === "vendor" && (
                <Link href="/vendor/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                  Dashboard
                </Link>
              )}
              {user?.role === "super_admin" && (
                <Link href="/admin/overview" className="text-sm font-medium hover:text-primary transition-colors">
                  Admin
                </Link>
              )}
              <Button variant="outline" size="sm" onClick={logout}>
                Log out
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={login}>
              Log in
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
