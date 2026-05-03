import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";
import NotFound from "@/pages/not-found";
import { Spinner } from "@/components/ui/spinner";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { VendorSidebar } from "@/components/layout/vendor-sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import RoleSelect from "@/pages/role-select";
import { Button } from "@/components/ui/button";

// Pages
import Home from "@/pages/customer/home";
import Explore from "@/pages/customer/explore";
import VendorDetail from "@/pages/customer/vendor-detail";
import Subscribe from "@/pages/customer/subscribe";
import MySubscriptions from "@/pages/customer/subscriptions";
import Orders from "@/pages/customer/orders";
import Profile from "@/pages/customer/profile";

import VendorOnboarding from "@/pages/vendor/onboarding";
import VendorDashboard from "@/pages/vendor/dashboard";
import VendorMenu from "@/pages/vendor/menu";
import VendorPlans from "@/pages/vendor/plans";
import VendorOrders from "@/pages/vendor/orders";
import VendorAnalytics from "@/pages/vendor/analytics";
import VendorProfile from "@/pages/vendor/profile";
import VendorReviews from "@/pages/vendor/reviews";
import VendorEarnings from "@/pages/vendor/earnings";

import AdminOverview from "@/pages/admin/overview";
import Login from "@/pages/auth/login";
import HowItWorks from "@/pages/how-it-works";
import About from "@/pages/about";
import Contact from "@/pages/contact";
import Privacy from "@/pages/privacy";

const queryClient = new QueryClient();

// Layout Wrappers
function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex">
      <VendorSidebar />
      <main className="flex-1 bg-muted/10 overflow-y-auto overflow-x-hidden pt-14 lg:pt-0">{children}</main>
    </div>
  );
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex">
      <AdminSidebar />
      <main className="flex-1 bg-muted/10 overflow-y-auto overflow-x-hidden pt-14 lg:pt-0">{children}</main>
    </div>
  );
}

function ProtectedRoute({ component: Component, allowedRole, layout: Layout }: { component: any, allowedRole?: string, layout?: any }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <div className="min-h-[100dvh] flex items-center justify-center"><Spinner className="w-8 h-8 text-primary" /></div>;
  
  if (!isAuthenticated) {
    return <Login />;
  }

  if (!user?.role) {
    return <RoleSelect />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <NotFound />;
  }

  const Page = <Component />;
  return Layout ? <Layout>{Page}</Layout> : Page;
}

function Router() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Spinner className="w-10 h-10 text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/role-select" component={RoleSelect} />
      
      {/* Customer Routes (Public + Protected Mix) */}
      <Route path="/">
        <CustomerLayout><Home /></CustomerLayout>
      </Route>
      <Route path="/explore">
        <CustomerLayout><Explore /></CustomerLayout>
      </Route>
      <Route path="/vendors/:vendorId">
        <CustomerLayout><VendorDetail /></CustomerLayout>
      </Route>
      <Route path="/subscribe/:vendorId/:planId">
        <ProtectedRoute component={Subscribe} allowedRole="customer" layout={CustomerLayout} />
      </Route>
      <Route path="/my-subscriptions">
        <ProtectedRoute component={MySubscriptions} allowedRole="customer" layout={CustomerLayout} />
      </Route>
      <Route path="/orders">
        <ProtectedRoute component={Orders} allowedRole="customer" layout={CustomerLayout} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={Profile} allowedRole="customer" layout={CustomerLayout} />
      </Route>

      {/* Vendor Onboarding (no sidebar) */}
      <Route path="/vendor/onboarding">
        <ProtectedRoute component={VendorOnboarding} allowedRole="vendor" />
      </Route>

      {/* Vendor Routes */}
      <Route path="/vendor/dashboard">
        <ProtectedRoute component={VendorDashboard} allowedRole="vendor" layout={VendorLayout} />
      </Route>
      <Route path="/vendor/menu">
        <ProtectedRoute component={VendorMenu} allowedRole="vendor" layout={VendorLayout} />
      </Route>
      <Route path="/vendor/plans">
        <ProtectedRoute component={VendorPlans} allowedRole="vendor" layout={VendorLayout} />
      </Route>
      <Route path="/vendor/orders">
        <ProtectedRoute component={VendorOrders} allowedRole="vendor" layout={VendorLayout} />
      </Route>
      <Route path="/vendor/analytics">
        <ProtectedRoute component={VendorAnalytics} allowedRole="vendor" layout={VendorLayout} />
      </Route>
      <Route path="/vendor/earnings">
        <ProtectedRoute component={VendorEarnings} allowedRole="vendor" layout={VendorLayout} />
      </Route>
      <Route path="/vendor/reviews">
        <ProtectedRoute component={VendorReviews} allowedRole="vendor" layout={VendorLayout} />
      </Route>
      <Route path="/vendor/profile">
        <ProtectedRoute component={VendorProfile} allowedRole="vendor" layout={VendorLayout} />
      </Route>

      {/* Static Pages */}
      <Route path="/how-it-works">
        <CustomerLayout><HowItWorks /></CustomerLayout>
      </Route>
      <Route path="/about">
        <CustomerLayout><About /></CustomerLayout>
      </Route>
      <Route path="/contact">
        <CustomerLayout><Contact /></CustomerLayout>
      </Route>
      <Route path="/privacy">
        <CustomerLayout><Privacy /></CustomerLayout>
      </Route>

      {/* Admin Routes */}
      <Route path="/admin/overview">
        <ProtectedRoute component={AdminOverview} allowedRole="super_admin" layout={AdminLayout} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
