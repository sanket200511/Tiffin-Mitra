# Deploying Dabba

Dabba is a standard Node.js + PostgreSQL app with no platform-specific dependencies. It can be deployed anywhere that runs Node.js 22+ and PostgreSQL 14+.

## Environment Variables

Copy `.env.example` and fill in the values:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `PORT` | Yes | Port for the API server (e.g. `8080`) |
| `SESSION_SECRET` | Yes | Long random string for signing cookies |
| `NODE_ENV` | No | Set to `production` in production |

Generate a secure SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Database Setup

Run migrations after setting `DATABASE_URL`:
```bash
pnpm --filter @workspace/db run push
```

## Build & Run

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Build everything
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/dabba run build

# Start the API server
PORT=8080 NODE_ENV=production node artifacts/api-server/dist/index.mjs
```

## Deploy on Render

1. Create a new **Web Service** → connect your repository
2. **Build command:** `pnpm install && pnpm --filter @workspace/api-server run build`
3. **Start command:** `node artifacts/api-server/dist/index.mjs`
4. Add a **PostgreSQL** database from the Render dashboard
5. Set environment variables: `DATABASE_URL`, `SESSION_SECRET`, `PORT=10000`, `NODE_ENV=production`
6. After first deploy, run the DB migration from the Render shell:
   ```bash
   pnpm --filter @workspace/db run push
   ```

## Deploy on Railway

1. Create a new project → **Deploy from GitHub**
2. Add a **PostgreSQL** plugin
3. Set environment variables: `DATABASE_URL` (Railway auto-fills this), `SESSION_SECRET`, `PORT`, `NODE_ENV=production`
4. **Build command:** `pnpm install && pnpm --filter @workspace/api-server run build`
5. **Start command:** `node artifacts/api-server/dist/index.mjs`
6. Run the DB migration from the Railway shell:
   ```bash
   pnpm --filter @workspace/db run push
   ```

## Deploy on Fly.io

```bash
# Install flyctl, then:
fly launch
fly secrets set DATABASE_URL="..." SESSION_SECRET="..."
fly deploy
```

## Docker

```bash
# Build and run with Docker Compose (includes a local Postgres):
docker compose up --build

# Or build just the image:
docker build -t dabba .
docker run -p 8080:8080 \
  -e DATABASE_URL="postgresql://..." \
  -e SESSION_SECRET="..." \
  -e PORT=8080 \
  -e NODE_ENV=production \
  dabba
```

## Frontend

The frontend (`artifacts/dabba`) is a Vite-built React SPA. In production you have two options:

**Option A — Serve from the API server** (simpler):
Copy the built `artifacts/dabba/dist` into a `public/` folder and add static file serving to `app.ts`:
```ts
app.use(express.static(path.join(__dirname, "../../public")));
app.get("*", (_, res) => res.sendFile(path.join(__dirname, "../../public/index.html")));
```

**Option B — Deploy separately** (recommended for scale):
Deploy the `artifacts/dabba/dist` folder to any static host (Vercel, Netlify, Cloudflare Pages, S3+CloudFront).
Set the `VITE_API_URL` env var to your API server's URL if it's on a different domain.
