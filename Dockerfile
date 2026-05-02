FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/replit-auth-web/package.json ./lib/replit-auth-web/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/dabba/package.json ./artifacts/dabba/
RUN pnpm install --frozen-lockfile

# Build frontend
FROM deps AS frontend-builder
COPY tsconfig.base.json tsconfig.json ./
COPY lib ./lib
COPY artifacts/dabba ./artifacts/dabba
RUN pnpm --filter @workspace/dabba run build

# Build API server
FROM deps AS api-builder
COPY tsconfig.base.json tsconfig.json ./
COPY lib ./lib
COPY artifacts/api-server ./artifacts/api-server
RUN pnpm --filter @workspace/api-server run build

# Production image
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY artifacts/api-server/package.json ./artifacts/api-server/

RUN pnpm install --frozen-lockfile --prod

COPY --from=api-builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=frontend-builder /app/artifacts/dabba/dist ./artifacts/dabba/dist

# Serve static frontend files from the API server
COPY --from=frontend-builder /app/artifacts/dabba/dist ./public

EXPOSE 8080

ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
