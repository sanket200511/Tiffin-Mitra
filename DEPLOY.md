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
| `REDIS_URL` | Yes | Redis connection URL for session storage |
| `RENDER_KEEP_ALIVE` | No | Set to `"true"` to self-ping every 10 min; `"false"` to let Render sleep after 15 min |
| `KEEPALIVE_SECRET` | No | Optional secret token to restrict keep-alive endpoint access |

Generate a secure SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Render & Redis Keep-Alive (Preventing Inactivity)

Free instances on Render sleep after 15 minutes of inactivity to conserve free hours. Likewise, free Redis databases (RedisLabs / Redis Cloud, Upstash) hibernate after a few days without commands.

### Self-Pinging with `RENDER_KEEP_ALIVE`

You can control whether your Render service stays active or sleeps using the `RENDER_KEEP_ALIVE` environment variable:

* **Keep Render & Redis Active 24/7:**
  Set `RENDER_KEEP_ALIVE=true` in Render Dashboard.
  The server will automatically send an external HTTP request to its own public URL (`https://<service-name>.onrender.com/api/redis/keep-alive`) every 10 minutes. Because the request enters through Render's external router, Render resets its 15-minute inactivity timer, preventing the instance from sleeping. In turn, hitting `/api/redis/keep-alive` also keeps your Redis database active.

* **Conserve Monthly Free Tier Hours:**
  Set `RENDER_KEEP_ALIVE=false` in Render Dashboard.
  The self-pinging background task is completely disabled. The instance will naturally spin down after 15 minutes of inactivity, saving your free monthly instance hours.

### Keep-Alive Endpoints

* **`GET /api/redis/keep-alive`** (alias: `/api/keep-alive`): Pings Redis, reads and writes a heartbeat key, and returns the status of both Redis and the Render keep-alive worker.
* **`GET /api/redis/ping`**: Lightweight Redis ping (`PONG`).
* **`GET /api/health/render-keep-alive`**: Inspects current self-ping status (total pings, last status, last latency).
* **`POST /api/health/render-keep-alive`**: Manually triggers a self-ping immediately.

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
5. Set environment variables: `DATABASE_URL`, `SESSION_SECRET`, `PORT=10000`, `NODE_ENV=production`, `REDIS_URL`, `RENDER_KEEP_ALIVE=true`
6. After first deploy, run the DB migration from the Render shell:
   ```bash
   pnpm --filter @workspace/db run push
   ```

## Deploy on Railway

1. Create a new project → **Deploy from GitHub**
2. Add a **PostgreSQL** plugin
3. Set environment variables: `DATABASE_URL` (Railway auto-fills this), `SESSION_SECRET`, `PORT`, `NODE_ENV=production`, `REDIS_URL`
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
fly secrets set DATABASE_URL="..." SESSION_SECRET="..." REDIS_URL="..."
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
  -e REDIS_URL="..." \
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
