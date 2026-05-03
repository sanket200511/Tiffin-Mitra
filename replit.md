# Dabba — Tiffin Service Platform

**Tagline:** Ghar ka khana, aapke darwaaze tak.

A full-stack SaaS platform connecting Indian tiffin vendors, kitchen staff, and subscribers. Multi-role platform: Super Admin, Vendor, Customer, Delivery Agent.

**Platform-independent:** No Replit-specific dependencies. Runs on any Node.js 22+ host with PostgreSQL 14+.

## Architecture

pnpm monorepo with:
- `artifacts/dabba` — React + Vite frontend (port 25589, previewPath `/`)
- `artifacts/api-server` — Express 5 + Drizzle ORM backend (port 8080, path `/api`)
- `lib/db` — Drizzle ORM schema + PostgreSQL
- `lib/api-spec` — OpenAPI 3.1 spec (contract-first)
- `lib/api-client-react` — Orval-generated React Query hooks + Zod schemas
- `lib/api-zod` — Orval-generated Zod validation schemas
- `lib/replit-auth-web` — useAuth hook (custom email/password, no Replit dependency)

## Authentication

Custom email/password auth. No third-party auth provider required.

- `POST /api/auth/register` — create account (email, password, firstName?, lastName?)
- `POST /api/auth/login` — sign in with email + bcrypt password check
- `POST /api/auth/logout` — clear session
- `GET /api/auth/user` — return current user from session
- `PATCH /api/auth/role` — set user role (customer or vendor) after registration

Session stored in PostgreSQL `sessions` table via custom session management (`lib/auth.ts`).
Passwords hashed with `bcryptjs` (cost factor 12).

Role-based routing: `super_admin`, `vendor`, `customer`. If no role set after registration, user is shown the role selection page.

### useAuth hook

The `useAuth` hook from `@workspace/replit-auth-web` returns:
```ts
{ user, isLoading, isAuthenticated, login, logout, refetch }
```
- `login()` — navigates to `/login`
- `logout()` — calls `POST /api/auth/logout`, then navigates to `/`
- `refetch()` — re-fetches user from `/api/auth/user` (use after login/register/role change)

## Database Tables

- `sessions` — custom session store (sid, sess JSON, expire)
- `users` — accounts (email, password_hash, role, first_name, last_name)
- `vendors` — vendor profiles (name, city, cuisine, status, commission_rate, subscription_tier)
- `menu_items` — vendor menu items (meal_type, diet_type, price, calories)
- `subscription_plans` — plan definitions (daily/weekly/monthly/trial types)
- `customer_subscriptions` — active subscriptions with skip days support
- `orders` — individual delivery orders (status pipeline: pending→accepted→preparing→packed→picked_up→delivered)
- `customers` — customer profiles (wallet, loyalty points, GPS coordinates, referral_code, referred_by_code)
- `wallet_transactions` — wallet credit/debit history
- `referrals` — tracks completed referral pairs (referrer_id, referee_id, referrer_reward, referee_reward)
- `reviews` — vendor reviews with tags and vendor responses
- `peer_deliveries` — peer delivery requests and assignments
- `payout_requests` — vendor earnings withdrawal requests (UPI/bank)
- `notifications` — in-app notifications for all roles (userId, type, title, body, isRead)
- `vendor_holidays` — vendor holiday/closure dates that skip order generation
- `platform_settings` — admin-configurable key-value settings (commission rate, referral rewards, wallet limits)

## Backend Routes

All routes mounted at `/api`:
- `/healthz` — health check
- `/auth/*` — email/password auth routes
- `/vendors` — vendor CRUD, `?includeAll=true` for admin
- `/vendors/:id/status` — admin-only status change (approved/rejected/suspended)
- `/vendors/:id/menus` — menu item CRUD
- `/vendors/:id/plans` — subscription plan CRUD
- `/vendors/:id/stats` — vendor stats (4 parallel queries)
- `/subscriptions` — customer subscription management (create generates all delivery orders)
- `/orders` — order listing and status updates (refunds on cancel)
- `/customers/me` — customer profile (GET/PATCH)
- `/customers/wallet` — wallet balance and transactions
- `/customers/wallet/topup` — add funds (validates against platform_settings min/max)
- `/customers/:id/wallet-credit` — admin credit/debit
- `/customers/upcoming-deliveries` — 7-day delivery calendar
- `/customers/me/referral` — get referral code, stats, and referral history
- `/customers/me/referral/apply` — apply a referral code (rewards from platform_settings)
- `/customers` — admin-only: list all customers with subscription/order stats
- `/customers/:id` — admin-only: detailed customer profile with transactions
- `/reviews` — review listing and creation; PATCH `/:id/response` for vendor replies
- `/analytics/vendor/:id/revenue` — revenue trend (7d/30d/90d)
- `/analytics/vendor/:id/dishes` — popular dishes by order count
- `/analytics/vendor/:id/subscriptions/health` — subscription status breakdown
- `/analytics/platform/revenue` — platform GMV/commission trend (admin)
- `/analytics/platform/overview` — KPI summary (admin)
- `/deliveries` — delivery tracking
- `/peer-deliveries` — peer delivery CRUD (open/accept/advance/cancel)
- `/payouts` — vendor payout requests; admin status updates
- `/notifications` — list, mark-read, mark-all-read, delete notifications
- `/vendors/:id/holidays` — vendor holiday management (GET/POST/DELETE)
- `/vendors/:id/holidays/all` — all holidays for a vendor (for calendar view)
- `/admin/settings` — GET all platform settings; PATCH to update individual keys
- `/orders/today-summary/:vendorId` — today's order pipeline summary for sidebar badge

## Notification System

