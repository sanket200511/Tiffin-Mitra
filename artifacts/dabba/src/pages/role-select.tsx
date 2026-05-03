import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, UserCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function RoleSelect() {
  const { refetch } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState<"customer" | "vendor" | null>(null);

  const handleSelectRole = async (role: "customer" | "vendor") => {
    setLoading(role);
    try {
      const res = await fetch("/api/auth/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        toast({ variant: "destructive", title: "Error", description: data.error || "Failed to set role" });
        return;
      }
      await refetch();
      if (role === "customer") setLocation("/");
      else setLocation("/vendor/onboarding");
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not connect to server" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground">Welcome to Dabba</h1>
          <p className="text-lg text-muted-foreground">How would you like to use the platform?</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card
            className="hover:border-primary/50 transition-colors cursor-pointer group"
            onClick={() => handleSelectRole("customer")}
            data-testid="card-role-customer"
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <UserCircle className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-serif">I want tiffin delivered</CardTitle>
              <CardDescription className="text-base">
                Browse local home chefs, subscribe to meal plans, and get fresh food delivered to your door.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button
                size="lg"
                className="w-full sm:w-auto"
                disabled={!!loading}
                data-testid="button-select-customer"
              >
                {loading === "customer" ? "Setting up..." : "Continue as Customer"}
              </Button>
            </CardContent>
          </Card>

          <Card
            className="hover:border-primary/50 transition-colors cursor-pointer group"
            onClick={() => handleSelectRole("vendor")}
            data-testid="card-role-vendor"
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Store className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-serif">I run a tiffin service</CardTitle>
              <CardDescription className="text-base">
                Set up your kitchen, manage your menu, track subscriptions, and grow your business.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto"
                disabled={!!loading}
                data-testid="button-select-vendor"
              >
                {loading === "vendor" ? "Setting up..." : "Set Up My Kitchen"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
