# Dabba — Completion Prompt

This document describes everything remaining to take Dabba from its current
"production-ready MVP" state to a fully commercial, revenue-generating platform.
Paste any section below into an AI agent as a standalone task.

---

## Current State (what is already built)

- Full-stack pnpm monorepo: Express 5 + Drizzle ORM + PostgreSQL, React + Vite
- Multi-role auth (Replit Auth): Super Admin, Vendor, Customer
- 39 pages, 16 API route files, all TypeScript-clean
- Vendor management: onboarding, menu, plans, schedule, earnings, analytics,
  reviews, delivery sheet, holidays
- Customer flows: explore kitchens, subscribe, wallet, loyalty points, orders,
  order tracking, peer delivery marketplace
- Admin panel: vendor approval, tier management, commission editing, payouts,
  subscriptions, orders, analytics, platform settings
- Feature flags system (`src/lib/features.ts`) — flip one constant to enable
  any monetization feature without code changes
- Vendor tier infrastructure (basic / pro / enterprise) in DB + UI
- Rate limiting, helmet, compression, CORS, pino logging on API
- Error boundary on the frontend

---

## Task 1 — Real Authentication (replace Replit Auth)

**Context:** The app currently uses `@workspace/replit-auth-web` which ties
users to Replit accounts. For production you need your own auth so any user
can sign up with email/phone.

**Stack recommendation:** Clerk (hosted, generous free tier, supports OTP,
Google, phone login out of the box)

**What to do:**

```
Replace Replit Auth with Clerk authentication across the entire Dabba monorepo.

Backend (artifacts/api-server):
- Install @clerk/express
- Replace authMiddleware.ts: instead of reading the Replit session cookie,
  verify the Clerk JWT from the Authorization header using clerkClient.
- Keep the same AuthUser shape: { id, email, firstName, lastName,
  profileImageUrl, role }
- Store the user's role in Clerk's publicMetadata.role field
- On first login (no role set), redirect to /role-select
- After role is chosen, PATCH /api/auth/role to write it back to Clerk metadata

Frontend (artifacts/dabba):
- Install @clerk/react
- Wrap App in <ClerkProvider publishableKey={VITE_CLERK_PUBLISHABLE_KEY}>
- Replace all useAuth() from @workspace/replit-auth-web with Clerk's
  useUser() / useAuth() / useClerk()
- Replace the Login page with <SignIn routing="path" path="/login" />
- The existing ProtectedRoute component checks user.role — keep that logic,
  just source it from Clerk's publicMetadata instead

Environment variables needed:
  CLERK_SECRET_KEY          (server)
  VITE_CLERK_PUBLISHABLE_KEY (frontend — prefix with VITE_)

Keep the existing session table in the DB for audit logs but stop using it
for auth decisions.
```

---

## Task 2 — Razorpay Payment Gateway

**Context:** The wallet top-up flow currently shows a UI but has no payment
step (admin credits wallets manually). The feature flag
`FEATURES.PAYMENT_GATEWAY` in `src/lib/features.ts` is already wired — set
it to `true` once this task is done.

**What to do:**

```
Integrate Razorpay into Dabba for wallet top-ups.

Backend (artifacts/api-server):
- Install razorpay npm package
- Create src/routes/payments.ts with these endpoints:
  POST /api/payments/create-order
    Body: { amount: number }  (in rupees)
    Validates: amount >= min_wallet_topup from platform_settings
    Creates Razorpay order: razorpay.orders.create({ amount: amount*100, currency: "INR", receipt })
    Returns: { orderId, amount, currency, key: RAZORPAY_KEY_ID }

  POST /api/payments/verify
    Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
    Verifies HMAC signature using RAZORPAY_KEY_SECRET
    On success: credits the customer's wallet via the existing wallet logic
                (same as admin top-up — insert walletTransactionsTable row,
                 update customer.walletBalance)
    Returns: { success: true, newBalance }

- Add payments router to src/routes/index.ts
- Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET as environment secrets

Frontend (artifacts/dabba/src/pages/customer/wallet.tsx):
- In the top-up dialog, after the user enters an amount and clicks "Pay":
  1. Call POST /api/payments/create-order → get { orderId, amount, key }
  2. Load Razorpay checkout script (add <script src="https://checkout.razorpay.com/v1/checkout.js"> to index.html)
  3. Open Razorpay modal: new window.Razorpay({ key, amount, currency, order_id, handler })
  4. In the handler callback: call POST /api/payments/verify with the three
     razorpay_* fields
  5. On success: invalidate the wallet balance query and show a toast

Feature flag:
- In src/lib/features.ts change PAYMENT_GATEWAY: false → true
- In admin settings, set feature_payment_gateway_enabled = "true"
```

