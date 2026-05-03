import { Mail, MapPin, MessageSquare, Clock, ChefHat } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const channels = [
  {
    icon: Mail,
    title: "Email us",
    detail: "hello@dabba.in",
    sub: "We respond within 24 hours on weekdays",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp support",
    detail: "+91 98765 43210",
    sub: "Mon–Sat, 9 AM – 7 PM IST",
  },
  {
    icon: Clock,
    title: "Response time",
    detail: "Within 24 hrs",
    sub: "For all general enquiries",
  },
  {
    icon: ChefHat,
    title: "Vendor partnerships",
    detail: "vendors@dabba.in",
    sub: "For kitchen onboarding and partnership",
  },
];

export default function Contact() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast({ title: "Message received", description: "We'll get back to you within 24 hours." });
      setForm({ name: "", email: "", subject: "", message: "" });
    }, 800);
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-primary/5 py-20 md:py-24 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-1/3 h-full bg-primary/10 -skew-x-12 transform translate-x-20 rounded-l-[100px] hidden md:block" />
        <div className="container relative z-10 max-w-2xl">
          <p className="text-primary font-medium mb-3 tracking-wide uppercase text-sm">Get in touch</p>
          <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-4">
            We'd love to hear from you.
          </h1>
          <p className="text-lg text-muted-foreground">
            Whether you're a customer with a question, a chef wanting to join, or a journalist — we're happy to chat.
          </p>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact form */}
            <div>
              <h2 className="text-2xl font-serif font-bold mb-6">Send us a message</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your name</Label>
                    <Input
                      id="name"
                      placeholder="Priya Sharma"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="What's this about?"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us what's on your mind..."
                    className="min-h-[140px] resize-none"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={sending}>
                  {sending ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </div>

            {/* Contact details */}
            <div className="space-y-6">
              <h2 className="text-2xl font-serif font-bold mb-6">Other ways to reach us</h2>
              {channels.map((c, i) => {
                const Icon = c.icon;
                return (
                  <Card key={i} className="shadow-sm">
                    <CardContent className="flex items-start gap-4 p-5">
                      <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{c.title}</p>
                        <p className="text-foreground font-medium mt-0.5">{c.detail}</p>
                        <p className="text-muted-foreground text-xs mt-1">{c.sub}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              <div className="bg-muted/30 border rounded-xl p-5 mt-6">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm mb-1">Registered Office</p>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Dabba Technologies Pvt Ltd<br />
                      WeWork Bandra Kurla Complex<br />
                      Mumbai, Maharashtra 400051
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
