# Dabba — Scalability Blueprint

Everything needed to take Dabba from a working prototype to a platform that handles
tens of thousands of vendors, hundreds of thousands of customers, and millions of
orders — with zero-cost techniques first and paid infrastructure introduced only
where the numbers justify it.

---

## 1. Database Layer

### 1.1 Indexes Already Applied
The following composite indexes are already live (migration applied):

| Table | Columns |
|---|---|
| `orders` | `customer_id`, `vendor_id`, `subscription_id`, `scheduled_date`, `status` |
| `customer_subscriptions` | `customer_id`, `vendor_id`, `status` |
| `subscription_plans` | `vendor_id` |

### 1.2 Missing Indexes to Add Next

```sql
-- Vendors: the most common public query is "approved vendors by city"
CREATE INDEX idx_vendors_city_status   ON vendors (city, status);
CREATE INDEX idx_vendors_featured      ON vendors (featured) WHERE featured = true;

-- Reviews: fetched by vendor frequently for rating display
CREATE INDEX idx_reviews_vendor_id     ON reviews (vendor_id);
CREATE INDEX idx_reviews_customer_id   ON reviews (customer_id);

-- Wallet transactions: customers load history chronologically
CREATE INDEX idx_wallet_txn_customer   ON wallet_transactions (customer_id, created_at DESC);

-- Orders: hottest query — vendor's orders for today
CREATE INDEX idx_orders_vendor_date    ON orders (vendor_id, scheduled_date, status);
CREATE INDEX idx_orders_customer_date  ON orders (customer_id, scheduled_date);
```

**How to apply:** add these to `lib/db/src/migrate.ts` or run directly via `pnpm --filter @workspace/db run push`.

### 1.3 Pagination — Add to Every List Endpoint

No list endpoint currently paginates. Every `GET /orders`, `GET /vendors`, etc. returns
unlimited rows. Add cursor-based pagination to every list route:

```ts
// Pattern for all list endpoints
const { cursor, limit = 50 } = req.query;
const safeLimit = Math.min(Number(limit), 100);

const rows = await db
  .select()
  .from(ordersTable)
  .where(cursor ? gt(ordersTable.id, cursor) : undefined)
  .orderBy(ordersTable.id)
  .limit(safeLimit + 1); // fetch one extra to compute hasMore

const hasMore = rows.length > safeLimit;
res.json({ orders: rows.slice(0, safeLimit), nextCursor: hasMore ? rows[safeLimit - 1].id : null });
```

### 1.4 Connection Pooling

The app currently opens a `pg` connection pool but with default settings. Configure
explicit limits before load grows:

```ts
// lib/db/src/index.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,            // max simultaneous connections
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});
```

For production at serious scale, put **PgBouncer** in front of Postgres. It is free,
open-source, and lets 1,000 app connections share 20 real DB connections.

### 1.5 Read Replicas

When writes and analytics reads compete, point read-heavy routes at a read replica:

```ts
// Separate pools
const primaryDb  = drizzle(primaryPool);
const replicaDb  = drizzle(replicaPool);  // read replica URL

// Analytics and list routes use replicaDb; mutations use primaryDb
```

Replit's managed Postgres does not include replicas on the free tier, but **Neon**,
**Supabase**, and **Railway** all offer free-tier read replicas.

### 1.6 Aggregate Tables for Analytics (Materialized)

The analytics routes currently compute GMV, commission, and order counts from raw
tables on every request. Add nightly aggregates:

```sql
CREATE TABLE daily_vendor_stats (
  vendor_id    TEXT        NOT NULL,
  date         DATE        NOT NULL,
  order_count  INT         NOT NULL DEFAULT 0,
  revenue      NUMERIC(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (vendor_id, date)
);
```

A lightweight cron job (or Postgres `pg_cron` extension, free on Neon) inserts one row
per vendor per day. Analytics queries then read this table instead of scanning all orders.

---

## 2. API Server

### 2.1 Rate Limiting

Add per-IP and per-user rate limiting. `express-rate-limit` is free and already in the
Node ecosystem:

```ts
import rateLimit from "express-rate-limit";

// Public endpoints (unauthenticated)
const publicLimiter = rateLimit({ windowMs: 60_000, max: 60 });
app.use("/api/vendors", publicLimiter);

// Auth endpoints (prevent brute force)
const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 20 });
app.use("/api/auth", authLimiter);
```

### 2.2 HTTP Caching Headers

Static or slow-changing data should carry `Cache-Control` headers so the browser
and any CDN never re-fetch them unnecessarily:

```ts
// Vendor list (changes rarely)
res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");

// Customer wallet (private, never cache)
res.set("Cache-Control", "no-store");
```

### 2.3 Response Compression

`compression` middleware is already installed and active. Confirm it wraps all routes
in `app.ts` before any JSON responses.

### 2.4 Horizontal Scaling

The API server is stateless (sessions stored in Postgres, not in-process memory).
That means you can run N copies behind a load balancer with zero code changes.
On Replit, a paid deployment auto-scales. On free hosting (Fly.io, Railway), set
`replicas = 2` in `fly.toml`.

