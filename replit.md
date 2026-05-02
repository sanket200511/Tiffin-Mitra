# Dabba — Tiffin Service Platform

**Tagline:** Ghar ka khana, aapke darwaaze tak.

A full-stack SaaS platform connecting Indian tiffin vendors, kitchen staff, and subscribers. Multi-role platform: Super Admin, Vendor, Customer, Delivery Agent.

## Architecture

pnpm monorepo with:
- `artifacts/dabba` — React + Vite frontend (port 25589, previewPath `/`)
- `artifacts/api-server` — Express 5 + Drizzle ORM backend (port 8080, path `/api`)
- `lib/db` — Drizzle ORM schema + PostgreSQL
- `lib/api-spec` — OpenAPI 3.1 spec (contract-first)
- `lib/api-client-react` — Orval-generated React Query hooks + Zod schemas
- `lib/api-zod` — Orval-generated Zod validation schemas
- `lib/replit-auth-web` — useAuth hook for Replit Auth

## Authentication

Replit Auth (OpenID Connect). The `useAuth` hook from `@workspace/replit-auth-web` handles login/logout. Auth middleware in `artifacts/api-server/src/middlewares/authMiddleware.ts`.

Role-based routing: `super_admin`, `vendor`, `customer`. If no role assigned after login, user is shown role selection page.

## Database Tables

- `sessions` — express-session store
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
- `/auth/*` — Replit Auth OIDC routes
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
- `/login` — Branded sign-in page
- `/role-select` — Role selection after first login

## Styling

Warm saffron/amber palette (`--primary: 28 90% 50%`). Fraunces (serif display) + Outfit (sans) fonts. Recharts for data visualization. Framer Motion for animations. Dark mode supported.

## Seeded Demo Data

3 approved vendors:
- **Shrimati Tiffin** — North Indian, Mumbai (4.6★, 128 reviews)
- **Rasoi Express** — South Indian, Bengaluru (4.4★, 87 reviews)
- **Ghar Ki Daal** — Gujarati, Ahmedabad (4.8★, 203 reviews)

Each with menu items, subscription plans, and sample reviews.

## Key Commands

```bash
pnpm --filter @workspace/db run push          # Run DB migrations
pnpm --filter @workspace/api-spec run codegen # Regenerate API hooks
pnpm run typecheck                             # Full typecheck
```