---

## Task 3 — Vendor Pro Tier Billing

**Context:** Vendor tiers (basic/pro/enterprise) are in the DB. The feature
flag `FEATURES.VENDOR_PRO_TIERS` is false. The upgrade page at `/vendor/upgrade`
is built and shows pricing. When billing is ready, flip the flag.

**What to do:**

```
Implement vendor subscription billing using Razorpay Subscriptions.

Backend:
- POST /api/vendor-billing/create-subscription
    Creates a Razorpay subscription for the vendor's chosen tier
    (plan IDs configured as env vars RAZORPAY_PRO_PLAN_ID, RAZORPAY_ENT_PLAN_ID)
    Returns checkout link or subscription ID

- POST /api/vendor-billing/webhook  (Razorpay webhook)
    On subscription.activated event:
      PATCH vendor.subscriptionTier = "pro" or "enterprise"
    On subscription.halted / subscription.cancelled:
      PATCH vendor.subscriptionTier = "basic"

- GET /api/vendor-billing/status  (returns current subscription status for the vendor)

Frontend (artifacts/dabba/src/pages/vendor/upgrade.tsx):
- The page is already built. Replace the mailto CTA with:
  1. Call POST /api/vendor-billing/create-subscription
  2. Redirect vendor to Razorpay hosted page, or open checkout modal
- Add a "Manage subscription" button for pro/enterprise vendors that links to
  the Razorpay customer portal

Enforcement:
- In POST /api/vendors/:vendorId/plans, check the vendor's tier against
  the max_plans_{tier} platform setting before allowing plan creation
- Return HTTP 403 with a clear error message if limit is reached
- In src/lib/features.ts: set VENDOR_PRO_TIERS: true
```

---

## Task 4 — OTP / Phone-based Login (if not using Clerk)

```
Add phone OTP login using MSG91 or Twilio Verify.

Backend:
- POST /api/auth/otp/send   — send OTP to phone number
- POST /api/auth/otp/verify — verify OTP, create session, return user

Frontend:
- New Login page with phone input + OTP input step
- Replace the current Replit Auth login button
```

---

## Task 5 — Push Notifications (FCM)

**Context:** The notifications table and notifyUser() helper are built.
Notifications currently appear only in the in-app bell. Add browser push
and WhatsApp.

```
Add browser push notifications using Firebase Cloud Messaging (FCM).

Backend:
- POST /api/notifications/register-device  (save FCM token to a devices table)
- Extend notifyUser() to also call firebase-admin messaging.send() for each
  saved FCM token for that user

Frontend:
- On login, call Notification.requestPermission()
- If granted, get FCM token via getToken(messaging, { vapidKey })
- POST /api/notifications/register-device with the token
- Add Firebase service worker (firebase-messaging-sw.js) to public/

WhatsApp (optional, higher engagement):
- Use Twilio WhatsApp API or WATI
- Call from notifyUser() in addition to the in-app notification
- Useful for: order dispatched, subscription expiry reminder, payout processed
```

---

## Task 6 — SMS Order Notifications (Vendor)

```
Send SMS to vendor when a new order is created.

Use MSG91 / Fast2SMS / Twilio.

In the POST /api/subscriptions route (order creation loop):
  After inserting orders, call the SMS API:
  "New order from {customerName} — {plan} on {date}. Check your dashboard."

Environment variable: SMS_API_KEY
```

---

## Task 7 — Image Uploads (Cloudinary / S3)

**Context:** vendor logo and cover image URLs are stored in the DB but
currently the vendor pastes a URL manually.

```
Add image upload for vendor logo and cover image.

Backend:
- POST /api/uploads/vendor-image
    Accepts multipart/form-data with a single image file
    Validates: max 5 MB, image/* MIME type
    Uploads to Cloudinary using cloudinary.uploader.upload()
    Returns: { url }

Frontend (artifacts/dabba/src/pages/vendor/profile.tsx):
- Replace the URL input with a file picker + preview
- On file select: POST /api/uploads/vendor-image → get URL
- Auto-fill the logoUrl / coverImageUrl field with the returned URL

Environment variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,
CLOUDINARY_API_SECRET
```

---

## Task 8 — Customer Referral System (wire up)