### 2.5 Background Jobs for Slow Work

Anything that takes more than ~100 ms should not block the HTTP response. Candidates:

| Current blocking work | Move to background |
|---|---|
| `refreshVendorRating()` after review insert | Queue a job; respond 201 immediately |
| Order generation when subscription activates | Queue daily batch job at 00:00 |
| Wallet deduction for daily delivery | Cron at midnight, not on request |
| Email / push notification on status change | Fire-and-forget queue |

Zero-cost approach: **BullMQ** with an in-process worker and Redis (free tier on
Upstash). For no external dependency at all, a simple in-memory queue with `setImmediate`
works for low volume and is already sufficient for the current stage.

---

## 3. Frontend

### 3.1 Code Splitting

Vite already splits by route. Audit the bundle size. The API client bundle (`dist/index.mjs`)
is 2.6 MB unminified. Ensure:

- All page-level components use `React.lazy` + `Suspense`
- Heavy libraries (recharts, date-fns) are not imported at the top level of routes
  that don't use them

```ts
// In router
const AdminOverview = lazy(() => import("./pages/admin/overview"));
const VendorAnalytics = lazy(() => import("./pages/vendor/analytics"));
```

### 3.2 React Query Caching Strategy

Every query should declare an explicit `staleTime` so re-renders don't trigger
unnecessary network requests:

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,         // data fresh for 30 s
      gcTime:    5 * 60_000,     // cached for 5 min after unmount
      retry: 1,
    },
  },
});
```

Per-query overrides for data that changes frequently:

```ts
// Order status — stale after 10 s
useListOrders(..., { query: { staleTime: 10_000 } });

// Vendor list (rarely changes) — stale after 2 min
useListVendors(..., { query: { staleTime: 120_000 } });
```

### 3.3 Infinite Scroll / Virtual Lists

When order history or subscription lists grow to hundreds of rows, render only what is
visible using `@tanstack/react-virtual`:

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

const rowVirtualizer = useVirtualizer({
  count: orders.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 64,
});
```

This keeps the DOM small regardless of list length with zero server changes.

### 3.4 Image Optimisation

All vendor `coverImageUrl` and `logoUrl` values should:

1. Point to a CDN (Cloudflare R2 free tier, or Bunny.net free tier for images)
2. Use `loading="lazy"` on all `<img>` tags below the fold
3. Specify explicit `width` and `height` to avoid layout shift (CLS)

```tsx
<img
  src={vendor.coverImageUrl}
  alt={vendor.name}
  width={400}
  height={192}
  loading="lazy"
  decoding="async"
/>
```

### 3.5 Service Worker / Offline Shell

For Indian mobile users on 2G/3G, an offline shell dramatically improves perceived
performance. Vite's `vite-plugin-pwa` is free:

```ts
// vite.config.ts
import { VitePWA } from "vite-plugin-pwa";
plugins: [
  VitePWA({
    registerType: "autoUpdate",
    workbox: {
      globPatterns: ["**/*.{js,css,html,svg}"],
    },
  }),
]
```

---

## 4. Session & Auth

### 4.1 Session Store

Sessions are currently stored in Postgres via `connect-pg-simple`. This is fine. As
load grows, move sessions to **Redis** (Upstash free tier: 10,000 req/day) so the
primary database isn't hit on every authenticated request.

```ts
import connectRedis from "connect-redis";
const RedisStore = connectRedis(session);
app.use(session({ store: new RedisStore({ client: redisClient }), ... }));
```

### 4.2 JWT for Stateless API Access (Future)

If a mobile app is added later, replace cookie sessions with short-lived JWTs
(15 min) + long-lived refresh tokens stored in Postgres. This removes the session
store entirely and makes every API node truly stateless.

---

## 5. Real-Time (Order Tracking)

The customer `Track` button currently links to a static order detail page. Real-time
order tracking requires a push channel. Zero-cost options:

| Option | Free tier | Complexity |
|---|---|---|
| **Server-Sent Events (SSE)** | Unlimited (self-hosted) | Low — native Express |
| **Pusher** | 200k messages/day | Low — drop-in SDK |
| **Ably** | 6M messages/month | Low — drop-in SDK |
| **Socket.IO** | Unlimited (self-hosted) | Medium |

SSE is the recommended first step — no external dependency, works over a single
long-lived HTTP connection:

```ts
router.get("/orders/:orderId/track", (req, res) => {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  const interval = setInterval(() => {
    // poll DB every 5 s for status change
    db.select().from(ordersTable).where(eq(ordersTable.id, req.params.orderId))
      .then(([order]) => order && send({ status: order.status }));
  }, 5_000);
  req.on("close", () => clearInterval(interval));
});
```

---

## 6. Search

The current `GET /vendors?search=` does `ILIKE '%query%'` which is a full-table
scan. As the vendor count grows:

### Step 1 — Free: PostgreSQL Full-Text Search

```sql
-- Add a generated tsvector column
ALTER TABLE vendors ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name,'') || ' ' || coalesce(cuisine_type,'') || ' ' || coalesce(city,''))
  ) STORED;

CREATE INDEX idx_vendors_fts ON vendors USING GIN(search_vector);
```

