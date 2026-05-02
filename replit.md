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
- `vendors` — vendor profiles (name, city, cuisine, status, subscription_tier)
- `menu_items` — vendor menu items (meal_type, diet_type, price, calories)
- `subscription_plans` — plan definitions (daily/weekly/monthly/trial types)
- `customer_subscriptions` — active subscriptions with skip days support
- `orders` — individual delivery orders (status pipeline)
- `customers` — customer profiles (wallet, loyalty points)
- `wallet_transactions` — wallet credit/debit history
- `reviews` — vendor reviews with tags and vendor responses

## Backend Routes

All routes mounted at `/api`:
- `/healthz` — health check
- `/auth/*` — email/password auth routes
- `/vendors` — vendor CRUD
- `/vendors/:id/menus` — menu item CRUD
- `/vendors/:id/plans` — subscription plan CRUD
- `/vendors/:id/stats` — vendor stats
- `/subscriptions` — customer subscription management
- `/orders` — order listing and status updates
- `/customers/me` — customer profile
- `/customers/wallet` — wallet balance
- `/customers/upcoming-deliveries` — 7-day delivery calendar
- `/reviews` — review listing and creation
- `/analytics/*` — revenue trends, popular dishes, platform overview
- `/deliveries` — delivery tracking

## Frontend Pages

**Customer:**
- `/` — Landing page (hero, how it works, featured vendors)
- `/explore` — Browse/search vendors
- `/vendors/:vendorId` — Vendor detail with plans, menu, reviews
- `/subscribe/:planId` — Subscription form
- `/my-subscriptions` — Subscription dashboard with skip-a-day
- `/orders` — Order history
- `/profile` — Profile settings

**Vendor:**
- `/vendor/dashboard` — Stats, today's orders
- `/vendor/menu` — Menu management
- `/vendor/plans` — Plan management
- `/vendor/orders` — Order pipeline
- `/vendor/analytics` — Revenue/subscription charts
- `/vendor/profile` — Vendor profile editor

**Admin:**
- `/admin/overview` — Platform KPIs, pending approvals

**Auth:**
- `/login` — Email/password login + register (tabs)
- `/role-select` — Role selection after first registration

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

Warm saffron/amber palette (`--primary: 28 90% 50%`). Fraunces (serif display) + Outfit (sans) fonts. Recharts for data visualization. Framer Motion for animations. Dark mode supported.

## Seeded Demo Data

3 approved vendors:
- **Shrimati Tiffin** — North Indian, Mumbai (4.6★, 128 reviews)
- **Rasoi Express** — South Indian, Bengaluru (4.4★, 87 reviews)
- **Ghar Ki Daal** — Gujarati, Ahmedabad (4.8★, 203 reviews)

## Key Commands

```bash
pnpm --filter @workspace/db run push          # Run DB migrations
pnpm --filter @workspace/api-spec run codegen # Regenerate API hooks
pnpm run typecheck                             # Full typecheck
```
