import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t bg-card mt-auto">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <span className="font-serif text-2xl font-bold text-primary">Dabba</span>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Bringing the warmth of ghar ka khana to your doorstep. Trusted by thousands across the city.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-4">For Customers</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/explore" className="hover:text-primary transition-colors">Explore Tiffins</Link></li>
              <li><Link href="/explore?planType=trial" className="hover:text-primary transition-colors">Trial Plans</Link></li>
              <li><Link href="/how-it-works" className="hover:text-primary transition-colors">How it works</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-4">For Vendors</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/role-select" className="hover:text-primary transition-colors">Become a Partner</Link></li>
              <li><Link href="/login" className="hover:text-primary transition-colors">Vendor Login</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Dabba. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
