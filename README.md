# Dabba

Dabba connects customers with nearby home kitchens serving fresh, home-cooked tiffins. Customers can explore vendors, place orders, and manage meal subscriptions; vendors can manage menus, schedules, orders, and delivery; administrators can oversee the marketplace.

## Features

- Customer, vendor, and administrator experiences
- Vendor discovery, menus, meal plans, ordering, and subscriptions
- Order tracking, delivery coordination, reviews, and customer wallets
- Vendor analytics, earnings, and payout management
- Email/password accounts and optional Google sign-in
- PostgreSQL persistence, with optional Redis, Cloudinary media storage, and Resend email

## Tech stack

- **Frontend:** React, TypeScript, and Vite
- **API:** Node.js 22+, Express 5, and TypeScript
- **Database:** PostgreSQL 14+ with Drizzle ORM
- **Workspace:** pnpm monorepo

## Repository layout

| Path | Description |
| --- | --- |
| `artifacts/dabba` | Customer, vendor, and admin web application |
| `artifacts/api-server` | Express API server |
| `lib/db` | Database client, schema, and Drizzle configuration |
| `lib/api-spec` | API specification |
| `lib/api-zod` | Shared API types and validation schemas |
| `lib/api-client-react` | Generated React API client |
| `DEPLOY.md` | Deployment instructions |
| `SCALABILITY.md` | Scaling considerations and recommendations |

## Prerequisites

- Node.js 22 or later
- pnpm (via Corepack or a global installation)
- PostgreSQL 14 or later, or Docker Compose

## Local development

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create a root `.env` file based on `.env.example`, then set `DATABASE_URL`, `PORT` (for example, `8080`), and a long, random `SESSION_SECRET`. To generate a secret:

   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

   For a local PostgreSQL instance using the included Compose configuration, start the database with `docker compose up -d db`. Compose creates the `dabba` database and development user.

3. Apply the database schema:

   ```bash
   pnpm --filter @workspace/db run push
   ```

4. Start the API and frontend in separate terminals:

   ```bash
   pnpm --filter @workspace/api-server run dev
   ```

   ```bash
   pnpm --filter @workspace/dabba run dev
   ```

   The API listens on the configured `PORT`. Vite prints the frontend URL when it starts. If the API is on another host or port, configure `VITE_API_URL` for the frontend.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Secret used to sign session cookies |
| `PORT` | Yes | API listen port (for example, `8080`) |
| `NODE_ENV` | No | Set to `production` for production deployments |
| `ALLOWED_ORIGINS` | No | Comma-separated allowed frontend origins for production CORS |
| `VITE_API_URL` | No | API base URL for the frontend; defaults to same-origin requests |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | No | Google OAuth callback URL |
| `FRONTEND_URL` | No | Frontend URL used for auth redirects |
| `RESEND_API_KEY` | No | Resend API key for email delivery |
| `RESEND_FROM_EMAIL` | No | Sender address for outgoing email |
| `CLOUDINARY_CLOUD_NAME` | No | Cloudinary account name for media uploads |
| `CLOUDINARY_API_KEY` | No | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | No | Cloudinary API secret |
| `REDIS_URL` | No | Redis connection URL |
| `ADMIN_SETUP_KEY` | No | Key for the admin setup flow |
| `DATABASE_DIRECT_URL` | No | Direct PostgreSQL URL for schema pushes when `DATABASE_URL` uses a pooler |
| `APP_URL` | No | Public application URL used when generating the sitemap |
| `LOG_LEVEL` | No | Pino logging level |

Do not commit `.env` files or production credentials.

## Build and checks

Run the workspace type checks and build all packages:

```bash
pnpm run typecheck
pnpm run build
```

To build only the API or frontend:

```bash
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/dabba run build
```

The API health endpoint is available at `/healthz` (for example, `http://localhost:8080/healthz`).

## Docker

Build and start the API and local PostgreSQL database:

```bash
docker compose up --build
```

The API is exposed at `http://localhost:8080`. The Compose file supplies development-only database credentials and a placeholder session secret; replace these before using any production environment. For deployment options and production configuration, see [DEPLOY.md](./DEPLOY.md).

## Deployment

See [DEPLOY.md](./DEPLOY.md) for deployment options, including Render, Railway, Fly.io, and Docker. The frontend can be hosted separately as a static site; set `VITE_API_URL` to the API's public URL when the frontend and API use different origins.

## License

This project declares the MIT license in the root package manifest.
