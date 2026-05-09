import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Mail, CheckCircle2, ArrowLeft, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const verifySchema = z.object({
  code: z.string().length(6, "Code must be exactly 6 digits"),
});

type VerifyForm = z.infer<typeof verifySchema>;

export default function Verify() {
  const { refetch } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  
  // Get email from URL query or local storage if needed
  const [email, setEmail] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setEmail(emailParam);
    } else {
      // If no email, go back to login
      setLocation("/login");
    }
  }, [setLocation]);

  const form = useForm<VerifyForm>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: "" },
  });

  async function onVerify(values: VerifyForm) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code: values.code }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", title: "Verification failed", description: data.error || "Invalid code" });
        return;
      }
      toast({ title: "Email verified!", description: "Welcome to Dabba." });
      await refetch();
      setLocation("/role-select");
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not connect to server" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onResend() {
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        toast({ title: "Code resent", description: "Please check your inbox." });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to resend code" });
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-muted/30 px-4 py-4 overflow-y-auto">
      <div className="w-full max-w-md">
        <div className="bg-card border rounded-2xl shadow-xl p-6">
          <div className="text-center mb-6">
            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <Mail className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-primary mb-1">Verify your email</h1>
            <p className="text-sm text-muted-foreground">
              We've sent a 6-digit verification code to <br />
              <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onVerify)} className="space-y-6">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="000000"
                        className="text-center text-2xl tracking-[0.5em] font-bold h-14"
                        maxLength={6}
                      />
                    </FormControl>
                    <FormMessage className="text-center" />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full h-11 text-base" disabled={isSubmitting}>
                {isSubmitting ? "Verifying..." : "Verify Account"}
              </Button>
            </form>
          </Form>

          <div className="mt-8 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={onResend}
              disabled={resending}
              className="text-sm font-medium text-primary hover:underline flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
              Resend verification code
            </button>
            
            <button
              type="button"
              onClick={() => setLocation("/login")}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
