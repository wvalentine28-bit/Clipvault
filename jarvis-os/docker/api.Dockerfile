FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.9.0 --activate
WORKDIR /app

# ─── DEPENDENCIES ─────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

# ─── BUILD ────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .

RUN pnpm --filter @jarvis/shared build
RUN pnpm --filter @jarvis/database db:generate
RUN pnpm --filter @jarvis/api build

# ─── PRODUCTION ───────────────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]

# ─── DEVELOPMENT ──────────────────────────────────────────────
FROM base AS development
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3001
CMD ["pnpm", "--filter", "@jarvis/api", "dev"]