```ts
// In vendors route
.where(sql`search_vector @@ plainto_tsquery('english', ${search})`)
```

This is dramatically faster than ILIKE and still 100% within Postgres with no new service.

### Step 2 — When Needed: Typesense (self-hosted, free)

Typesense is an open-source search engine that can be self-hosted for free. It
supports typo tolerance and instant-as-you-type results. Sync vendors to Typesense
after every approve/update, and let the frontend query it directly.

---

## 7. Observability

You cannot scale what you cannot see. Add these zero-cost tools:

### 7.1 Structured Logs (Already Done)

`pino` is already wired in. Add a log drain to **Better Stack Logtail** (free tier:
1 GB/month) or **Grafana Loki** (self-hosted).

### 7.2 Error Tracking

Add **Sentry** (free tier: 5,000 errors/month):

```ts
import * as Sentry from "@sentry/node";
Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### 7.3 Uptime Monitoring

**Better Uptime** (free), **UptimeRobot** (free for 50 monitors), or Cloudflare's
free health checks ping the `/api/healthz` endpoint every minute and alert via
email/Slack on downtime.

### 7.4 Database Query Analysis

Enable `pg_stat_statements` on your Postgres instance (available on Neon, Supabase,
and Railway for free). It surfaces the top-N slowest queries across all traffic —
the most direct guide to where to add indexes or rewrite queries.

---

## 8. Deployment Infrastructure (Free Tiers)

| Layer | Free option | Limits |
|---|---|---|
| **App hosting** | Replit Deployments, Fly.io, Railway | Fly: 3 shared VMs free |
| **Database** | Neon, Supabase, Railway Postgres | Neon: 0.5 GB + branching |
| **Redis** | Upstash | 10,000 req/day free |
| **Object storage** | Cloudflare R2 | 10 GB free, no egress fee |
| **CDN** | Cloudflare (free plan) | Unlimited bandwidth |
| **Search** | Typesense (self-hosted on Fly) | Free on shared VM |
| **Email** | Resend | 3,000 emails/month free |
| **Error tracking** | Sentry | 5,000 events/month free |
| **Uptime** | UptimeRobot | 50 monitors free |
| **Analytics** | Plausible (self-hosted) or Umami | Free self-hosted |

---

## 9. Code-Level Patterns Already Done / Still Needed

| Area | Status |
|---|---|
| JOIN queries instead of N+1 (orders, subscriptions, reviews) | Done |
| Batch queries for upcoming-deliveries | Done |
| SQL aggregates for admin customer list | Done |
| Date range pushed into SQL for analytics | Done |
| gzip compression middleware | Done |
| Search debounce on Explore page (300 ms) | Done |
| DB indexes (9 applied) | Done |
| Vendor plans visibility for owner | Done |
| Rate limiting (global 300/min, auth 20/15 min, wallet 10/min) | Done |
| React Query `staleTime` (30 s) + `gcTime` (5 min) + `retry: 1` | Done |
| `refetchOnWindowFocus: false` | Done |
| Code splitting with `React.lazy` + `Suspense` (all 22 pages) | Done |
| Image lazy loading + `decoding="async"` (explore, home, vendor-detail) | Done |
| Vendor stats: 4 parallel SQL aggregates (no more full table scan) | Done |
| Case-insensitive vendor search with `ilike` | Done |
| `Cache-Control` headers on public vendor list (30 s max-age) | Done |
| Pagination on list endpoints | **Missing** |
| PostgreSQL full-text search on vendors | **Missing** |
| SSE-based order tracking | **Missing** |
| Daily aggregate table for analytics | **Missing** |
| Background job queue for slow work | **Missing** |

---

## 10. Scaling Phases

### Phase 0 — Now (0–1,000 users)
Everything currently in the app is sufficient. Focus on correctness and UX.

### Phase 1 — Early Traction (1,000–10,000 users)
- Add the missing indexes listed in §1.2
- Add pagination to all list endpoints (§1.3)
- Set `staleTime` on React Query (§3.2)
- Add rate limiting (§2.1)
- Add Sentry + UptimeRobot (§7)
- Move sessions to Redis/Upstash (§4.1)
- Add `loading="lazy"` to all images (§3.4)

### Phase 2 — Growth (10,000–100,000 users)
- PostgreSQL full-text search (§6, Step 1)
- SSE real-time order tracking (§5)
- Daily analytics aggregates + `pg_cron` (§1.6)
- Move vendor images to Cloudflare R2 (§3.4)
- PgBouncer connection pooling (§1.4)
- Code splitting with `React.lazy` (§3.1)
- Service worker / PWA (§3.5)

### Phase 3 — Scale (100,000+ users)
- Postgres read replica for analytics (§1.5)
- Background job queue with BullMQ + Upstash Redis (§2.5)
- Typesense for search (§6, Step 2)
- JWT + refresh tokens for mobile (§4.2)
- Horizontal API scaling (§2.4)
- Virtual lists with `@tanstack/react-virtual` (§3.3)

---

*Last updated: May 2026. All techniques listed are either already implemented or
achievable within free-tier infrastructure limits.*