`artifacts/api-server/src/lib/notify.ts` exports two helpers:
- `notifyUser(userId, payload)` — insert one notification for a specific user
- `notifyAllAdmins(payload)` — insert notifications for every super_admin user

Notifications are triggered automatically:
- **Order status changes** → customer notified (accepted, preparing, packed, picked_up, delivered, cancelled)
- **New subscription** → vendor notified
- **Payout request** → all admins notified
- **Payout processed/rejected** → vendor notified
- **Vendor approved/rejected/suspended** → vendor notified

Frontend `NotificationBell` component shown in:
- Customer: navbar (desktop + mobile)
- Vendor: desktop sidebar header + mobile top bar
- Admin: desktop sidebar header + mobile top bar

Polls every 30 seconds. Popover shows last 50 notifications with per-item dismiss and "Mark all read".

## Frontend Pages

**Customer:**
- `/` — Dashboard (authenticated) or marketing landing (guests)
- `/explore` — Browse/search vendors (sort, diet/cuisine/city filters)
- `/vendors/:vendorId` — Vendor detail with plans, menu, reviews tabs
- `/subscribe/:vendorId/:planId` — Subscription checkout (wallet deduct + loyalty + bulk order creation)
- `/my-subscriptions` — Subscription dashboard with pause/cancel/skip-a-day
- `/orders` — Order history (upcoming tab + searchable history table)
- `/orders/:id/track` — Live order tracking (5 s poll, 6-stage pipeline)
- `/wallet` — Wallet balance, quick top-up, transaction history, referral section (`#referral`)
- `/profile` — Profile settings + GPS location detect + referral code
- `/peer-delivery` — Peer delivery board (post requests, carry & earn)
- `/how-it-works` — 7-step guide with FAQ
- `/about` — About page with team/values
- `/contact` — Contact form page
- `/privacy` — Privacy policy

**Vendor:**
- `/vendor/onboarding` — First-time vendor onboarding form
- `/vendor/dashboard` — Stats, today's orders quick-accept, setup checklist
- `/vendor/menu` — Menu management (CRUD via slide-out sheet)
- `/vendor/plans` — Subscription plan management (daily/weekly/monthly/trial)
- `/vendor/orders` — Order pipeline (date filter, bulk accept, status dropdown)
- `/vendor/delivery-sheet` — Printable daily delivery manifest grouped by slot
- `/vendor/schedule` — Holiday/closure calendar (blocks order generation)
- `/vendor/analytics` — Revenue/popular-dishes/subscription-health charts
- `/vendor/earnings` — Earnings overview, payout request dialog (UPI/bank)
- `/vendor/reviews` — Review management with vendor reply
- `/vendor/profile` — Vendor profile editor

**Admin:**
- `/admin/overview` — Platform KPIs, vendor approval/rejection, commission editor
- `/admin/vendors` — Full vendor table with status/commission filters
- `/admin/vendors/:id` — Vendor detail: stats, orders, reviews, payouts tabs
- `/admin/customers` — Customer table with wallet credit/debit
- `/admin/customers/:id` — Customer detail: subscriptions, orders, wallet transactions
- `/admin/subscriptions` — All subscriptions with status/search filters
- `/admin/orders` — All orders with date/status filters
- `/admin/payouts` — Payout request management with approve/reject dialogs
- `/admin/analytics` — Platform revenue/commission trend charts
- `/admin/settings` — Configurable platform settings (commission, referral rewards, wallet limits)

**Auth:**
- `/login` — Email/password login + register (tabs)
- `/role-select` — Role selection after first registration

## Layout Components

- `artifacts/dabba/src/components/layout/navbar.tsx` — customer navbar with notification bell
- `artifacts/dabba/src/components/layout/vendor-sidebar.tsx` — vendor sidebar with pending order badge + notification bell
- `artifacts/dabba/src/components/layout/admin-sidebar.tsx` — admin sidebar with notification bell
- `artifacts/dabba/src/components/layout/notification-bell.tsx` — shared notification popover

## Deployment

See `DEPLOY.md` for complete deployment instructions (Render, Railway, Fly.io, Docker).

### Required env vars
```
DATABASE_URL=postgresql://user:password@host:5432/dabba
PORT=8080
SESSION_SECRET=<long random string>
NODE_ENV=production
```

### Run DB migrations (first deploy and after schema changes)
```bash
pnpm --filter @workspace/db run push
```

## Styling

Warm saffron/amber palette (`--primary: 28 90% 50%`). Fraunces (serif display) + Outfit (sans) fonts. Recharts for data visualization. Dark mode supported.

## Seeded Demo Data

3 approved vendors:
- **Shrimati Tiffin** — North Indian, Mumbai (4.6★, 128 reviews)
- **Rasoi Express** — South Indian, Bengaluru (4.4★, 87 reviews)
- **Ghar Ki Daal** — Gujarati, Ahmedabad (4.8★, 203 reviews)

## Performance & Scalability

- **Rate limiting:** global 300 req/min per IP, auth 20/15 min, wallet 10/min (`express-rate-limit`)
- **React Query defaults:** `staleTime: 30s`, `gcTime: 5min`, `retry: 1`, `refetchOnWindowFocus: false`
- **Code splitting:** all pages are `React.lazy` + wrapped in a single `Suspense` boundary
- **HTTP caching:** `Cache-Control: public, max-age=30, stale-while-revalidate=120` on unfiltered vendor list
- **Notification polling:** 30s interval, stops when component unmounts
- **Notification failures are fire-and-forget:** never blocks the primary operation

## Key Commands

```bash
pnpm --filter @workspace/db run push          # Run DB migrations
pnpm --filter @workspace/api-spec run codegen # Regenerate API hooks
pnpm run typecheck                             # Full typecheck
```