**Context:** The DB has referral code fields on the customers table. The
platform settings have referral rewards configured. The feature flag
`FEATURES.REFERRAL_PROGRAM` is true.

```
Wire up the referral program end-to-end.

Backend:
- Generate a unique referralCode for each new customer on creation
  (6 uppercase alphanumeric, e.g. "DABBA-X7K2")
- POST /api/referrals/apply  (authenticated, customer only)
    Body: { referralCode }
    Validates: code is valid, not own code, not already used referral
    Credits referee wallet by referral_referee_reward (from platform_settings)
    Credits referrer wallet by referral_referrer_reward
    Inserts walletTransactions for both

Frontend:
- In customer profile page: show "Your referral code: DABBA-X7K2" + copy button
- Add a referral code input field on the subscription checkout page
  (or a dedicated /referral page)
```

---

## Task 9 — Subscription Auto-Renewal & Expiry Cron

```
Add a daily cron job to handle subscription lifecycle.

Backend — create scripts/src/subscription-cron.ts:
  Run daily at 6 AM IST (use node-cron or a Replit Deployments scheduled job).
  For each subscription where endDate < today and status = "active":
    Set status = "expired"
    notifyUser(customerId, "Your subscription has expired. Renew to continue.")

  For each subscription where endDate = today + 3 days (reminder):
    notifyUser(customerId, "Your subscription expires in 3 days.")

Add to package.json scripts:
  "cron": "tsx src/subscription-cron.ts"

Deploy as a separate Replit Scheduled Deployment that runs every 24 hours.
```

---

## Task 10 — SEO & Landing Page Polish

```
Improve SEO for the public customer-facing pages.

- Add <title> and <meta description> tags to each page using react-helmet-async
- Add JSON-LD structured data for vendor pages (LocalBusiness schema)
- Add a sitemap.xml endpoint at /sitemap.xml (GET /api/sitemap.xml)
  listing all approved vendor URLs + static pages
- Add robots.txt in public/
- Compress all images with vite-plugin-imagemin
- Add og:image meta tags for social sharing
```

---

## Task 11 — Admin Analytics Hardening

```
The admin analytics page (src/pages/admin/analytics.tsx) currently shows
charts powered by the /api/analytics routes. Add:

- City-wise revenue breakdown (bar chart)
- Top 10 vendors by GMV this month (table)
- Churn rate: subscriptions cancelled in last 30 days / total active
- New vendor registrations vs approvals (funnel chart)
- Export all analytics as CSV
```

---

## Task 12 — Production Deploy Checklist

```
Before going live, verify these are set:

Environment secrets (set in Replit Secrets or your host's dashboard):
  DATABASE_URL          — Production PostgreSQL connection string
  SESSION_SECRET        — 64+ character random string
  CLERK_SECRET_KEY      — From Clerk dashboard
  VITE_CLERK_PUBLISHABLE_KEY
  RAZORPAY_KEY_ID
  RAZORPAY_KEY_SECRET
  CLOUDINARY_CLOUD_NAME
  CLOUDINARY_API_KEY
  CLOUDINARY_API_SECRET
  SMS_API_KEY           — If using SMS notifications
  REPLIT_DOMAINS        — Auto-set by Replit on deploy

Before first deploy:
1. Run DB migrations: pnpm --filter @workspace/db run push
2. Seed a super_admin user manually in the users table
3. Set platform_settings defaults: pnpm --filter @workspace/db run push
   (DEFAULT_SETTINGS are applied on first API call via ensureDefaults())

Replit Deploy settings:
  Build command:   pnpm --filter @workspace/dabba run build
  Run command:     pnpm --filter @workspace/api-server run start
  Port:            (use the PORT env var — already wired)

Post-deploy:
- Verify /api/healthz returns 200
- Log in as super_admin and approve yourself
- Create a test vendor and customer and do a test subscription
```

---

## Priority Order

If you have limited time, do tasks in this order:

1. **Task 1 (Real Auth)** — Replit Auth doesn't work for external users
2. **Task 2 (Razorpay)** — Revenue can't flow without a payment gateway
3. **Task 7 (Image Uploads)** — Vendors need to look good
4. **Task 8 (Referrals)** — Low effort, high growth lever
5. **Task 9 (Cron)** — Prevents ghost subscriptions piling up
6. **Task 3 (Vendor Billing)** — Only needed when ready to charge vendors
7. **Task 5 (Push Notifications)** — Nice to have, improves retention
8. **Tasks 10–11** — Polish after core flows are live
