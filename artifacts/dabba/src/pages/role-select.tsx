import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, UserCircle } from "lucide-react";

export default function RoleSelect() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const handleSelectRole = (role: 'customer' | 'vendor') => {
    // We mock assigning the role here. In a real app, this would call an API to update the user.
    // For now we'll simulate redirection based on choice.
    if (role === 'customer') {
      setLocation('/');
    } else {
      setLocation('/vendor/dashboard');
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground">Welcome to Dabba</h1>
          <p className="text-lg text-muted-foreground">How would you like to use the platform today?</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => handleSelectRole('customer')}>
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
              <Button size="lg" className="w-full sm:w-auto">Continue as Customer</Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => handleSelectRole('vendor')}>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Store className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-serif">I run a tiffin service</CardTitle>
              <CardDescription className="text-base">
                Manage your menu, track subscriptions, view analytics, and grow your business.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                Continue as Partner
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
