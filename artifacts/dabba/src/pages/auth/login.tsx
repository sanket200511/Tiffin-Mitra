import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { ChefHat } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-8 text-center bg-card p-10 rounded-2xl border shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <ChefHat className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-5xl font-serif font-bold text-primary mb-3 tracking-tight">Dabba</h1>
          <p className="text-muted-foreground text-lg mb-8">The warmth of ghar ka khana, delivered.</p>
          
          <Button size="lg" className="w-full h-12 text-base shadow-sm" onClick={login}>
            Sign in with Replit
          </Button>
        </div>
      </div>
    </div>
  );
}
