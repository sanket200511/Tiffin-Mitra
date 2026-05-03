import { Suspense, lazy } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";
import { Spinner } from "@/components/ui/spinner";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { VendorSidebar } from "@/components/layout/vendor-sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import RoleSelect from "@/pages/role-select";

// ─── Lazy-loaded pages ────────────────────────────────────────────────────────
// Each page chunk is fetched only when that route is first visited.

const Home             = lazy(() => import("@/pages/customer/home"));
const Explore          = lazy(() => import("@/pages/customer/explore"));
const VendorDetail     = lazy(() => import("@/pages/customer/vendor-detail"));
const Subscribe        = lazy(() => import("@/pages/customer/subscribe"));
const MySubscriptions  = lazy(() => import("@/pages/customer/subscriptions"));
const Orders           = lazy(() => import("@/pages/customer/orders"));
const OrderTrack       = lazy(() => import("@/pages/customer/order-track"));
const Profile          = lazy(() => import("@/pages/customer/profile"));
const CustomerWallet   = lazy(() => import("@/pages/customer/wallet"));
const PeerDelivery     = lazy(() => import("@/pages/peer-delivery/index"));

const VendorOnboarding = lazy(() => import("@/pages/vendor/onboarding"));
const VendorDashboard  = lazy(() => import("@/pages/vendor/dashboard"));
const VendorMenu       = lazy(() => import("@/pages/vendor/menu"));
const VendorPlans      = lazy(() => import("@/pages/vendor/plans"));
const VendorOrders     = lazy(() => import("@/pages/vendor/orders"));
const VendorAnalytics  = lazy(() => import("@/pages/vendor/analytics"));
const VendorProfile    = lazy(() => import("@/pages/vendor/profile"));
const VendorReviews    = lazy(() => import("@/pages/vendor/reviews"));
const VendorEarnings   = lazy(() => import("@/pages/vendor/earnings"));

const AdminOverview       = lazy(() => import("@/pages/admin/overview"));
const AdminVendors        = lazy(() => import("@/pages/admin/vendors"));
const AdminVendorDetail   = lazy(() => import("@/pages/admin/vendor-detail"));
const AdminCustomers      = lazy(() => import("@/pages/admin/customers"));
const AdminSubscriptions  = lazy(() => import("@/pages/admin/subscriptions"));
const AdminOrders         = lazy(() => import("@/pages/admin/orders"));
const AdminPayouts        = lazy(() => import("@/pages/admin/payouts"));
const AdminAnalytics      = lazy(() => import("@/pages/admin/analytics"));

const Login            = lazy(() => import("@/pages/auth/login"));
const HowItWorks       = lazy(() => import("@/pages/how-it-works"));
const About            = lazy(() => import("@/pages/about"));
const Contact          = lazy(() => import("@/pages/contact"));
const Privacy          = lazy(() => import("@/pages/privacy"));
const NotFound         = lazy(() => import("@/pages/not-found"));

// ─── Query client — global caching defaults ───────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,          // data is fresh for 30 s; no refetch within that window
      gcTime: 5 * 60_000,         // unused cache kept for 5 min
      retry: 1,                   // one retry on failure (not three)
      refetchOnWindowFocus: false, // don't refetch every time the user alt-tabs back
    },
  },
});

// ─── Page loader ──────────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background">
      <Spinner className="w-8 h-8 text-primary" />
    </div>
  );
}

// ─── Layout wrappers ──────────────────────────────────────────────────────────
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

// ─── Protected route ──────────────────────────────────────────────────────────
function ProtectedRoute({ component: Component, allowedRole, layout: Layout }: {
  component: React.ComponentType;
  allowedRole?: string;
  layout?: React.ComponentType<{ children: React.ReactNode }>;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Login />;
  if (!user?.role) return <RoleSelect />;
  if (allowedRole && user.role !== allowedRole) return <NotFound />;

  const Page = <Component />;
  return Layout ? <Layout>{Page}</Layout> : Page;
}

// ─── Router ───────────────────────────────────────────────────────────────────
function Router() {
  const { isLoading } = useAuth();

  if (isLoading) return <PageLoader />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/role-select" component={RoleSelect} />

        {/* Customer Routes */}
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
        <Route path="/orders/:orderId/track">
          <ProtectedRoute component={OrderTrack} allowedRole="customer" layout={CustomerLayout} />
        </Route>
        <Route path="/orders">
          <ProtectedRoute component={Orders} allowedRole="customer" layout={CustomerLayout} />
        </Route>
        <Route path="/wallet">
          <ProtectedRoute component={CustomerWallet} allowedRole="customer" layout={CustomerLayout} />
        </Route>
        <Route path="/profile">
          <ProtectedRoute component={Profile} allowedRole="customer" layout={CustomerLayout} />
        </Route>

        {/* Peer-to-Peer Delivery */}
        <Route path="/peer-delivery">
          <CustomerLayout><PeerDelivery /></CustomerLayout>
        </Route>

        {/* Vendor Onboarding */}
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
        <Route path="/admin/vendors/:vendorId">
          <ProtectedRoute component={AdminVendorDetail} allowedRole="super_admin" layout={AdminLayout} />
        </Route>
        <Route path="/admin/vendors">
          <ProtectedRoute component={AdminVendors} allowedRole="super_admin" layout={AdminLayout} />
        </Route>
        <Route path="/admin/customers">
          <ProtectedRoute component={AdminCustomers} allowedRole="super_admin" layout={AdminLayout} />
        </Route>
        <Route path="/admin/subscriptions">
          <ProtectedRoute component={AdminSubscriptions} allowedRole="super_admin" layout={AdminLayout} />
        </Route>
        <Route path="/admin/orders">
          <ProtectedRoute component={AdminOrders} allowedRole="super_admin" layout={AdminLayout} />
        </Route>
        <Route path="/admin/payouts">
          <ProtectedRoute component={AdminPayouts} allowedRole="super_admin" layout={AdminLayout} />
        </Route>
        <Route path="/admin/analytics">
          <ProtectedRoute component={AdminAnalytics} allowedRole="super_admin" layout={AdminLayout} />
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────
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
